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
   * Extract a display-friendly animal label from a video
   * @returns {string} Uppercase label, or '' if none found
   */
  function _extractAnimalLabel(video) {
    var animalSlug = '';
    if (video.id && video.id.indexOf('video-') === 0) {
      var parts = video.id.split('-');
      if (parts.length >= 3) {
        animalSlug = parts.slice(1, -1).join('-');
      }
    } else if (video.source === 'youtube' && video.title) {
      var titleWords = video.title.split(' ');
      var skipWords = ['the', 'a', 'an', 'of', 'in', 'on', 'at', 'bbc', 'nat', 'geo', 'wild', 'earth', 'planet', 'blue'];
      var ytName = '';
      for (var ti = 0; ti < titleWords.length && ytName.split(' ').length < 2; ti++) {
        var word = titleWords[ti].replace(/[^a-zA-Z]/g, '');
        if (word.length > 2 && skipWords.indexOf(word.toLowerCase()) === -1) {
          ytName += (ytName ? ' ' : '') + word;
        }
      }
      animalSlug = ytName.toLowerCase().replace(/\s+/g, '-');
    }
    return animalSlug ? animalSlug.replace(/-/g, ' ').toUpperCase() : '';
  }

    /**
     * Check whether a date string is within the last N days (default 30).
     */
    function _isWithinDays(dateStr, days) {
      if (!dateStr) return false;
      var date = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
      if (isNaN(date.getTime())) return false;
      var diff = Date.now() - date.getTime();
      return diff >= 0 && diff < days * 86400000;
    }


  /**
   * Build the thumbnail wrapper element for a video card
   */
  function _buildThumbnailWrapper(video, options) {
    options = options || {};
    var defaultImg = 'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp';
    var thumbnailSrc = video.gbifThumbnail || video.thumbnail || defaultImg;
    var localFallback = video.thumbnail || defaultImg;
    var categoryName = video.category || 'unknown';
    // Uniform (sorted/ranked) grids force a standard 16:9 frame so the
    // left-to-right reading order is visually strict — no masonry jumps.
    var aspect = options.uniform
      ? { className: 'aspect-video', heightWeight: 0.56 }
      : App.utils.getVideoAspect(video.id);

    var thumbWrap = document.createElement('div');
    thumbWrap.className = 'video-card__thumbnail-wrapper ' + aspect.className;

    // Rank badge — shown for sorted/ranked views
    if (options.rank) {
      var rankBadge = document.createElement('span');
      rankBadge.className = 'video-card__rank-badge';
      if (options.rank <= 3) {
        rankBadge.className += ' video-card__rank-badge--top video-card__rank-badge--rank-' + options.rank;
      }
      var rankText = '#' + options.rank;
      if (options.rank === 1) rankText += ' 👑';
      else if (options.rank === 2) rankText += ' 🥈';
      else if (options.rank === 3) rankText += ' 🥉';
      rankBadge.textContent = rankText;
      thumbWrap.appendChild(rankBadge);
    }

    // Source tag
    if (video.source) {
      var sourceTag = document.createElement('span');
      sourceTag.className = 'video-card__source-tag';
      sourceTag.textContent = video.source.toUpperCase();
      thumbWrap.appendChild(sourceTag);
    }

    // Category tag
    var catTag = document.createElement('span');
    catTag.className = 'video-card__category-tag video-card__category-tag--' + categoryName;
    catTag.textContent = categoryName;
    thumbWrap.appendChild(catTag);

    // HOT badge — for top/popular cards
    if (options.hot) {
      var hotBadge = document.createElement('span');
      hotBadge.className = 'video-card__hot-badge';
      hotBadge.textContent = '🔥 HOT';
      thumbWrap.appendChild(hotBadge);
    }

    // Thumbnail image
    var img = document.createElement('img');
    img.className = 'video-card__thumbnail';
    img.src = thumbnailSrc;
    img.alt = video.title || 'Video thumbnail';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.setAttribute('data-local', localFallback);
    if (video.source === 'youtube') {
      var YT_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">' +
        '<rect fill="#f0f0f0" width="320" height="180"/>' +
        '<text x="160" y="90" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#999">YouTube</text>' +
        '<text x="160" y="110" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="11" fill="#bbb">Video unavailable</text>' +
        '</svg>'
      );
      img.onerror = function() {
        if (this.src.indexOf('data:image/svg') === -1) {
          this.src = YT_PLACEHOLDER;
        }
      };
    } else {
      img.onerror = function() { App.ui.fallbackImg(this); };
    }
    thumbWrap.appendChild(img);

    // Animal tag
    var animalLabelText = _extractAnimalLabel(video);
    if (animalLabelText) {
      var animalTag = document.createElement('span');
      animalTag.className = 'video-card__animal-tag';
      animalTag.textContent = animalLabelText;
      thumbWrap.appendChild(animalTag);
    }

    // Duration badge
    var duration = document.createElement('span');
    duration.className = 'video-card__duration';
    duration.textContent = video.duration || '--:--';
    thumbWrap.appendChild(duration);

    return thumbWrap;
  }

  /**
   * Build the card body element (title, views, credit)
   */
  function _buildCardBody(video, options) {
    options = options || {};
    var body = document.createElement('div');
    body.className = 'video-card__body';

    var title = document.createElement('h3');
    title.className = 'video-card__title';
    title.textContent = video.title || '';
    body.appendChild(title);

    // Meta row — compact views · relative upload date (+ NEW badge for recent)
    // Single line keeps the card body tight and makes time anchors scannable.
    var meta = document.createElement('p');
    meta.className = 'video-card__meta';

    var views = document.createElement('span');
    views.className = 'video-card__views';
    views.textContent = App.utils.formatCompactNumber(video.views || 0) + ' views';
    meta.appendChild(views);

    if (video.dateAdded) {
      meta.appendChild(document.createTextNode(' · '));
      var date = document.createElement('span');
      date.className = 'video-card__date';
      date.textContent = '📅 ' + App.utils.formatRelativeTime(video.dateAdded);
      meta.appendChild(date);
      if (_isWithinDays(video.dateAdded, 30)) {
        meta.appendChild(document.createTextNode(' '));
        var newBadge = document.createElement('span');
        newBadge.className = 'video-card__new-badge';
        newBadge.textContent = '✨ NEW';
        meta.appendChild(newBadge);
      }
    }
    body.appendChild(meta);

    if (video.credit) {
      var credit = document.createElement('p');
      credit.className = 'video-card__credit';
      credit.textContent = video.credit;
      body.appendChild(credit);
    }

    return body;
  }

  /**
   * Build the actions bar (favorite, play, share buttons)
   */
  function _buildActionsBar(video) {
    var isFav = App.favorites.isFavorite(video.id);
    var actions = document.createElement('div');
    actions.className = 'video-card__actions';
    actions.appendChild(createActionBtn('favorite', isFav, video.id));
    actions.appendChild(createActionBtn('play', false, video.id));
    actions.appendChild(createActionBtn('share', false, video.id));
    return actions;
  }

  /**
   * Build the clickable location bar for a video card.
   * Shows a pulsing radar dot + filming-place name, and fills in
   * "📍 X km away" once the user's position is known (granted on the
   * home page — never prompts here). Clicking opens the world map
   * focused on that exact filming spot.
   */
  function _buildLocationBar(video) {
    var loc = video.location;
    if (!loc || !loc.lat || !loc.lng) return null;

    var link = document.createElement('a');
    link.className = 'video-card__location';
    link.href = 'map.html?focus=' + loc.lat + ',' + loc.lng +
      '&name=' + encodeURIComponent(loc.name || '');
    link.setAttribute('title', 'Click to locate this animal on the world map');
    link.setAttribute('aria-label', 'View ' + (video.title || 'this animal') + ' filming location on the world map');

    // Pulsing radar dot (signifier: this is a live geographic marker)
    var dot = document.createElement('span');
    dot.className = 'video-card__location-radar';
    dot.setAttribute('aria-hidden', 'true');
    link.appendChild(dot);

    // Place name — strip the trailing "(Region)" suffix for a compact label
    var rawName = loc.name || '';
    var shortName = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawName;
    var label = document.createElement('span');
    label.className = 'video-card__location-name';
    label.textContent = shortName;
    link.appendChild(label);

    // Distance from user — filled in lazily from the shared position cache
    var dist = document.createElement('span');
    dist.className = 'video-card__location-dist';
    dist.setAttribute('data-lat', loc.lat);
    dist.setAttribute('data-lng', loc.lng);
    link.appendChild(dist);

    var pos = App.utils.getUserPosition();
    if (pos) {
      var d = App.utils.getDistance(pos.lat, pos.lng, loc.lat, loc.lng);
      dist.textContent = ' · 📍 ' + App.utils.formatDistance(d) + ' away';
    }

    return link;
  }

  /**
   * Create a video card DOM element (safe DOM methods, no innerHTML)
   * Retro pixel style — separate thumb/body links, actions bar as sibling
   */
  function createVideoCard(video, options) {
    if (!video) return null;
    options = options || {};

    var playbackUrl = 'playback.html?id=' + encodeURIComponent(video.id);

    // Card container
    var card = document.createElement('div');
    card.className = 'video-card';
    if (options.uniform) {
      card.className += ' video-card--uniform';
    }
    card.setAttribute('data-id', video.id);

    // Thumb link (wraps only the image area)
    var thumbLink = document.createElement('a');
    thumbLink.href = playbackUrl;
    thumbLink.className = 'video-card__thumb-link';
    thumbLink.appendChild(_buildThumbnailWrapper(video, options));
    card.appendChild(thumbLink);

    // Body link (wraps title + views)
    var bodyLink = document.createElement('a');
    bodyLink.href = playbackUrl;
    bodyLink.className = 'video-card__body-link';
    bodyLink.appendChild(_buildCardBody(video, options));
    card.appendChild(bodyLink);

    // Actions bar (sibling of links — no nested interactive elements)
    card.appendChild(_buildActionsBar(video));

    // Clickable filming-location bar (radar dot + place + distance)
    var locationBar = _buildLocationBar(video);
    if (locationBar) {
      card.appendChild(locationBar);
    }

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
   * Attach card action button listeners via event delegation.
   * Uses a flag to avoid binding duplicate listeners on the same container.
   */
  function attachFavoriteListeners(container) {
    container = container || document;
    // Prevent re-binding on the same container
    if (container._actionsDelegated) return;
    container._actionsDelegated = true;

    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.video-card__action-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

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
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.origin + '/' + playbackUrl).then(function() {
            showToast('Link copied to clipboard!', 'success');
          }).catch(function() {
            showToast('Failed to copy link', 'error');
          });
        } else {
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

  /**
   * Render videos into a grid container
   */
  function _getCardOptions(options, index) {
    options = options || {};
    var cardOptions = {
      uniform: !!options.uniform,
      sortMode: options.sortMode || null
    };
    if (options.ranked) {
      cardOptions.rank = index + 1;
      if (cardOptions.rank <= 3) {
        cardOptions.hot = true;
      }
    }
    if (options.hotIndexes && options.hotIndexes.indexOf(index) !== -1) {
      cardOptions.hot = true;
    }
    return cardOptions;
  }

  /**
   * Render videos into a grid container.
   * @param {string} containerId - Target grid element ID
   * @param {Array}  videos - Videos to render
   * @param {object} [options] - { uniform, ranked, sortMode }
   */
  function renderVideoGrid(containerId, videos, options) {
    var container = document.getElementById(containerId);
    if (!container) return;
    options = options || {};

    // Cache videos and options on the container for resize re-rendering
    container.renderedVideos = videos;
    container.renderedOptions = options;

    if (!videos || videos.length === 0) {
      renderEmptyState(container, { text: 'No videos found.' });
      return;
    }

    container.textContent = '';
    container.classList.remove('gallery-grid--az');

    // Uniform grid mode — used for sorted views so reading order is strict.
    if (options.uniform) {
      container.classList.add('video-grid--uniform');
      container._masonryColumns = null;
      container._masonryHeights = null;
      for (var u = 0; u < videos.length; u++) {
        var uniformCard = createVideoCard(videos[u], _getCardOptions(options, u));
        if (uniformCard) container.appendChild(uniformCard);
      }
      options.rankOffset = videos.length;
      attachFavoriteListeners(container);
      return;
    }

    container.classList.remove('video-grid--uniform');

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
      var card = createVideoCard(video, _getCardOptions(options, i));
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
   * Append additional videos to an existing grid.
   * Reuses the column layout from the last renderVideoGrid call.
   * Call this for infinite-scroll "load more" instead of full re-render.
   *
   * @param {string} containerId  ID of the grid container
   * @param {Array}  newVideos    Only the NEW videos to append (not all videos)
   * @param {object} [options]    Render options; defaults to stored options
   */
  function appendToVideoGrid(containerId, newVideos, options) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!newVideos || newVideos.length === 0) return;
    options = options || container.renderedOptions || {};

    // Uniform grid — simple append preserves left-to-right rank order.
    if (options.uniform || container.classList.contains('video-grid--uniform')) {
      options.uniform = true;
      var startRank = options.rankOffset || 0;
      for (var ui = 0; ui < newVideos.length; ui++) {
        var uniformCard = createVideoCard(newVideos[ui], _getCardOptions(options, startRank + ui));
        if (uniformCard) container.appendChild(uniformCard);
      }
      options.rankOffset = startRank + newVideos.length;
      attachFavoriteListeners(container);
      return;
    }

    // If no existing masonry state (e.g. first load), fall back to full render
    var colElements = container._masonryColumns;
    var colHeights  = container._masonryHeights;
    if (!colElements || colElements.length === 0) {
      renderVideoGrid(containerId, newVideos, options);
      return;
    }

    var numCols = colElements.length;

    for (var i = 0; i < newVideos.length; i++) {
      var video = newVideos[i];
      var card = createVideoCard(video, _getCardOptions(options, i));
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

    var defaultImg = 'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp';
    var src = imgUrl || (App.data && App.data.getLocalAnimalImage(animalName)) || defaultImg;

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
    img.onerror = function() { 
      var fallback = (App.data && App.data.getLocalAnimalImage(animalName)) || defaultImg;
      this.src = fallback; 
    };
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
    img.src = 'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp';
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
          // Preserve render options so sorted/uniform grids stay uniform on resize
          renderVideoGrid(grid.id, grid.renderedVideos, grid.renderedOptions || {});
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
