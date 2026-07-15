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

  // YouTube mode references
  var _ytToggleBtn = null;
  var _ytModeActive = false;
  var _ytNextPageToken = null;    // API page token
  var _ytHasMore = false;         // whether has more
  var _ytLoading = false;         // 甇??蝸 API
  var _ytFromApi = false;         // 敶?雿輻 API 璅∪?

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

    // Create YouTube mode toggle button
    renderYoutubeToggleBtn();

    // Load data and run initial render
    loadAndRender();
  }

  // ?? YouTube Mode Toggle ????????????????????????????????????

  /**
   * Create and append the YouTube mode floating toggle button
   */
  function renderYoutubeToggleBtn() {
    // Avoid duplicate buttons
    if (document.querySelector('.youtube-toggle-btn')) return;

    _ytToggleBtn = document.createElement('button');
    _ytToggleBtn.className = 'youtube-toggle-btn';
    _ytToggleBtn.id = 'youtube-mode-toggle';
    _ytToggleBtn.setAttribute('role', 'switch');
    _ytToggleBtn.setAttribute('aria-label', 'Switch to YouTube mode');
    _ytToggleBtn.setAttribute('aria-pressed', 'false');

    // Initial state sync
    updateButtonState();

    _ytToggleBtn.addEventListener('click', function(event) {
      // Save scroll position before re-render to prevent jump
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      App.theme.toggleYoutubeMode(function(nowActive) {
        _ytModeActive = nowActive;
        updateButtonState();
        updateTitles(nowActive);

        // Re-render gallery with new data source and restore scroll
        loadAndRender(function() {
          window.scrollTo(scrollX, scrollY);
        });

        // Toast feedback
        if (App.ui && App.ui.showToast) {
          App.ui.showToast(
            nowActive ? '📺 YouTube mode activated' : '🎬 Library mode restored',
            nowActive ? 'info' : 'success'
          );
        }
      }, event);
    });

    document.body.appendChild(_ytToggleBtn);
  }

  /**
   * Update button text and ARIA state based on current theme
   */
  function updateButtonState() {
    if (!_ytToggleBtn) {
      _ytToggleBtn = document.querySelector('.youtube-toggle-btn');
      if (!_ytToggleBtn) return;
    }
    var isYt = App.theme.isYoutubeMode();
    _ytToggleBtn.textContent = isYt ? '🎬 LIB MODE' : '📺 YT MODE';
    _ytToggleBtn.setAttribute('aria-pressed', isYt ? 'true' : 'false');
    _ytToggleBtn.setAttribute('aria-label', isYt ? 'Switch to Library mode' : 'Switch to YouTube mode');
    _ytModeActive = isYt;
  }

  /**
   * Update page titles to reflect current mode
   */
  function updateTitles(isYoutube) {
    isYoutube = (isYoutube !== undefined) ? isYoutube : _ytModeActive;

    // Main heading
    var heading = document.querySelector('.gallery-page__title, .page-hero__title, h1');
    if (heading) {
      heading.textContent = isYoutube ? 'YouTube Wildlife' : 'Discovery Gallery';
    }

    // Subheading
    var subheading = document.querySelector('.gallery-page__subtitle, .page-hero__subtitle, .section__subtitle');
    if (subheading) {
      subheading.textContent = isYoutube ? 'YOUTUBE TRANSMISSION' : 'EXPLORE THE WILD';
    }
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


  function loadAndRender(onComplete) {
    var isYt = App.theme.isYoutubeMode();

    if (isYt) {
      // YouTube mode: use dynamic API search or static fallback
      _ytLoading = true;
      _ytFromApi = App.data.isYoutubeApiEnabled();
      App.data.resetYoutubePagination(currentCategory, currentTag);

      // Show loading
      var loader = document.getElementById('gallery-loading');
      if (loader) loader.classList.add('gallery-loading--active');

      App.data.searchYoutubeVideos({
        category: currentCategory,
        tag: currentTag,
        sort: currentSort,
        maxResults: videosPerPage
      }, null).then(function(result) {
        _ytLoading = false;
        _ytNextPageToken = result.nextPageToken;
        _ytHasMore = result.hasMore;

        allFilteredResults = result.videos || [];

        // Hide loading spinner
        if (loader) loader.classList.remove('gallery-loading--active');

        // Reset page counter for local pagination
        currentPage = 1;

        // Update count badge
        var countEl = document.getElementById('results-count');
        if (countEl) {
          var total = result._fromFallback ? allFilteredResults.length : (result.totalResults || allFilteredResults.length);
          countEl.textContent = App.utils.pluralize(total, 'video') + (_ytHasMore ? '+' : '');
        }

        // Render grid
        App.ui.renderVideoGrid('gallery-grid', allFilteredResults);

        // Execute callback after grid is rendered
        if (typeof onComplete === 'function') onComplete();
      }).catch(function() {
        _ytLoading = false;
        if (loader) loader.classList.remove('gallery-loading--active');

        // Fallback: show empty state
        var grid = document.getElementById('gallery-grid');
        if (grid) {
          App.ui.renderEmptyState(grid, { text: 'Failed to load YouTube videos.', icon: '?' });
        }
        allFilteredResults = [];

        // Execute callback even on failure so the screen reveals
        if (typeof onComplete === 'function') onComplete();
      });

    } else {
      // Normal mode: load from videos.json
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
        // Render grid
        var visibleResults = allFilteredResults.slice(0, currentPage * videosPerPage);
        App.ui.renderVideoGrid('gallery-grid', visibleResults);

        // Execute callback after grid is rendered
        if (typeof onComplete === 'function') onComplete();
      });
    }
  }

  var scrollTicking = false;

  /**
   * Scroll listener to dynamically load and append next page content
   * - ?桅芋撘? 隞?allFilteredResults ?砍?△
   * - YouTube API 璅∪?: 靚 YouTube Data API 蝧駁△
   */
  function handleScroll() {
    if (scrollTicking) return;
    scrollTicking = true;

    requestAnimationFrame(function() {
      if (isLoadingMore || _ytLoading) { scrollTicking = false; return; }

      // Check if user scrolled near bottom of page (within 400px of bottom boundary)
      if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 400) {

        // ?? YouTube API 蝧駁△璅∪? ??????????????????????????
        if (App.theme.isYoutubeMode() && _ytFromApi && _ytHasMore) {
          _ytLoading = true;
          isLoadingMore = true;

          var loader = document.getElementById('gallery-loading');
          if (loader) loader.classList.add('gallery-loading--active');

          App.data.nextYoutubePage({
            category: currentCategory,
            tag: currentTag,
            sort: currentSort,
            maxResults: videosPerPage
          }).then(function(result) {
            var newVideos = result.videos || [];

            // ?湔?△?嗆?            _ytNextPageToken = result.nextPageToken;
            _ytHasMore = result.hasMore;

            // Append to allFilteredResults
            allFilteredResults = allFilteredResults.concat(newVideos);

            // Append to grid if there are new videos
            if (newVideos.length > 0) {
              App.ui.appendToVideoGrid('gallery-grid', newVideos);
            }

            // Update count
            var countEl = document.getElementById('results-count');
            if (countEl) {
              countEl.textContent = App.utils.pluralize(allFilteredResults.length, 'video') + (_ytHasMore ? '+' : '');
            }

            if (loader) loader.classList.remove('gallery-loading--active');
            _ytLoading = false;
            isLoadingMore = false;
            scrollTicking = false;
          }).catch(function() {
            if (loader) loader.classList.remove('gallery-loading--active');
            _ytLoading = false;
            isLoadingMore = false;
            scrollTicking = false;
          });
          return;
        }

        // ?? ?砍?△璅∪?嚗?芋撘?+ YouTube ??fallback嚗???
        if (currentPage * videosPerPage < allFilteredResults.length) {
          isLoadingMore = true;

          // Show loading spinner
          var loader = document.getElementById('gallery-loading');
          if (loader) loader.classList.add('gallery-loading--active');

          // Simulated loading timeout for smooth UX transition
          setTimeout(function() {
            var prevEnd = currentPage * videosPerPage;  // end index of old page
            currentPage++;
            var newEnd = currentPage * videosPerPage;

            // Append only the NEW cards (not all visible cards)
            var newSlice = allFilteredResults.slice(prevEnd, newEnd);
            App.ui.appendToVideoGrid('gallery-grid', newSlice);

            // Hide loading spinner
            if (loader) loader.classList.remove('gallery-loading--active');

            isLoadingMore = false;
            scrollTicking = false;
          }, 1200); // 1200ms artificial loading time to make the animation more noticeable
        } else {
          scrollTicking = false;
        }
      } else {
        scrollTicking = false;
      }
    });
  }

  return {
    init: init
  };
})();


