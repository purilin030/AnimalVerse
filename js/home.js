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
  }

  /**
   * Render category cards on the home page
   */
  function renderCategories(categories) {
    var container = document.getElementById('category-grid');
    if (!container || !categories) return;

    container.innerHTML = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var card = document.createElement('a');
      card.href = 'gallery.html?category=' + encodeURIComponent(cat.id);
      card.className = 'category-card category-card--' + cat.id;
      card.setAttribute('data-hint', cat.description || 'Explore →');

      card.innerHTML =
        '<div class="category-card__image-wrap">' +
          '<img src="assets/images/animal-class/' + cat.name + '.jpg" alt="' + cat.name + '" class="category-card__image" loading="lazy" />' +
          '<div class="category-card__overlay"></div>' +
        '</div>' +
        '<div class="category-card__content">' +
          '<h3 class="category-card__name">' + cat.name + '</h3>' +
          '<p class="category-card__desc">' + (cat.description || '') + '</p>' +
        '</div>';

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

    // Check if user already granted permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(function(result) {
        if (result.state === 'granted') {
          getUserLocation(true);
        }
      });
    }

    allowBtn.addEventListener('click', function() {
      getUserLocation(false);
    });

    function getUserLocation(alreadyGranted) {
      if (!navigator.geolocation) {
        if (nearbyPrompt) nearbyPrompt.textContent = 'Geolocation is not supported by your browser.';
        return;
      }

      allowBtn.textContent = 'Locating...';
      allowBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        function(position) {
          // Success
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          showNearbyVideos(lat, lng);
        },
        function(error) {
          // Error or denied
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

    // Animal pool & refresh state
    var _animalPool = [];
    var _refreshBtn = null;

    function showNearbyVideos(lat, lng) {
      // Detect region from coordinates
      var region = guessRegion(lat, lng);

      // Rotate globe to the user's region
      setTimeout(function() {
        if (window.__globe && window.__globe.rotateTo) {
          window.__globe.rotateTo(lat, lng);
        }
      }, 300);

      // Hide the permission box
      if (permissionBox) permissionBox.style.display = 'none';

      // Show location name
      var locationEl = document.getElementById('nearby-location');
      if (locationEl) {
        locationEl.innerHTML = 'Your location is at <strong>' + region + '</strong>';
        locationEl.style.display = 'block';
      }

      // Fetch animals from Wikipedia + GBIF
      App.data.fetchRegionAnimals(region).then(function(animals) {
        if (!animals || animals.length === 0) {
          if (nearbyVideos) {
            nearbyVideos.innerHTML = '<p class="text-muted">No animals found for this region.</p>';
          }
          return;
        }

        _animalPool = animals;

        // Show first 4
        renderAnimalBatch();

        // Add refresh button if enough variety
        if (!_refreshBtn && _animalPool.length > 4) {
          _refreshBtn = document.createElement('button');
          _refreshBtn.className = 'nearby-refresh-btn';
          _refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> <span>Discover More</span>';
          _refreshBtn.setAttribute('aria-label', 'Show different animals');
          _refreshBtn.addEventListener('click', function() {
            renderAnimalBatch();
          });
          if (nearbyVideos && nearbyVideos.parentNode) {
            nearbyVideos.parentNode.appendChild(_refreshBtn);
          }
        }
      });
    }

    function renderAnimalBatch() {
      if (!nearbyVideos || _animalPool.length === 0) return;

      // Start loading state
      if (_refreshBtn) {
        _refreshBtn.disabled = true;
        _refreshBtn.innerHTML = '<span class="spinner-icon"></span> <span>Switching animals...</span>';
      }

      nearbyVideos.className = 'nearby-video-row is-loading';
      nearbyVideos.style.display = '';

      // Pick 4 random from pool
      var shuffled = _animalPool.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      var batch = shuffled.slice(0, 4);

      // Fetch GBIF images and render
      var promises = [];
      for (var k = 0; k < batch.length; k++) {
        var animalName = batch[k];
        var p = App.data.fetchAnimalImage(animalName).then(function(name) {
          return function(imgUrl) {
            return { name: name, imgUrl: imgUrl || '' };
          };
        }(animalName));
        promises.push(p);
      }

      Promise.all(promises).then(function(results) {
        nearbyVideos.innerHTML = '';
        nearbyVideos.classList.remove('is-loading');
        
        for (var m = 0; m < results.length; m++) {
          var card = App.ui.createAnimalCard(results[m].name, results[m].imgUrl);
          if (card) nearbyVideos.appendChild(card);
        }

        // Restore button state
        if (_refreshBtn) {
          _refreshBtn.disabled = false;
          _refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> <span>Discover More</span>';
        }
      });
    }

    // Approximate lat/lng → region name
    function guessRegion(lat, lng) {
      if (lat < -55) return 'Antarctica';
      if (lat < -10 && lng > 110) return 'Australia';
      if (lat < -10 && lng < -30) return 'Ocean';
      if (lat > 60) return 'Europe';
      // Between 60°N and 10°S
      if (lng > -25 && lng < 55) {
        if (lat > 35) return 'Europe';
        return lat > 0 ? 'Africa' : 'Africa';
      }
      if (lng >= 55 && lng < 180) return 'Asia';
      if (lat > 20 && lng < -25) return 'North America';
      if (lat <= 20 && lng < -25) return 'South America';
      if (lng <= -130) return 'Ocean';
      return 'Asia';
    }
  }

  /* ============================================================
     Scroll-triggered Typing for all section dividers
     ============================================================ */
  function initScrollTyping() {
    var dividers = [
      { sectionId: 'divider-kingdom', typingIds: ['typing-kingdom-lead', 'typing-kingdom'] },
      { sectionId: 'divider-nearby', typingIds: 'typing-nearby' },
      { sectionId: 'divider-categories', typingIds: 'typing-categories' }
    ];

    for (var d = 0; d < dividers.length; d++) {
      setupTypingDivider(dividers[d].sectionId, dividers[d].typingIds);
    }

    function setupTypingDivider(sectionId, typingIds) {
      var section = document.getElementById(sectionId);
      if (!section) return;

      // Normalize to array
      if (typeof typingIds === 'string') typingIds = [typingIds];

      var typingEls = [];
      var texts = [];
      for (var t = 0; t < typingIds.length; t++) {
        var el = document.getElementById(typingIds[t]);
        if (!el) return;
        typingEls.push(el);
        texts.push(el.getAttribute('data-text') || '');
      }

      var triggered = false;
      var currentIdx = 0;
      var speeds = [55, 35]; // slower for lead, faster for title

      function startTyping() {
        triggered = true;
        currentIdx = 0;
        typeNext(0);
      }

      function typeNext(idx) {
        if (idx >= typingEls.length) {
          setupRevisitObserver(section);
          return;
        }

        var el = typingEls[idx];
        var txt = texts[idx];
        var speed = speeds[idx] || 50;
        el.textContent = '';
        var pos = 0;

        function typeChar() {
          if (pos < txt.length) {
            el.textContent += txt.charAt(pos);
            pos++;
            setTimeout(typeChar, speed);
          } else {
            // This line done — start next after a short pause
            setTimeout(function() { typeNext(idx + 1); }, 180);
          }
        }

        setTimeout(typeChar, 150);
      }

      // Use Intersection Observer to trigger once
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting && !triggered) {
              observer.disconnect();
              startTyping();
            }
          });
        }, { threshold: 0.4 });

        observer.observe(section);
      } else {
        setTimeout(startTyping, 500);
      }
    }

    function setupRevisitObserver(section) {
      if (!('IntersectionObserver' in window)) return;
      var ro = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            section.classList.remove('divider--revisit');
            void section.offsetWidth;
            section.classList.add('divider--revisit');
          }
        });
      }, { threshold: 0.5 });
      ro.observe(section);
    }
  }

  return {
    init: init,
    initScrollTyping: initScrollTyping
  };
})();
