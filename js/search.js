/* ============================================================
   Search Page - Client-Side Search
   ============================================================ */
App.search = (function() {
  'use strict';

  function init() {
    var params = App.router.getQueryParams();
    var query = params.q || '';

    var headingEl = document.getElementById('search-query-display');
    var countEl = document.getElementById('search-results-count');

    if (headingEl) {
      headingEl.textContent = query ? 'Results for: "' + query + '"' : 'Search Results';
    }

    App.data.loadVideos().then(function() {
      var results = query ? App.data.filterVideos({ query: query }) : [];
      renderResults(results, query, countEl);
    });
  }

  function renderResults(videos, query, countEl) {
    var container = document.getElementById('search-results');
    if (!container) return;

    if (!query) {
      container.innerHTML =
        '<div class="empty-state">' +
        '  <h3 class="empty-state__title">Search for Videos</h3>' +
        '  <p class="empty-state__text">Type a keyword in the search bar to find animal videos.</p>' +
        '</div>';
      if (countEl) countEl.textContent = '';
      return;
    }

    if (videos.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '  <h3 class="empty-state__title">No Results Found</h3>' +
        '  <p class="empty-state__text">No videos match "' + App.ui.escapeHtml(query) + '". Try different keywords.</p>' +
        '</div>';
      if (countEl) countEl.textContent = '0 results';
      return;
    }

    if (countEl) {
      countEl.textContent = videos.length + ' result' + (videos.length !== 1 ? 's' : '');
    }

    App.ui.renderVideoGrid('search-results', videos);
  }

  return {
    init: init
  };
})();
