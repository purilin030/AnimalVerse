/* ============================================================
   Favorites Page - Init Favorites & Watch Later
   ============================================================ */
App.favoritesPage = (function() {
  'use strict';

  var currentTab = 'favorites';

  function init() {
    bindTabs();
    loadTab('favorites');
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('.favorites-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function() {
        var tab = this.getAttribute('data-tab');
        document.querySelectorAll('.favorites-tab').forEach(function(t) {
          t.classList.remove('favorites-tab--active');
        });
        this.classList.add('favorites-tab--active');
        currentTab = tab;
        loadTab(tab);
      });
    }
  }

  function loadTab(tab) {
    App.data.loadVideos().then(function() {
      var idList;
      var title;

      if (tab === 'favorites') {
        idList = App.favorites.getFavorites();
        title = 'Favorites';
      } else {
        idList = App.favorites.getWatchLater();
        title = 'Watch Later';
      }

      var videos = idList.map(function(id) {
        return App.data.getVideoById(id);
      }).filter(function(v) { return v !== null; });

      var container = document.getElementById('favorites-grid');
      if (!container) return;

      if (videos.length === 0) {
        App.ui.renderEmptyState(container, {
          icon: tab === 'favorites' ? '🤍' : '⏱',
          title: 'No ' + title + ' Yet',
          text: 'Browse videos and save your favorites for later!',
          actionLabel: 'Browse Videos',
          actionHref: 'gallery.html'
        });
        return;
      }

      App.ui.renderVideoGrid('favorites-grid', videos);
    });
  }

  return {
    init: init
  };
})();
