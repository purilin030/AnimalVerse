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
        // Render custom empty state in Wise theme
        container.innerHTML = [
          '<div class="empty-state">',
          '  <span class="empty-state__icon" aria-hidden="true">👍</span>',
          '  <h2 class="empty-state__title">No Liked Videos Yet</h2>',
          '  <p class="empty-state__text text-muted">Browse our video library and like your favorite animal clips to build your collection.</p>',
          '  <a class="btn btn--primary" href="gallery.html">Explore Gallery</a>',
          '</div>'
        ].join('\n');
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
