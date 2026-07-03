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
    var query = window.location.search.substring(1);
    if (!query) return params;
    var pairs = query.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split('=');
      var key = decodeURIComponent(parts[0]);
      var value = parts.length > 1 ? decodeURIComponent(parts[1] || '') : '';
      params[key] = value;
    }
    return params;
  }

  return {
    getCurrentPage: getCurrentPage,
    navigateTo: navigateTo,
    getQueryParams: getQueryParams
  };
})();
