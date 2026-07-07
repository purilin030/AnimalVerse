/* ============================================================
   UI Helper Functions
   ============================================================ */
App.ui = (function() {
  'use strict';

  /**
   * Create a video card DOM element (safe DOM methods, no innerHTML)
   */
  function createVideoCard(video) {
    if (!video) return null;

    var isFav = App.favorites.isFavorite(video.id);
    var thumbnailSrc = video.gbifThumbnail || video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var localFallback = video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var categoryName = video.category || 'unknown';

    var aspect = App.utils.getVideoAspect(video.id);
    var aspectClass = aspect.className;

    // Card container
    var card = document.createElement('div');
    card.className = 'video-card';
    card.setAttribute('data-id', video.id);

    // Link wrapping the thumbnail and body
    var link = document.createElement('a');
    link.href = 'playback.html?id=' + encodeURIComponent(video.id);
    link.className = 'video-card__link';
    card.appendChild(link);

    // Thumbnail wrapper
    var thumbWrap = document.createElement('div');
    thumbWrap.className = 'video-card__thumbnail-wrapper ' + aspectClass;
    link.appendChild(thumbWrap);

    // Thumbnail image
    var img = document.createElement('img');
    img.className = 'video-card__thumbnail';
    img.src = thumbnailSrc;
    img.alt = video.title || 'Video thumbnail';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.setAttribute('data-local', localFallback);
    img.onerror = function() { App.ui.fallbackImg(this); };
    thumbWrap.appendChild(img);

    // Duration badge
    var duration = document.createElement('span');
    duration.className = 'video-card__duration';
    duration.textContent = video.duration || '--:--';
    thumbWrap.appendChild(duration);

    // Category tag
    var catTag = document.createElement('span');
    catTag.className = 'video-card__category-tag video-card__category-tag--' + categoryName;
    catTag.textContent = categoryName;
    thumbWrap.appendChild(catTag);

    // Extract animal slug name from video ID (e.g. video-polar-bear-001 -> polar-bear)
    var animalSlug = '';
    if (video.id && video.id.indexOf('video-') === 0) {
      var parts = video.id.split('-');
      if (parts.length >= 3) {
        animalSlug = parts.slice(1, -1).join('-');
      }
    }
    var animalLabelText = animalSlug ? animalSlug.replace(/-/g, ' ').toUpperCase() : '';
    if (animalLabelText) {
      var animalTag = document.createElement('span');
      animalTag.className = 'video-card__animal-tag';
      animalTag.textContent = animalLabelText;
      thumbWrap.appendChild(animalTag);
    }

    // Body
    var body = document.createElement('div');
    body.className = 'video-card__body';
    link.appendChild(body);

    // Title
    var title = document.createElement('h3');
    title.className = 'video-card__title';
    title.textContent = video.title || '';
    body.appendChild(title);

    // Views
    var views = document.createElement('p');
    views.className = 'video-card__views';
    views.textContent = (video.views || 0).toLocaleString() + ' views';
    body.appendChild(views);

    // Favorite button
    var favBtn = document.createElement('button');
    favBtn.className = 'video-card__favorite-btn' + (isFav ? ' video-card__favorite-btn--active' : '');
    favBtn.setAttribute('data-id', video.id);
    favBtn.setAttribute('data-type', 'favorite');
    favBtn.setAttribute('aria-label', (isFav ? 'Remove from' : 'Add to') + ' favorites');
    card.appendChild(favBtn);

    // Favorite heart SVG
    var favSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    favSvg.setAttribute('width', '14');
    favSvg.setAttribute('height', '14');
    favSvg.setAttribute('viewBox', '0 0 20 20');
    favSvg.setAttribute('fill', isFav ? '#FFFFFF' : 'none');
    favSvg.setAttribute('stroke', '#FFFFFF');
    favSvg.setAttribute('stroke-width', '2');
    var favPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    favPath.setAttribute('d', 'M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z');
    favPath.setAttribute('stroke-linejoin', 'round');
    favSvg.appendChild(favPath);
    favBtn.appendChild(favSvg);

    // Favorite text
    var favText = document.createElement('span');
    favText.className = 'video-card__favorite-text';
    favText.textContent = isFav ? 'Saved' : 'Save';
    favBtn.appendChild(favText);

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

        var textEl = btn.querySelector('.video-card__favorite-text');
        if (added) {
          btn.classList.add('video-card__favorite-btn--active');
          btn.querySelector('svg').setAttribute('fill', '#FFFFFF');
          btn.setAttribute('aria-label', 'Remove from favorites');
          if (textEl) textEl.textContent = 'Saved';
          showToast('Added to favorites!', 'success');
        } else {
          btn.classList.remove('video-card__favorite-btn--active');
          btn.querySelector('svg').setAttribute('fill', 'none');
          btn.setAttribute('aria-label', 'Add to favorites');
          if (textEl) textEl.textContent = 'Save';
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
      renderEmptyState(container, { text: 'No videos found.' });
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

    // Distribute cards to columns
    for (var i = 0; i < videos.length; i++) {
      var video = videos[i];
      var card = createVideoCard(video);
      if (!card) continue;

      // Estimate card height from aspect ratio
      var aspect = App.utils.getVideoAspect(video.id);
      var cardHeight = aspect.heightWeight + 0.3;

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
   * Create an animal discovery card (safe DOM methods, no innerHTML)
   */
  function createAnimalCard(animalName, imgUrl) {
    var card = document.createElement('div');
    card.className = 'animal-card';

    var src = imgUrl || 'assets/images/thumbnails/placeholder.jpg';

    // Image wrapper
    var imgWrap = document.createElement('div');
    imgWrap.className = 'animal-card__img';
    card.appendChild(imgWrap);

    // Image
    var img = document.createElement('img');
    img.src = src;
    img.alt = animalName || 'Animal';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function() { this.src = 'assets/images/thumbnails/cantfindanimals.jpg'; };
    imgWrap.appendChild(img);

    // Name
    var name = document.createElement('h4');
    name.className = 'animal-card__name';
    name.textContent = animalName || '';
    card.appendChild(name);

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

  /**
   * Render a consistent empty state inside a container
   * @param {HTMLElement} container - The container to fill
   * @param {object} opts - { title, text, icon, actionLabel, actionHref }
   */
  function renderEmptyState(container, opts) {
    if (!container) return;
    container.textContent = '';
    opts = opts || {};

    var state = document.createElement('div');
    state.className = 'empty-state';
    container.appendChild(state);

    if (opts.icon) {
      var icon = document.createElement('div');
      icon.className = 'empty-state__icon';
      icon.textContent = opts.icon;
      state.appendChild(icon);
    }

    if (opts.title) {
      var title = document.createElement('h3');
      title.className = 'empty-state__title';
      title.textContent = opts.title;
      state.appendChild(title);
    }

    if (opts.text) {
      var text = document.createElement('p');
      text.className = 'empty-state__text';
      text.textContent = opts.text;
      state.appendChild(text);
    }

    if (opts.actionLabel && opts.actionHref) {
      var btn = document.createElement('a');
      btn.className = 'btn btn--primary';
      btn.href = opts.actionHref;
      btn.textContent = opts.actionLabel;
      state.appendChild(btn);
    }

    return state;
  }

  return {
    createVideoCard: createVideoCard,
    escapeHtml: escapeHtml,
    showToast: showToast,
    attachFavoriteListeners: attachFavoriteListeners,
    renderVideoGrid: renderVideoGrid,
    renderEmptyState: renderEmptyState,
    fallbackImg: fallbackImg,
    createAnimalCard: createAnimalCard,
    initDropdowns: initDropdowns
  };
})();
