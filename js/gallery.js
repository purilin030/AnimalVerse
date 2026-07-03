/* ============================================================
   Gallery Page - Filtering, Sorting, Rendering
   ============================================================ */
App.gallery = (function() {
  'use strict';

  var currentCategory = 'all';
  var currentTag = null;
  var currentSort = 'newest';

  var resizeTimeout;

  function init() {
    // Read URL params
    var params = App.router.getQueryParams();
    if (params.category) {
      currentCategory = params.category;
    }
    if (params.sort) {
      currentSort = params.sort;
    }
    if (params.tag) {
      currentTag = params.tag;
    }

    // Set active filter pills
    setActiveCategory(currentCategory);
    setActiveTag(currentTag);
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = currentSort;
      sortSelect.dispatchEvent(new Event('change-sync'));
    }

    // Bind events
    bindFilters();

    // Load and render
    loadAndRender();
  }

  function bindFilters() {
    // Category pills
    var pills = document.querySelectorAll('#category-filters .filter-pill');
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function() {
        currentCategory = this.getAttribute('data-category');
        setActiveCategory(currentCategory);
        loadAndRender();
      });
    }

    // Tag chips
    var chips = document.querySelectorAll('#tag-filters .tag-chip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].addEventListener('click', function() {
        var tag = this.getAttribute('data-tag');
        if (currentTag === tag) {
          currentTag = null;
          this.classList.remove('tag-chip--active');
        } else {
          // Deactivate all
          for (var k = 0; k < chips.length; k++) {
            chips[k].classList.remove('tag-chip--active');
          }
          currentTag = tag;
          this.classList.add('tag-chip--active');
        }
        loadAndRender();
      });
    }

    // Sort select
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        loadAndRender();
      });
    }
  }

  function setActiveCategory(category) {
    var pills = document.querySelectorAll('#category-filters .filter-pill');
    for (var i = 0; i < pills.length; i++) {
      if (pills[i].getAttribute('data-category') === category) {
        pills[i].classList.add('filter-pill--active');
      } else {
        pills[i].classList.remove('filter-pill--active');
      }
    }
  }

  function setActiveTag(tag) {
    var chips = document.querySelectorAll('#tag-filters .tag-chip');
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].getAttribute('data-tag') === tag) {
        chips[i].classList.add('tag-chip--active');
      } else {
        chips[i].classList.remove('tag-chip--active');
      }
    }
  }

  function loadAndRender() {
    App.data.loadVideos().then(function() {
      var results = App.data.filterVideos({
        category: currentCategory,
        tag: currentTag,
        sort: currentSort
      });

      // Update count
      var countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = results.length + ' video' + (results.length !== 1 ? 's' : '');
      }

      App.ui.renderVideoGrid('gallery-grid', results);
    });
  }

  return {
    init: init
  };
})();
