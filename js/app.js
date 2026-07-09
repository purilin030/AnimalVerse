/* ============================================================
   App Entry Point
   Initializes all modules after DOM is ready
   ============================================================ */
(function() {
  'use strict';

  function initApp() {
    var page = App.router.getCurrentPage();

    // Performance: set all images to async decoding
    var imgs = document.querySelectorAll('img:not([decoding])');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].decoding = 'async';
      if (!imgs[i].loading) imgs[i].loading = 'lazy';
    }

    // Always initialize these (shared across all pages)
    App.theme.init();
    App.navigation.init();
    App.chatbot.init();
    App.ui.initDropdowns();

    // Page-specific initialization
    switch (page) {
      case 'home.html':
        App.home.init();
        if (App.home.initScrollReveal) App.home.initScrollReveal();
        break;
      case 'gallery.html':
        if (App.gallery) App.gallery.init();
        break;
      case 'playback.html':
        if (App.player) App.player.init();
        break;
      case 'categories.html':
        if (App.categories) App.categories.init();
        break;
      case 'favorites.html':
        if (App.favoritesPage) App.favoritesPage.init();
        break;
      case 'liked_vid.html':
        if (App.likedPage) App.likedPage.init();
        break;
      case 'dashboard.html':
        if (App.dashboard) App.dashboard.init();
        break;
      case 'search.html':
        if (App.search) App.search.init();
        break;
      case 'map.html':
        if (App.map) App.map.init();
        break;
      case 'contact.html':
        if (App.contact) App.contact.init();
        break;
      case 'random_vid.html':
        if (App.randomVid) App.randomVid.init();
        break;
      // about.html is static, no JS needed
    }
  }

  // Wait for shared includes (header/sidebar) then init
  var includeEvent = 'includes-loaded';
  if (document.querySelector('[data-include]')) {
    document.addEventListener(includeEvent, initApp);
  } else {
    // No includes on this page, init directly
    document.addEventListener('DOMContentLoaded', initApp);
  }
})();
