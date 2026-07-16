/* ============================================================
   Client-Side Router — URL parsing + page dispatch registry
   Replaces the old switch-based dispatch in app.js with a
   data-driven table.  Page modules could self-register, but
   currently all registrations are in app.js for locality.
   ============================================================ */
App.router = (function() {
  'use strict';

  var _pages = {}; // pageName → init function

  /**
   * Get the current page filename (e.g. 'gallery.html')
   */
  function getCurrentPage() {
    var path = window.location.pathname;
    var page = path.split('/').pop();
    if (page && page.indexOf('.') === -1) {
      page += '.html';
    }
    return page || 'home.html';
  }

  /**
   * Navigate to a page (full page reload)
   */
  function navigateTo(page) {
    window.location.href = page;
  }

  /**
   * Parse URL query parameters into a plain object
   */
  function getQueryParams() {
    var params = {};
    var searchParams = new URLSearchParams(window.location.search);

    searchParams.forEach(function(value, key) {
      params[key] = value;
    });

    return params;
  }

  /**
   * Register a page initializer.
   * @param {string} pageName — e.g. 'gallery.html'
   * @param {function} initFn — called when this page is the current page
   */
  function register(pageName, initFn) {
    _pages[pageName] = initFn;
  }

  /**
   * Dispatch to the registered initializer for the given page.
   * @param {string} [pageName] — defaults to current page from URL
   */
  function dispatch(pageName) {
    pageName = pageName || getCurrentPage();
    var fn = _pages[pageName];
    if (typeof fn === 'function') {
      fn();
    }
  }

  return {
    getCurrentPage: getCurrentPage,
    navigateTo: navigateTo,
    getQueryParams: getQueryParams,
    register: register,
    dispatch: dispatch
  };
})();
