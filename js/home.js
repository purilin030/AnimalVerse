/* ============================================================
   Home Page Dynamic Content
   ============================================================ */
App.home = (function() {
  'use strict';

  function init() {
    App.data.loadVideos().then(function(data) {
      renderCategories(data.categories);
    });

    initNearbySection();
    initMarqueePause();
  }

  /**
   * Build the refresh button HTML (shared by creation and reset)
   */
  function createRefreshBtnHTML(spinner) {
    if (spinner) {
      return '<span class="spinner-icon"></span> <span>Switching animals...</span>';
    }
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> <span>Discover More</span>';
  }

  /**
   * Render category cards on the home page
   */
  function renderCategories(categories) {
    var container = document.getElementById('category-grid');
    if (!container || !categories) return;

    container.textContent = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var card = document.createElement('a');
      card.href = 'gallery.html?category=' + encodeURIComponent(cat.id);
      card.className = 'category-card category-card--' + cat.id;
      card.setAttribute('data-hint', cat.description || 'Explore →');

      // Image wrapper
      var imgWrap = document.createElement('div');
      imgWrap.className = 'category-card__image-wrap';
      card.appendChild(imgWrap);

      // Default image (visible initially)
      var img = document.createElement('img');
      img.className = 'category-card__image category-card__image--default';
      img.src = 'assets/images/animal-class/' + cat.name + '.webp';
      img.alt = cat.name || 'Category';
      img.loading = 'lazy';
      img.decoding = 'async';
      imgWrap.appendChild(img);

      // Hover image (hidden initially, crossfades on hover)
      var imgHover = document.createElement('img');
      imgHover.className = 'category-card__image category-card__image--hover';
      imgHover.src = 'assets/images/animal-class/' + cat.name + '1.webp';
      imgHover.alt = '';
      imgHover.loading = 'lazy';
      imgHover.decoding = 'async';
      imgWrap.appendChild(imgHover);

      var overlay = document.createElement('div');
      overlay.className = 'category-card__overlay';
      imgWrap.appendChild(overlay);

      // Content
      var content = document.createElement('div');
      content.className = 'category-card__content';
      card.appendChild(content);

      var catName = document.createElement('h3');
      catName.className = 'category-card__name';
      catName.textContent = cat.name || '';
      content.appendChild(catName);

      var catDesc = document.createElement('p');
      catDesc.className = 'category-card__desc';
      catDesc.textContent = cat.description || '';
      content.appendChild(catDesc);

      container.appendChild(card);
    }
  }

  /**
   * Initialize the "Animals Near You" section with geolocation
   */
  function initNearbySection() {
    var allowBtn = document.getElementById('nearby-allow-btn');
    var permissionBox = document.getElementById('nearby-permission-box');
    var nearbyVideos = document.getElementById('nearby-videos');
    var nearbyPrompt = document.getElementById('nearby-prompt');

    if (!allowBtn) return;

    // Shared state
    var animalPool = [];
    var refreshBtn = null;

    // Pre-check permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(function(result) {
        if (result.state === 'granted') {
          requestLocation();
        }
      });
    }

    allowBtn.addEventListener('click', requestLocation);

    /** Request user's geolocation */
    function requestLocation() {
      if (!navigator.geolocation) {
        if (nearbyPrompt) nearbyPrompt.textContent = 'Geolocation is not supported by your browser.';
        return;
      }

      allowBtn.textContent = 'Locating...';
      allowBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        function(position) {
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          showNearbyVideos(lat, lng);
        },
        function(error) {
          if (permissionBox) {
            var desc = permissionBox.querySelector('.nearby-permission-box__desc');
            if (desc) {
              desc.textContent = error.code === 1
                ? 'Location denied. Please allow access in browser settings.'
                : 'Could not determine your location. Try again.';
            }
          }
          allowBtn.textContent = 'Try Again';
          allowBtn.disabled = false;
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }

    /** Load and display nearby animals for the detected region */
    function showNearbyVideos(lat, lng) {
      var region = App.utils.guessRegion(lat, lng);

      // Rotate globe via custom event (decoupled from window.__globe)
      document.dispatchEvent(new CustomEvent('globe:rotate', { detail: { lat: lat, lng: lng } }));

      // Hide permission box, show location name
      if (permissionBox) permissionBox.style.display = 'none';
      var locationEl = document.getElementById('nearby-location');
      if (locationEl) {
        locationEl.innerHTML = 'Your location is at <span class="location-highlight">' + region + '</span>';
        locationEl.style.display = 'block';
      }

      App.data.fetchRegionAnimals(region).then(function(animals) {
        if (!animals || animals.length === 0) {
          if (nearbyVideos) {
            var noAnimals = document.createElement('p');
            noAnimals.className = 'text-muted';
            noAnimals.textContent = 'No animals found for this region.';
            nearbyVideos.appendChild(noAnimals);
          }
          return;
        }

        animalPool = animals;
        renderAnimalBatch();

        // Add refresh button if enough variety
        if (!refreshBtn && animalPool.length > 4) {
          refreshBtn = document.createElement('button');
          refreshBtn.className = 'nearby-refresh-btn';
          refreshBtn.setAttribute('aria-label', 'Show different animals');
          refreshBtn.addEventListener('click', renderAnimalBatch);
          if (nearbyVideos && nearbyVideos.parentNode) {
            nearbyVideos.parentNode.appendChild(refreshBtn);
          }
        }
        if (refreshBtn) refreshBtn.innerHTML = createRefreshBtnHTML(false);
      });
    }

    /** Pick and render 4 random animals from the pool */
    function renderAnimalBatch() {
      if (!nearbyVideos || animalPool.length === 0) return;

      // Loading state
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = createRefreshBtnHTML(true);
      }

      nearbyVideos.className = 'nearby-video-row is-loading';
      nearbyVideos.style.display = '';

      // Pick 4 random from pool
      var batch = App.utils.shuffleArray(animalPool).slice(0, 4);

      // Fetch GBIF images
      var promises = batch.map(function(animalName) {
        return App.data.fetchAnimalImage(animalName).then(function(imgUrl) {
          return { name: animalName, imgUrl: imgUrl || '' };
        });
      });

      Promise.all(promises).then(function(results) {
        nearbyVideos.textContent = '';
        nearbyVideos.classList.remove('is-loading');

        results.forEach(function(r) {
          var card = App.ui.createAnimalCard(r.name, r.imgUrl);
          if (card) nearbyVideos.appendChild(card);
        });

        // Restore button
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = createRefreshBtnHTML(false);
        }
      });
    }
  }

  /* ============================================================
     Pause marquee animation when off-screen (saves GPU)
     ============================================================ */
  function initMarqueePause() {
    var viewport = document.querySelector('.marquee-viewport');
    if (!viewport || !('IntersectionObserver' in window)) return;

    var rows = viewport.querySelectorAll('.marquee-row');
    if (!rows.length) return;

    var observer = new IntersectionObserver(function(entries) {
      var visible = entries[0].isIntersecting;
      for (var i = 0; i < rows.length; i++) {
        rows[i].style.animationPlayState = visible ? 'running' : 'paused';
      }
    }, { threshold: 0.01 });

    observer.observe(viewport);
  }

  /* ============================================================
     Scroll-triggered Typing for all section dividers
     ============================================================ */
  /* ============================================================
     Scroll-triggered Reveal Animations (Text and Sections)
     ============================================================ */
  function initScrollReveal() {
    // 1. Observe Section Reveal & Text Reveal (Once-off trigger)
    var revealTargets = document.querySelectorAll('.scroll-reveal, .reveal-section');
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-active');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      for (var i = 0; i < revealTargets.length; i++) {
        revealObserver.observe(revealTargets[i]);
      }
    } else {
      // Fallback
      for (var j = 0; j < revealTargets.length; j++) {
        revealTargets[j].classList.add('is-active');
      }
    }

  }

  return {
    init: init,
    initScrollReveal: initScrollReveal
  };
})();
