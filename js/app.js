/* ============================================================
   App Entry Point
   Initializes all modules after DOM is ready.
   Page-specific init is data-driven via App.router.register().
   ============================================================ */
(function() {
  'use strict';

  function initApp() {
    // Verify module dependency graph — shows error banner if scripts are missing
    App.deps.verify();

    var page = App.router.getCurrentPage();

    // Performance: set all images to async decoding
    var imgs = document.querySelectorAll('img:not([decoding])');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].decoding = 'async';
      if (!imgs[i].loading) imgs[i].loading = 'lazy';
    }

    // Always initialize these (shared across all pages)
    App.theme.init();
    App.dataSource.init();
    App.navigation.init();
    App.chatbot.init();
    App.ui.initDropdowns();

    // ── Page dispatch table (data-driven — no switch statement) ──
    // Each page registers its init function.  Adding a new page
    // means one App.router.register() call here — no switch to grow.
    // Modules could self-register after their IIFE, but centralising
    // here keeps the init order explicit and easy to scan.

    App.router.register('home.html', function() {
      App.home.init();
      if (App.home.initScrollReveal) App.home.initScrollReveal();
    });
    App.router.register('gallery.html', function() {
      App.gallery.init();
    });
    App.router.register('playback.html', function() {
      App.player.init();
    });
    App.router.register('categories.html', function() {
      App.categories.init();
    });
    App.router.register('favorites.html', function() {
      App.favoritesPage.init();
    });
    App.router.register('liked_vid.html', function() {
      App.likedPage.init();
    });
    App.router.register('dashboard.html', function() {
      App.dashboard.init();
    });
    App.router.register('search.html', function() {
      App.search.init();
    });
    App.router.register('map.html', function() {
      App.map.init();
    });
    App.router.register('contact.html', function() {
      App.contact.init();
    });
    App.router.register('random_vid.html', function() {
      App.randomVid.init();
    });
    App.router.register('upload.html', function() {
      App.upload.init();
    });
    // about.html is static — no JS init needed

    // Dispatch to the registered page initializer
    App.router.dispatch(page);
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
