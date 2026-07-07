/* ============================================================
   Liked Videos Page - Init Liked Videos
   ============================================================ */
App.likedPage = (function() {
  'use strict';

  function init() {
    loadLikedVideos();
  }

  function loadLikedVideos() {
    App.data.loadVideos().then(function() {
      var idList = App.favorites.getLikes();
      var container = document.getElementById('liked-grid');
      if (!container) return;

      var videos = idList.map(function(id) {
        return App.data.getVideoById(id);
      }).filter(function(v) { return v !== null; });

      if (videos.length === 0) {
        App.ui.renderEmptyState(container, {
          icon: '👍',
          title: 'No Liked Videos Yet',
          text: 'Browse videos and like them to build your collection!',
          actionLabel: 'Browse Videos',
          actionHref: 'gallery.html'
        });
        return;
      }

      // Render the standard video grid using the app UI helper
      App.ui.renderVideoGrid('liked-grid', videos);
      
      // Wire up card clicks (like favorite buttons inside the cards)
      App.ui.attachFavoriteListeners(container);
    });
  }

  return {
    init: init
  };
})();
