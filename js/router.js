/* ============================================================
   Simple Client-Side Router
   ============================================================ */
App.router = (function() {
  'use strict';

  /**
   * Get the current page filename
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
   * Navigate to a page
   */
  function navigateTo(page) {
    window.location.href = page;
  }

  /**
   * Parse URL query parameters
   */
  function getQueryParams() {
    var params = {};
    var searchParams = new URLSearchParams(window.location.search);

    searchParams.forEach(function(value, key) {
      params[key] = value;
    });

    return params;
  }

  return {
    getCurrentPage: getCurrentPage,
    navigateTo: navigateTo,
    getQueryParams: getQueryParams
  };
})();
