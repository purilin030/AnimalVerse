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
      showError('No video selected. <a href="gallery.html">Browse videos</a>');
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
    if (container) {
      container.innerHTML = '<div class="empty-state"><p class="text-muted">' + message + '</p></div>';
    }
  }

  function renderPlayer(video) {
    var container = document.getElementById('player-container');
    if (!container) return;

    if (video.source === 'youtube') {
      container.innerHTML =
        '<iframe class="player-iframe" src="' + App.config.youtube.embedBase + video.videoId + App.config.youtube.params +
        '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    } else {
      container.innerHTML =
        '<video class="player-video" controls poster="' + (video.posterUrl || video.thumbnail || '') + '">' +
        '  <source src="' + (video.videoUrl || '') + '" type="video/mp4">' +
        '  Your browser does not support the video tag.' +
        '</video>';

      var videoEl = container.querySelector('video');
      if (videoEl) {
        videoEl.play().catch(function() { /* autoplay prevented */ });
      }
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

    container.innerHTML =
      '<h1 class="video-info__title">' + App.ui.escapeHtml(video.title) + '</h1>' +
      '<div class="video-info__meta">' +
      '  <span class="video-info__category" style="color:' + catColor + '">' + App.ui.escapeHtml(catName) + '</span>' +
      '  <span>' + (video.duration || '') + '</span>' +
      '  <span>' + (video.views || 0).toLocaleString() + ' views</span>' +
      (video.location ? '<span>' + App.ui.escapeHtml(video.location.name) + '</span>' : '') +
      '</div>' +
      '<p class="video-info__description">' + App.ui.escapeHtml(video.description) + '</p>' +
      '<div class="video-info__actions">' +
      '  <button class="btn btn--favorite' + (isFav ? ' is-active' : '') + '" id="fav-btn" data-id="' + video.id + '">' +
          (isFav ? '❤️' : '🤍') + ' Favorite</button>' +
      '  <button class="btn btn--watchlater' + (isWL ? ' is-active' : '') + '" id="wl-btn" data-id="' + video.id + '">' +
          (isWL ? '⏰' : '⏱') + ' Watch Later</button>' +
      '</div>';

    // Bind buttons
    var favBtn = document.getElementById('fav-btn');
    var wlBtn = document.getElementById('wl-btn');

    if (favBtn) {
      favBtn.addEventListener('click', function() {
        var added = App.favorites.toggleFavorite(video.id);
        this.classList.toggle('is-active', added);
        this.innerHTML = (added ? '❤️' : '🤍') + ' Favorite';
        App.ui.showToast(added ? 'Added to favorites!' : 'Removed from favorites', added ? 'success' : 'info');
      });
    }

    if (wlBtn) {
      wlBtn.addEventListener('click', function() {
        var added = App.favorites.toggleWatchLater(video.id);
        this.classList.toggle('is-active', added);
        this.innerHTML = (added ? '⏰' : '⏱') + ' Watch Later';
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
        container.innerHTML = '<p class="text-muted">No related videos found.</p>';
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
