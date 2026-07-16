/* ============================================================
   Gallery Page — Filtering, Sorting, Rendering
   Uses App.filterState (filter values + URL/session sync)
   and App.pagination (infinite-scroll state machine).
   ============================================================ */
App.gallery = (function() {
  'use strict';

  var allFilteredResults = [];

  // YouTube mode state (gallery-specific DOM logic)
  var _ytToggleBtn = null;
  var _ytNextPageToken = null;
  var _ytHasMore = false;
  var _ytLoading = false;
  var _ytFromApi = false;

  function init() {
    // Restore filter state from URL params + session storage
    App.filterState.initFromUrl();

    // Sync DOM filter pills to the restored state
    setActiveCategory(App.filterState.get('category'));
    setActiveTag(App.filterState.get('tag'));
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = App.filterState.get('sort');
      sortSelect.dispatchEvent(new Event('change-sync'));
    }

    // Bind filters and sorting events
    bindFilters();

    // Start infinite-scroll listener (delegates to this module's loadMore)
    App.pagination.init({
      onLoadMore: _onScrollReachBottom,
      pageSize: 20,
      threshold: 400,
      delayMs: 1200
    });

    // Create YouTube mode toggle button
    renderYoutubeToggleBtn();

    // Load data and run initial render
    loadAndRender();
  }

  // ── YouTube Mode Toggle ─────────────────────────────────────

  function renderYoutubeToggleBtn() {
    if (document.querySelector('.youtube-toggle-btn')) return;

    _ytToggleBtn = document.createElement('button');
    _ytToggleBtn.className = 'youtube-toggle-btn';
    _ytToggleBtn.id = 'youtube-mode-toggle';
    _ytToggleBtn.setAttribute('role', 'switch');
    _ytToggleBtn.setAttribute('aria-label', 'Switch to YouTube mode');
    _ytToggleBtn.setAttribute('aria-pressed', 'false');

    updateButtonState();

    _ytToggleBtn.addEventListener('click', function(event) {
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      App.dataSource.toggle(event, function(mode) {
        var nowActive = mode === 'youtube';
        updateButtonState();
        updateTitles(nowActive);

        loadAndRender(function() {
          window.scrollTo(scrollX, scrollY);
        });

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

  function updateButtonState() {
    if (!_ytToggleBtn) {
      _ytToggleBtn = document.querySelector('.youtube-toggle-btn');
      if (!_ytToggleBtn) return;
    }
    var isYt = App.dataSource.isYoutube();
    _ytToggleBtn.textContent = isYt ? '🎬 LIB MODE' : '📺 YT MODE';
    _ytToggleBtn.setAttribute('aria-pressed', isYt ? 'true' : 'false');
    _ytToggleBtn.setAttribute('aria-label', isYt ? 'Switch to Library mode' : 'Switch to YouTube mode');
  }

  function updateTitles(isYoutube) {
    var heading = document.querySelector('.gallery-page__title, .page-hero__title, h1');
    if (heading) {
      heading.textContent = isYoutube ? 'YouTube Wildlife' : 'Discovery Gallery';
    }
    var subheading = document.querySelector('.gallery-page__subtitle, .page-hero__subtitle, .section__subtitle');
    if (subheading) {
      subheading.textContent = isYoutube ? 'YOUTUBE TRANSMISSION' : 'EXPLORE THE WILD';
    }
  }

  // ── Filter bindings ────────────────────────────────────────

  function bindFilters() {
    // Category pills
    var pills = document.querySelectorAll('#category-filters .filter-pill');
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function() {
        App.filterState.set('category', this.getAttribute('data-category'));
        setActiveCategory(App.filterState.get('category'));
        loadAndRender();
      });
    }

    // Tag chips
    var chips = document.querySelectorAll('#tag-filters .tag-chip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].addEventListener('click', function() {
        var tag = this.getAttribute('data-tag');
        if (App.filterState.get('tag') === tag) {
          App.filterState.set('tag', null);
          this.classList.remove('tag-chip--active');
        } else {
          for (var k = 0; k < chips.length; k++) {
            chips[k].classList.remove('tag-chip--active');
          }
          App.filterState.set('tag', tag);
          this.classList.add('tag-chip--active');
        }
        loadAndRender();
      });
    }

    // Sort select
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function() {
        App.filterState.set('sort', this.value);
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

  // ── Load & Render ──────────────────────────────────────────

  function loadAndRender(onComplete) {
    App.pagination.reset();
    if (App.dataSource.isYoutube()) {
      _loadYoutubeMode(onComplete);
    } else {
      _loadLibraryMode(onComplete);
    }
  }

  function _loadYoutubeMode(onComplete) {
    _ytLoading = true;
    _ytFromApi = App.data.isYoutubeApiEnabled();
    App.data.resetYoutubePagination(App.filterState.get('category'), App.filterState.get('tag'));

    var loader = document.getElementById('gallery-loading');
    if (loader) loader.classList.add('gallery-loading--active');

    var cat = App.filterState.get('category');
    var tag = App.filterState.get('tag');

    App.data.searchYoutubeVideos({
      category: cat,
      tag: tag,
      sort: App.filterState.get('sort'),
      maxResults: App.pagination.getPageSize()
    }, null).then(function(result) {
      _ytLoading = false;
      _ytNextPageToken = result.nextPageToken;
      _ytHasMore = result.hasMore;
      allFilteredResults = result.videos || [];

      if (loader) loader.classList.remove('gallery-loading--active');

      var countEl = document.getElementById('results-count');
      if (countEl) {
        var total = result._fromFallback ? allFilteredResults.length : (result.totalResults || allFilteredResults.length);
        countEl.textContent = App.utils.pluralize(total, 'video') + (_ytHasMore ? '+' : '');
      }

      App.ui.renderVideoGrid('gallery-grid', allFilteredResults);
      if (typeof onComplete === 'function') onComplete();
    }).catch(function() {
      _ytLoading = false;
      if (loader) loader.classList.remove('gallery-loading--active');
      var grid = document.getElementById('gallery-grid');
      if (grid) App.ui.renderEmptyState(grid, { text: 'Failed to load YouTube videos.', icon: '?' });
      allFilteredResults = [];
      if (typeof onComplete === 'function') onComplete();
    });
  }

  function _loadLibraryMode(onComplete) {
    var cat = App.filterState.get('category');
    var tag = App.filterState.get('tag');

    App.data.loadVideos().then(function() {
      allFilteredResults = App.data.filterVideos({
        category: cat,
        tag: tag,
        sort: App.filterState.get('sort')
      });

      var loader = document.getElementById('gallery-loading');
      if (loader) loader.classList.remove('gallery-loading--active');

      var countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = App.utils.pluralize(allFilteredResults.length, 'video');
      }

      var pageSize = App.pagination.getPageSize();
      var visible = allFilteredResults.slice(0, pageSize);
      App.ui.renderVideoGrid('gallery-grid', visible);
      if (typeof onComplete === 'function') onComplete();
    });
  }

  // ── Infinite Scroll (delegated to App.pagination) ──────────

  /**
   * Called by App.pagination when the user scrolls near the bottom.
   * Dispatches to YouTube API or local pagination.
   */
  function _onScrollReachBottom() {
    // YouTube API dynamic pagination
    if (App.dataSource.isYoutube() && _ytFromApi && _ytHasMore) {
      _loadNextYoutubeApiPage();
      return;
    }

    // Local pagination (Library mode + YouTube static fallback)
    if (App.pagination.hasMoreLocal(allFilteredResults.length)) {
      _loadNextLocalPage();
    }
  }

  function _loadNextYoutubeApiPage() {
    _ytLoading = true;
    App.pagination.setLoading(true);

    var loader = document.getElementById('gallery-loading');
    if (loader) loader.classList.add('gallery-loading--active');

    App.data.nextYoutubePage({
      category: App.filterState.get('category'),
      tag: App.filterState.get('tag'),
      sort: App.filterState.get('sort'),
      maxResults: App.pagination.getPageSize()
    }).then(function(result) {
      var newVideos = result.videos || [];
      _ytNextPageToken = result.nextPageToken;
      _ytHasMore = result.hasMore;

      allFilteredResults = allFilteredResults.concat(newVideos);

      if (newVideos.length > 0) {
        App.ui.appendToVideoGrid('gallery-grid', newVideos);
      }

      var countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = App.utils.pluralize(allFilteredResults.length, 'video') + (_ytHasMore ? '+' : '');
      }

      if (loader) loader.classList.remove('gallery-loading--active');
      _ytLoading = false;
      App.pagination.setLoading(false);
    }).catch(function() {
      if (loader) loader.classList.remove('gallery-loading--active');
      _ytLoading = false;
      App.pagination.setLoading(false);
    });
  }

  function _loadNextLocalPage() {
    App.pagination.setLoading(true);

    var loader = document.getElementById('gallery-loading');
    if (loader) loader.classList.add('gallery-loading--active');

    setTimeout(function() {
      var pageSize = App.pagination.getPageSize();
      var prevEnd = App.pagination.getPage() * pageSize;
      App.pagination.advancePage();
      var newEnd = App.pagination.getPage() * pageSize;

      var newSlice = allFilteredResults.slice(prevEnd, newEnd);
      App.ui.appendToVideoGrid('gallery-grid', newSlice);

      if (loader) loader.classList.remove('gallery-loading--active');
      App.pagination.setLoading(false);
    }, App.pagination.getDelayMs());
  }

  return {
    init: init
  };
})();
