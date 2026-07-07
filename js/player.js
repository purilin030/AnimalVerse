/* ============================================================
   Video Player (YouTube & HTML5)
   ============================================================ */
App.player = (function() {
  'use strict';

  var currentVideo = null;

  function init() {
    var params = App.router.getQueryParams();
    var videoId = params.id;
    var animalName = params.animal;

    if (!videoId && !animalName) {
      var container = document.getElementById('player-container');
      App.ui.renderEmptyState(container, {
        text: 'No video selected.',
        actionLabel: 'Browse videos',
        actionHref: 'gallery.html'
      });
      return;
    }

    App.data.loadVideos().then(function() {
      if (videoId) {
        currentVideo = App.data.getVideoById(videoId);
      } else if (animalName) {
        // Resolve video by searching for animal name in title, description, or ID
        var nameLower = animalName.toLowerCase();
        var allVids = App.data.filterVideos();
        currentVideo = allVids.find(function(v) {
          var match = (v.title && v.title.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.description && v.description.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.id && v.id.toLowerCase().indexOf(nameLower) !== -1);
          return match;
        });
      }

      if (!currentVideo) {
        showError('Video not found.');
        return;
      }

      renderPlayer(currentVideo);
      renderVideoInfo(currentVideo);
      renderLocationMap(currentVideo);
      renderRelatedVideos(currentVideo);
    });
  }

  function showError(message) {
    var container = document.getElementById('player-container');
    App.ui.renderEmptyState(container, { text: message });
  }

  function renderPlayer(video) {
    var container = document.getElementById('player-container');
    if (!container) return;

    // Clear any placeholder content (e.g. "Loading video...")
    container.textContent = '';

    if (video.source === 'youtube') {
      var iframe = document.createElement('iframe');
      iframe.className = 'player-iframe';
      iframe.src = App.config.youtube.embedBase + (video.videoId || '') + App.config.youtube.params;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      container.appendChild(iframe);
    } else {
      var videoEl = document.createElement('video');
      videoEl.className = 'player-video';
      videoEl.controls = true;
      videoEl.poster = video.posterUrl || video.thumbnail || '';
      videoEl.textContent = 'Your browser does not support the video tag.';

      var source = document.createElement('source');
      source.src = video.videoUrl || '';
      source.type = 'video/mp4';
      videoEl.appendChild(source);

      container.appendChild(videoEl);

      videoEl.play().catch(function() { /* autoplay prevented */ });
    }
  }

  function renderVideoInfo(video) {
    var container = document.getElementById('video-info');
    if (!container) return;

    var cat = App.data.getCategoryById(video.category);
    var catName = cat ? cat.name : video.category;
    var catColor = cat ? cat.color : '';

    var isFav = App.favorites.isFavorite(video.id);
    var isWL = App.favorites.isWatchLater(video.id);
    var isLiked = App.favorites.isLiked(video.id);

    // Clear container
    container.textContent = '';

    // Title
    var title = document.createElement('h1');
    title.className = 'video-info__title';
    title.textContent = video.title || '';
    container.appendChild(title);

    // Meta row
    var meta = document.createElement('div');
    meta.className = 'video-info__meta';
    container.appendChild(meta);

    var catSpan = document.createElement('span');
    catSpan.className = 'video-info__category';
    catSpan.style.color = catColor;
    catSpan.textContent = catName || '';
    meta.appendChild(catSpan);

    var durationSpan = document.createElement('span');
    durationSpan.textContent = video.duration || '';
    meta.appendChild(durationSpan);

    var viewsSpan = document.createElement('span');
    viewsSpan.textContent = (video.views || 0).toLocaleString() + ' views';
    meta.appendChild(viewsSpan);

    if (video.location) {
      var locSpan = document.createElement('span');
      locSpan.textContent = video.location.name || '';
      meta.appendChild(locSpan);
    }

    // Description
    var desc = document.createElement('p');
    desc.className = 'video-info__description';
    desc.textContent = video.description || '';
    container.appendChild(desc);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'video-info__actions';
    container.appendChild(actions);

    var likeBtn = document.createElement('button');
    likeBtn.className = 'btn btn--like' + (isLiked ? ' is-active' : '');
    likeBtn.id = 'like-btn';
    likeBtn.setAttribute('data-id', video.id);
    likeBtn.textContent = (isLiked ? '👍 Liked' : '👍 Like');
    actions.appendChild(likeBtn);

    var favBtn = document.createElement('button');
    favBtn.className = 'btn btn--favorite' + (isFav ? ' is-active' : '');
    favBtn.id = 'fav-btn';
    favBtn.setAttribute('data-id', video.id);
    favBtn.textContent = (isFav ? '❤️' : '🤍') + ' Favorite';
    actions.appendChild(favBtn);

    var wlBtn = document.createElement('button');
    wlBtn.className = 'btn btn--watchlater' + (isWL ? ' is-active' : '');
    wlBtn.id = 'wl-btn';
    wlBtn.setAttribute('data-id', video.id);
    wlBtn.textContent = (isWL ? '⏰' : '⏱') + ' Watch Later';
    actions.appendChild(wlBtn);

    // Bind buttons (use references already created above)
    if (likeBtn) {
      likeBtn.addEventListener('click', function() {
        var added = App.favorites.toggleLike(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '👍 Liked' : '👍 Like');
        App.ui.showToast(added ? 'Added to liked videos!' : 'Removed from liked videos', added ? 'success' : 'info');
      });
    }

    if (favBtn) {
      favBtn.addEventListener('click', function() {
        var added = App.favorites.toggleFavorite(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '❤️' : '🤍') + ' Favorite';
        App.ui.showToast(added ? 'Added to favorites!' : 'Removed from favorites', added ? 'success' : 'info');
      });
    }

    if (wlBtn) {
      wlBtn.addEventListener('click', function() {
        var added = App.favorites.toggleWatchLater(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '⏰' : '⏱') + ' Watch Later';
        App.ui.showToast(added ? 'Added to Watch Later!' : 'Removed from Watch Later', added ? 'success' : 'info');
      });
    }
  }

  function renderLocationMap(video) {
    if (!video.location || !video.location.lat || !video.location.lng) return;

    var mapSection = document.getElementById('location-map');
    var mapContainer = document.getElementById('location-map-container');
    if (!mapSection || !mapContainer) return;

    mapSection.style.display = 'block';

    try {
      var map = L.map(mapContainer).setView([video.location.lat, video.location.lng], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 10
      }).addTo(map);

      L.marker([video.location.lat, video.location.lng])
        .addTo(map)
        .bindPopup('<b>' + App.ui.escapeHtml(video.location.name) + '</b>');

      // Invalidate after a tiny delay to ensure render
      setTimeout(function() { map.invalidateSize(); }, 300);
    } catch(e) {
      console.warn('Map render error:', e);
      mapSection.style.display = 'none';
    }
  }

  function renderRelatedVideos(currentVideo) {
    var container = document.getElementById('related-videos');
    if (!container) return;

    App.data.loadVideos().then(function() {
      var related = App.data.filterVideos({ category: currentVideo.category })
        .filter(function(v) { return v.id !== currentVideo.id; })
        .slice(0, 5);

      if (related.length === 0) {
        var noRel = document.createElement('p');
        noRel.className = 'text-muted';
        noRel.textContent = 'No related videos found.';
        container.appendChild(noRel);
        return;
      }

      container.innerHTML = '';
      for (var i = 0; i < related.length; i++) {
        var card = App.ui.createVideoCard(related[i]);
        if (card) {
          container.appendChild(card);
        }
      }

      App.ui.attachFavoriteListeners(container);
    });
  }

  return {
    init: init
  };
})();
