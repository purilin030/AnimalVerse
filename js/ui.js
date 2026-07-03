/* ============================================================
   UI Helper Functions
   ============================================================ */
App.ui = (function() {
  'use strict';

  /**
   * Create a video card DOM element
   */
  function createVideoCard(video) {
    if (!video) return null;

    var isFav = App.favorites.isFavorite(video.id);
    // GBIF image as primary, local file as fallback
    var thumbnailSrc = video.gbifThumbnail || video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var localFallback = video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var categoryName = video.category || 'unknown';

    // Procedural aspect ratio selection based on video ID hash
    var hash = 0;
    for (var i = 0; i < video.id.length; i++) {
      hash = video.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    var r = Math.abs(hash) % 4;
    var aspectClass = 'aspect-video'; // Default 16:9
    if (r === 0) aspectClass = 'aspect-square';       // 1:1
    else if (r === 1) aspectClass = 'aspect-portrait-tall';  // 3:4
    else if (r === 2) aspectClass = 'aspect-portrait-short'; // 4:5

    // Extract animal slug for debugging
    var debugAnimal = video.id.replace('video-', '').replace(/-\d+$/, '');

    // Build card
    var card = document.createElement('div');
    card.className = 'video-card';
    card.setAttribute('data-id', video.id);

    card.innerHTML =
      '<a href="playback.html?id=' + encodeURIComponent(video.id) + '" class="video-card__link">' +
        '<div class="video-card__thumbnail-wrapper ' + aspectClass + '">' +
          '<img class="video-card__thumbnail" src="' + thumbnailSrc + '" alt="' + escapeHtml(video.title) + '" loading="lazy" data-local="' + localFallback + '" onerror="App.ui.fallbackImg(this)">' +
          '<span class="video-card__duration">' + (video.duration || '--:--') + '</span>' +
          '<span class="video-card__category-tag video-card__category-tag--' + categoryName + '">' + categoryName + '</span>' +
          '<span class="video-card__debug-tag" style="position: absolute; bottom: 12px; left: 12px; background: #FF4444; color: #FFF; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: var(--radius-sm); font-family: var(--ff-mono); text-transform: uppercase; z-index: 10; letter-spacing: 0.5px;">' + debugAnimal + '</span>' +
        '</div>' +
        '<div class="video-card__body">' +
          '<h3 class="video-card__title">' + escapeHtml(video.title) + '</h3>' +
          '<p class="video-card__views">' + (video.views || 0).toLocaleString() + ' views</p>' +
        '</div>' +
      '</a>' +
      '<button class="video-card__favorite-btn' + (isFav ? ' video-card__favorite-btn--active' : '') + '" data-id="' + video.id + '" data-type="favorite" aria-label="' + (isFav ? 'Remove from' : 'Add to') + ' favorites">' +
        '<svg width="16" height="16" viewBox="0 0 20 20" fill="' + (isFav ? '#FF4444' : 'none') + '" stroke="currentColor" stroke-width="1.5">' +
          '<path d="M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>';

    return card;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Show a toast notification
   */
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove after animation
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * Attach favorite button listeners to a container
   */
  function attachFavoriteListeners(container) {
    container = container || document;
    var buttons = container.querySelectorAll('.video-card__favorite-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var btn = this;
        var videoId = btn.getAttribute('data-id');
        var added = App.favorites.toggleFavorite(videoId);

        if (added) {
          btn.classList.add('video-card__favorite-btn--active');
          btn.querySelector('svg').setAttribute('fill', '#FF4444');
          btn.setAttribute('aria-label', 'Remove from favorites');
          showToast('Added to favorites!', 'success');
        } else {
          btn.classList.remove('video-card__favorite-btn--active');
          btn.querySelector('svg').setAttribute('fill', 'none');
          btn.setAttribute('aria-label', 'Add to favorites');
          showToast('Removed from favorites', 'info');
        }
      });
    }
  }

  /**
   * Render videos into a grid container
   */
  function renderVideoGrid(containerId, videos) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Cache videos on the container DOM element for resize re-rendering
    container.renderedVideos = videos;

    if (!videos || videos.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="text-muted">No videos found.</p></div>';
      return;
    }

    container.innerHTML = '';

    // Determine number of columns based on window width
    var width = window.innerWidth;
    var numCols = 4; // default for desktop
    if (width < 480) {
      numCols = 1;
    } else if (width < 768) {
      numCols = 2;
    } else if (width < 1024) {
      numCols = 3;
    } else if (width < 1440) {
      numCols = 4;
    } else {
      numCols = 5; // ultrawide
    }

    // Create column containers
    var colElements = [];
    var colHeights = [];
    for (var col = 0; col < numCols; col++) {
      var colDiv = document.createElement('div');
      colDiv.className = 'masonry-column';
      container.appendChild(colDiv);
      colElements.push(colDiv);
      colHeights.push(0);
    }

    // Aspect ratio estimated height weights
    var ASPECT_HEIGHTS = {
      'aspect-square': 1.0,
      'aspect-portrait-tall': 1.33,
      'aspect-portrait-short': 1.25,
      'aspect-video': 0.56
    };

    // Distribute cards to columns
    for (var i = 0; i < videos.length; i++) {
      var video = videos[i];
      var card = createVideoCard(video);
      if (!card) continue;

      // Estimate card height
      var hash = 0;
      for (var charIdx = 0; charIdx < video.id.length; charIdx++) {
        hash = video.id.charCodeAt(charIdx) + ((hash << 5) - hash);
      }
      var r = Math.abs(hash) % 4;
      var aspectClass = 'aspect-video';
      if (r === 0) aspectClass = 'aspect-square';
      else if (r === 1) aspectClass = 'aspect-portrait-tall';
      else if (r === 2) aspectClass = 'aspect-portrait-short';

      var cardHeight = ASPECT_HEIGHTS[aspectClass] + 0.3;

      // Find shortest column
      var minColIndex = 0;
      var minHeight = colHeights[0];
      for (var col = 1; col < numCols; col++) {
        if (colHeights[col] < minHeight) {
          minHeight = colHeights[col];
          minColIndex = col;
        }
      }

      colElements[minColIndex].appendChild(card);
      colHeights[minColIndex] += cardHeight;
    }

    attachFavoriteListeners(container);
  }

  /**
   * Create an animal discovery card (for filling nearby section)
   */
  function createAnimalCard(animalName, imgUrl) {
    var card = document.createElement('div');
    card.className = 'animal-card';

    var src = imgUrl || 'assets/images/thumbnails/placeholder.jpg';

    card.innerHTML =
      '<div class="animal-card__img">' +
        '<img src="' + src + '" alt="' + escapeHtml(animalName) + '" loading="lazy" onerror="this.src=\'assets/images/thumbnails/cantfindanimals.jpg\'">' +
      '</div>' +
      '<h4 class="animal-card__name">' + escapeHtml(animalName) + '</h4>';

    return card;
  }

  /**
   * Image error fallback: GBIF source → local file → placeholder
   */
  function fallbackImg(img) {
    if (!img) return;
    var local = img.getAttribute('data-local');
    var current = img.src;

    // If current src isn't the local fallback yet, try local
    if (local && current.indexOf(local) === -1) {
      img.src = local;
      return;
    }

    // Last resort: placeholder
    img.src = 'assets/images/thumbnails/cantfindanimals.jpg';
  }

  /**
   * Initialize custom dropdowns with animated transitions
   */
  function initDropdowns() {
    var dropdowns = document.querySelectorAll('.custom-dropdown');
    for (var dIdx = 0; dIdx < dropdowns.length; dIdx++) {
      (function(dropdown) {
        var trigger = dropdown.querySelector('.custom-dropdown__trigger');
        var selectedText = dropdown.querySelector('.custom-dropdown__selected');
        var items = dropdown.querySelectorAll('.custom-dropdown__item');
        var input = dropdown.querySelector('select') || dropdown.querySelector('input[type="hidden"]');

        if (!trigger) return;

        // Toggle dropdown open
        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          // Close other dropdowns
          var allDropdowns = document.querySelectorAll('.custom-dropdown');
          for (var i = 0; i < allDropdowns.length; i++) {
            if (allDropdowns[i] !== dropdown) {
              allDropdowns[i].classList.remove('custom-dropdown--open');
            }
          }
          dropdown.classList.toggle('custom-dropdown--open');
        });

        // Handle item selection
        for (var i = 0; i < items.length; i++) {
          items[i].addEventListener('click', function() {
            var val = this.getAttribute('data-value');
            var text = this.textContent;

            // Update active item classes
            for (var j = 0; j < items.length; j++) {
              items[j].classList.remove('custom-dropdown__item--active');
            }
            this.classList.add('custom-dropdown__item--active');

            // Update trigger label
            if (selectedText) selectedText.textContent = text;

            // Update underlying value & trigger change
            if (input) {
              input.value = val;
              var event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);
            }

            dropdown.classList.remove('custom-dropdown--open');
          });
        }

        // Sync helper function for manual updates (like select.value = currentSort)
        if (input) {
          var syncTriggerText = function() {
            var activeItem = null;
            for (var k = 0; k < items.length; k++) {
              if (items[k].getAttribute('data-value') === input.value) {
                activeItem = items[k];
                break;
              }
            }
            if (activeItem) {
              for (var j = 0; j < items.length; j++) {
                items[j].classList.remove('custom-dropdown__item--active');
              }
              activeItem.classList.add('custom-dropdown__item--active');
              if (selectedText) selectedText.textContent = activeItem.textContent;
            }
          };
          // Run initial sync
          syncTriggerText();
          // Bind sync listener
          input.addEventListener('change-sync', syncTriggerText);
        }
      })(dropdowns[dIdx]);
    }

    // Close on clicking outside
    document.addEventListener('click', function() {
      var allDropdowns = document.querySelectorAll('.custom-dropdown');
      for (var i = 0; i < allDropdowns.length; i++) {
        allDropdowns[i].classList.remove('custom-dropdown--open');
      }
    });
  }

  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      var grids = document.querySelectorAll('.video-grid');
      for (var i = 0; i < grids.length; i++) {
        var grid = grids[i];
        if (grid && grid.renderedVideos) {
          renderVideoGrid(grid.id, grid.renderedVideos);
        }
      }
    }, 200);
  });

  return {
    createVideoCard: createVideoCard,
    escapeHtml: escapeHtml,
    showToast: showToast,
    attachFavoriteListeners: attachFavoriteListeners,
    renderVideoGrid: renderVideoGrid,
    fallbackImg: fallbackImg,
    createAnimalCard: createAnimalCard,
    initDropdowns: initDropdowns
  };
})();
