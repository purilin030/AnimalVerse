/* ============================================================
   Watch Later Page - Init Watch Later Videos
   ============================================================ */
App.watchLaterPage = (function() {
  'use strict';

  function init() {
    loadWatchLater();
  }

  function loadWatchLater() {
    App.data.loadVideos().then(function() {
      var idList = App.favorites.getWatchLater();
      var container = document.getElementById('watch-later-grid');
      if (!container) return;

      var videos = idList.map(function(id) {
        return App.data.getVideoById(id);
      }).filter(function(v) { return v !== null; });

      if (videos.length === 0) {
        App.ui.renderEmptyState(container, {
          icon: '⏱',
          title: 'No Watch Later Videos',
          text: 'Save videos to watch later from any video page!',
          actionLabel: 'Browse Videos',
          actionHref: 'gallery.html'
        });
        return;
      }

      // Render the standard video grid
      App.ui.renderVideoGrid('watch-later-grid', videos);

      // Wire up card interactions
      App.ui.attachFavoriteListeners(container);
    });
  }

  return {
    init: init
  };
})();
