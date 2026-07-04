/* ============================================================
   Gallery Page - Filtering, Sorting, Rendering
   ============================================================ */
App.gallery = (function() {
  'use strict';

  var currentCategory = 'all';
  var currentTag = null;
  var currentSort = 'newest';

  // Infinite Scroll Pagination Variables
  var allFilteredResults = [];
  var currentPage = 1;
  var videosPerPage = 20;
  var isLoadingMore = false;

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

    // Bind filters and sorting events
    bindFilters();

    // Bind scroll listener for lazy infinite scroll loading
    window.addEventListener('scroll', handleScroll);

    // Load data and run initial render
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
      allFilteredResults = App.data.filterVideos({
        category: currentCategory,
        tag: currentTag,
        sort: currentSort
      });

      // Hide loading spinner if visible
      var loader = document.getElementById('gallery-loading');
      if (loader) loader.classList.remove('gallery-loading--active');

      // Reset page counter
      currentPage = 1;

      // Update count badge label
      var countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = App.utils.pluralize(allFilteredResults.length, 'video');
      }

      // Initial page slice render
      var visibleResults = allFilteredResults.slice(0, currentPage * videosPerPage);
      App.ui.renderVideoGrid('gallery-grid', visibleResults);
    });
  }

  /**
   * Scroll listener to dynamically load and append next page content with spinner delay
   */
  function handleScroll() {
    if (isLoadingMore) return;

    // Check if user scrolled near bottom of page (within 400px of bottom boundary)
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 400) {
      if (currentPage * videosPerPage < allFilteredResults.length) {
        isLoadingMore = true;
        
        // Show loading spinner
        var loader = document.getElementById('gallery-loading');
        if (loader) loader.classList.add('gallery-loading--active');
        
        // Simulated loading timeout for smooth UX transition
        setTimeout(function() {
          currentPage++;
          
          // Render slice including next page items
          var visibleResults = allFilteredResults.slice(0, currentPage * videosPerPage);
          App.ui.renderVideoGrid('gallery-grid', visibleResults);

          // Hide loading spinner
          if (loader) loader.classList.remove('gallery-loading--active');

          isLoadingMore = false;
        }, 1200); // 1200ms artificial loading time to make the animation more noticeable
      }
    }
  }

  return {
    init: init
  };
})();
