/* ============================================================
   UI Helper Functions
   ============================================================ */
App.ui = (function() {
  'use strict';

  /**
   * Create an SVG icon element (safe DOM methods)
   * @param {string} type - 'heart', 'play', or 'share'
   * @param {boolean} filled - Whether the heart icon is filled (ignored for play/share)
   * @returns {SVGElement}
   */
  function createSvgIcon(type, filled) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    var path = document.createElementNS(svgNS, 'path');

    if (type === 'heart') {
      svg.setAttribute('fill', filled ? 'currentColor' : 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
    } else if (type === 'play') {
      svg.setAttribute('fill', 'currentColor');
      path.setAttribute('d', 'M8 5v14l11-7z');
    } else if (type === 'share') {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('d', 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98');
    }

    svg.appendChild(path);
    return svg;
  }

  /**
   * Create an action button for the card actions bar
   * @param {string} type - 'favorite', 'play', or 'share'
   * @param {boolean} active - Whether the button is in active state
   * @param {string} videoId - The video ID this button acts on
   * @returns {HTMLButtonElement}
   */
  function createActionBtn(type, active, videoId) {
    var btn = document.createElement('button');
    btn.className = 'video-card__action-btn';
    if (active) {
      btn.className += ' video-card__action-btn--active';
    }
    btn.setAttribute('data-id', videoId);
    btn.setAttribute('data-type', type);
    btn.type = 'button';

    var labels = {
      favorite: active ? 'Remove from favorites' : 'Add to favorites',
      play: 'Play video',
      share: 'Share video'
    };
    var icons = {
      favorite: 'heart',
      play: 'play',
      share: 'share'
    };

    btn.setAttribute('aria-label', labels[type] || '');

    var svg = createSvgIcon(icons[type], active);
    btn.appendChild(svg);

    return btn;
  }

  /**
   * Create a video card DOM element (safe DOM methods, no innerHTML)
   * Retro pixel style — separate thumb/body links, actions bar as sibling
   */
  function createVideoCard(video) {
    if (!video) return null;

    var isFav = App.favorites.isFavorite(video.id);
    var thumbnailSrc = video.gbifThumbnail || video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var localFallback = video.thumbnail || 'assets/images/thumbnails/placeholder.jpg';
    var categoryName = video.category || 'unknown';
    var playbackUrl = 'playback.html?id=' + encodeURIComponent(video.id);

    var aspect = App.utils.getVideoAspect(video.id);
    var aspectClass = aspect.className;

    // Card container
    var card = document.createElement('div');
    card.className = 'video-card';
    card.setAttribute('data-id', video.id);

    // ── Thumb link (wraps only the image area) ──
    var thumbLink = document.createElement('a');
    thumbLink.href = playbackUrl;
    thumbLink.className = 'video-card__thumb-link';
    card.appendChild(thumbLink);

    // Thumbnail wrapper
    var thumbWrap = document.createElement('div');
    thumbWrap.className = 'video-card__thumbnail-wrapper ' + aspectClass;
    thumbLink.appendChild(thumbWrap);

    // Source tag — top-left (e.g. YOUTUBE, PEXELS)
    if (video.source) {
      var sourceTag = document.createElement('span');
      sourceTag.className = 'video-card__source-tag';
      sourceTag.textContent = video.source.toUpperCase();
      thumbWrap.appendChild(sourceTag);
    }

    // Category tag — top-right (relocated from top-left)
    var catTag = document.createElement('span');
    catTag.className = 'video-card__category-tag video-card__category-tag--' + categoryName;
    catTag.textContent = categoryName;
    thumbWrap.appendChild(catTag);

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

    // Animal tag — bottom-left
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

    // Duration badge — bottom-right
    var duration = document.createElement('span');
    duration.className = 'video-card__duration';
    duration.textContent = video.duration || '--:--';
    thumbWrap.appendChild(duration);

    // ── Body link (wraps only title + views) ──
    var bodyLink = document.createElement('a');
    bodyLink.href = playbackUrl;
    bodyLink.className = 'video-card__body-link';
    card.appendChild(bodyLink);

    // Body
    var body = document.createElement('div');
    body.className = 'video-card__body';
    bodyLink.appendChild(body);

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

    // Credit (source attribution from sources.json)
    if (video.credit) {
      var credit = document.createElement('p');
      credit.className = 'video-card__credit';
      credit.textContent = video.credit;
      body.appendChild(credit);
    }

    // ── Actions bar (sibling of links — no nested interactive elements) ──
    var actions = document.createElement('div');
    actions.className = 'video-card__actions';
    card.appendChild(actions);

    // Favorite button
    actions.appendChild(createActionBtn('favorite', isFav, video.id));

    // Play button
    actions.appendChild(createActionBtn('play', false, video.id));

    // Share button
    actions.appendChild(createActionBtn('share', false, video.id));

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
   * Attach card action button listeners to a container (favorite, play, share)
   */
  function attachFavoriteListeners(container) {
    container = container || document;
    var buttons = container.querySelectorAll('.video-card__action-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var btn = this;
        var type = btn.getAttribute('data-type');
        var videoId = btn.getAttribute('data-id');
        var playbackUrl = 'playback.html?id=' + encodeURIComponent(videoId);

        if (type === 'favorite') {
          var added = App.favorites.toggleFavorite(videoId);
          var svg = btn.querySelector('svg');
          if (added) {
            btn.classList.add('video-card__action-btn--active');
            if (svg) {
              svg.setAttribute('fill', 'currentColor');
              svg.setAttribute('stroke', 'currentColor');
            }
            btn.setAttribute('aria-label', 'Remove from favorites');
            showToast('Added to favorites!', 'success');
          } else {
            btn.classList.remove('video-card__action-btn--active');
            if (svg) {
              svg.setAttribute('fill', 'none');
              svg.setAttribute('stroke', 'currentColor');
            }
            btn.setAttribute('aria-label', 'Add to favorites');
            showToast('Removed from favorites', 'info');
          }
        } else if (type === 'play') {
          window.location.href = playbackUrl;
        } else if (type === 'share') {
          // Copy playback URL to clipboard
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(window.location.origin + '/' + playbackUrl).then(function() {
              showToast('Link copied to clipboard!', 'success');
            }).catch(function() {
              showToast('Failed to copy link', 'error');
            });
          } else {
            // Fallback for older browsers
            var textarea = document.createElement('textarea');
            textarea.value = window.location.origin + '/' + playbackUrl;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
              document.execCommand('copy');
              showToast('Link copied to clipboard!', 'success');
            } catch (err) {
              showToast('Failed to copy link', 'error');
            }
            document.body.removeChild(textarea);
          }
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

    // Persist masonry state for appendToVideoGrid to reuse
    container._masonryColumns = colElements;
    container._masonryHeights = colHeights;
  }

  /**
   * Append additional videos to an existing masonry grid.
   * Reuses the column layout from the last renderVideoGrid call.
   * Call this for infinite-scroll "load more" instead of full re-render.
   *
   * @param {string} containerId  ID of the grid container
   * @param {Array}  newVideos    Only the NEW videos to append (not all videos)
   */
  function appendToVideoGrid(containerId, newVideos) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!newVideos || newVideos.length === 0) return;

    // If no existing masonry state (e.g. first load), fall back to full render
    var colElements = container._masonryColumns;
    var colHeights  = container._masonryHeights;
    if (!colElements || colElements.length === 0) {
      renderVideoGrid(containerId, newVideos);
      return;
    }

    var numCols = colElements.length;

    for (var i = 0; i < newVideos.length; i++) {
      var video = newVideos[i];
      var card = createVideoCard(video);
      if (!card) continue;

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

    // Attach favorite listeners only on newly appended cards
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
    appendToVideoGrid: appendToVideoGrid,
    renderEmptyState: renderEmptyState,
    fallbackImg: fallbackImg,
    createAnimalCard: createAnimalCard,
    initDropdowns: initDropdowns
  };
})();
