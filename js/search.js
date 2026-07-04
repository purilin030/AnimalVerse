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
      App.ui.renderEmptyState(container, {
        title: 'Search for Videos',
        text: 'Type a keyword in the search bar to find animal videos.'
      });
      if (countEl) countEl.textContent = '';
      return;
    }

    if (videos.length === 0) {
      App.ui.renderEmptyState(container, {
        title: 'No Results Found',
        text: 'No videos match "' + query + '". Try different keywords.'
      });
      if (countEl) countEl.textContent = '0 results';
      return;
    }

    if (countEl) {
      countEl.textContent = App.utils.pluralize(videos.length, 'result');
    }

    App.ui.renderVideoGrid('search-results', videos);
  }

  return {
    init: init
  };
})();
