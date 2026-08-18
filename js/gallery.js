/* ============================================================
   Gallery Page — Filtering, Sorting, Rendering
   Uses App.filterState (filter values + URL/session sync)
   and App.pagination (infinite-scroll state machine).

   View modes (per implementation plan):
   - default browse (no explicit sort)  → Masonry waterfall
   - Most Popular / Newest / Oldest     → Uniform 16:9 grid + rank badges #1..#N
   - A-Z                                → Alphabetical sections + quick-jump bar
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

  // A-Z mode state (for resize re-render)
  var _azMode = false;
  var _azVideos = null;
  var _azResizeTimer = null;

  // Keyword search debounce
  var _searchTimer = null;

  function init() {
    // Restore filter state from URL params + session storage
    App.filterState.initFromUrl();

    // Sync DOM filter pills to the restored state
    setActiveCategory(App.filterState.get('category'));
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = App.filterState.get('sort') || '';
      sortSelect.dispatchEvent(new Event('change-sync'));
    }

    // Sync keyword search box to the restored state
    var searchInput = document.getElementById('gallery-search-input');
    if (searchInput) {
      searchInput.value = App.filterState.get('query') || '';
      _updateSearchClear();
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

    // Keep the A-Z grouped layout intact on window resize
    window.addEventListener('resize', function() {
      clearTimeout(_azResizeTimer);
      _azResizeTimer = setTimeout(function() {
        if (_azMode && _azVideos) _renderAlphabetView(_azVideos);
      }, 200);
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

    // Keyword search box — debounced live filtering + Enter shortcut + clear
    var searchInput = document.getElementById('gallery-search-input');
    var searchClear = document.getElementById('gallery-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        _updateSearchClear();
        clearTimeout(_searchTimer);
        var value = this.value.trim();
        _searchTimer = setTimeout(function() {
          App.filterState.set('query', value);
          loadAndRender();
        }, 400);
      });
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          clearTimeout(_searchTimer);
          App.filterState.set('query', this.value.trim());
          loadAndRender();
        }
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', function() {
        if (searchInput) searchInput.value = '';
        _updateSearchClear();
        App.filterState.set('query', '');
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

  /**
   * Show the clear button only while there is text to clear.
   */
  function _updateSearchClear() {
    var searchInput = document.getElementById('gallery-search-input');
    var searchClear = document.getElementById('gallery-search-clear');
    if (!searchInput || !searchClear) return;
    searchClear.hidden = !searchInput.value;
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
      query: App.filterState.get('query'),
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

      _renderResults(allFilteredResults, false);
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
        query: App.filterState.get('query'),
        sort: App.filterState.get('sort')
      });

      var loader = document.getElementById('gallery-loading');
      if (loader) loader.classList.remove('gallery-loading--active');

      var countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = App.utils.pluralize(allFilteredResults.length, 'video');
      }

      if (App.filterState.get('sort') === 'az') {
        // A-Z renders the full set at once; infinite scroll is disabled below
        _renderResults(allFilteredResults, false);
      } else {
        var pageSize = App.pagination.getPageSize();
        var visible = allFilteredResults.slice(0, pageSize);
        _renderResults(visible, false);
      }
      if (typeof onComplete === 'function') onComplete();
    });
  }

  // ── Mode-aware rendering ────────────────────────────────────

  /**
   * Render options for the current sort mode:
   * ranked sort → uniform 16:9 grid with #1..#N rank badges;
   * default browse → plain masonry (no options).
   */
  function _getRenderOptions() {
    var sort = App.filterState.get('sort');
    if (sort === 'popular' || sort === 'newest' || sort === 'oldest') {
      return { uniform: true, ranked: true, sortMode: sort };
    }
    return {};
  }

  function _getSortLabel(sort) {
    if (sort === 'az') return { icon: '🔤', text: 'Grouped Alphabetically (A to Z)' };
    if (sort === 'popular') return { icon: '🔥', text: 'Sorted by Views: High to Low' };
    if (sort === 'newest') return { icon: '📅', text: 'Sorted by Date: Newest First' };
    if (sort === 'oldest') return { icon: '⏳', text: 'Sorted by Date: Oldest First' };
    return { icon: '🌿', text: 'Curated Discovery Order' };
  }

  function _loadedCount() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return 0;
    return grid.querySelectorAll('.video-card').length;
  }

  /**
   * Central render entry — dispatches to the alphabet view, the uniform
   * ranked grid, or the masonry layout depending on the current sort mode.
   */
  function _renderResults(videos, append) {
    var sort = App.filterState.get('sort');
    var grid = document.getElementById('gallery-grid');

    if (sort === 'az') {
      _azMode = true;
      if (grid) grid.classList.add('gallery-grid--az');
      if (!append) _renderAlphabetView(videos);
      _renderToolbar();
      return;
    }

    _azMode = false;
    if (grid) grid.classList.remove('gallery-grid--az');
    if (append) {
      // Append reuses the stored render options (keeps rank numbering running)
      App.ui.appendToVideoGrid('gallery-grid', videos);
    } else {
      App.ui.renderVideoGrid('gallery-grid', videos, _getRenderOptions());
    }
    _renderToolbar(_loadedCount());
  }

  /**
   * Sort status bar + (in A-Z mode) the alphabet quick-jump bar.
   * Rendered into the #gallery-toolbar container below the filters.
   */
  function _renderToolbar(loadedCount) {
    var toolbar = document.getElementById('gallery-toolbar');
    if (!toolbar) return;
    toolbar.textContent = '';

    var sort = App.filterState.get('sort');
    var label = _getSortLabel(sort);

    var bar = document.createElement('div');
    bar.className = 'gallery-sort-status';
    bar.id = 'gallery-sort-status';
    var total = allFilteredResults.length;
    var range = (loadedCount && loadedCount < total) ? ' (1 - ' + loadedCount + ')' : '';
    bar.textContent = label.icon + ' ' + label.text + range;
    toolbar.appendChild(bar);

    if (sort === 'az') {
      var nav = _buildAlphabetNav(_getActiveLetters());
      if (nav) toolbar.appendChild(nav);
    }
  }

  // ── A-Z Alphabetical Sections & Quick-Jump Nav ──────────────

  /**
   * Animal name for grouping: library videos carry the species slug in their
   * ID (video-<slug>-NNN), so the SAME species always lands under one letter
   * even though titles differ ("Fascinating Behavior of Axolotl" → A).
   */
  function _getAnimalName(video) {
    if (video.id && video.id.indexOf('video-') === 0) {
      var parts = video.id.split('-');
      if (parts.length >= 3) {
        return parts.slice(1, parts.length - 1).join(' ');
      }
    }
    var extracted = App.utils.extractAnimalName(video.title);
    if (extracted) return extracted;
    return video.title || '';
  }

  function _firstLetter(video) {
    var name = _getAnimalName(video).trim();
    return name.charAt(0).toUpperCase();
  }

  function _getActiveLetters() {
    var seen = {};
    for (var i = 0; i < allFilteredResults.length; i++) {
      var letter = _firstLetter(allFilteredResults[i]);
      if (letter && /^[A-Z]$/.test(letter)) seen[letter] = true;
    }
    return Object.keys(seen).sort();
  }

  function _renderAlphabetView(videos) {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;

    _azVideos = videos;
    grid.classList.remove('video-grid--uniform');
    grid.classList.add('gallery-grid--az');
    grid.textContent = '';

    if (!videos || videos.length === 0) {
      App.ui.renderEmptyState(grid, { text: 'No videos found.' });
      return;
    }

    // Sort by animal name (then title) so the A→Z flow follows species
    var sorted = videos.slice().sort(function(a, b) {
      var na = _getAnimalName(a).toLowerCase();
      var nb = _getAnimalName(b).toLowerCase();
      if (na === nb) return (a.title || '').localeCompare(b.title || '');
      return na.localeCompare(nb);
    });

    // Group by first letter
    var groups = {};
    for (var i = 0; i < sorted.length; i++) {
      var letter = _firstLetter(sorted[i]);
      if (!/^[A-Z]$/.test(letter)) letter = '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(sorted[i]);
    }

    var letters = Object.keys(groups).sort();
    for (var li = 0; li < letters.length; li++) {
      var L = letters[li];
      var groupVideos = groups[L];

      var section = document.createElement('section');
      section.className = 'gallery-az-group';
      section.id = 'az-group-' + L;
      section.setAttribute('aria-label', 'Videos starting with ' + L);

      // Section header — big pixel letter + species count + divider
      var header = document.createElement('div');
      header.className = 'gallery-az-group__header';
      var badge = document.createElement('span');
      badge.className = 'gallery-az-group__badge';
      badge.textContent = L;
      header.appendChild(badge);
      var count = document.createElement('span');
      count.className = 'gallery-az-group__count';
      count.textContent = App.utils.pluralize(groupVideos.length, 'video');
      header.appendChild(count);
      var line = document.createElement('div');
      line.className = 'gallery-az-group__line';
      header.appendChild(line);
      section.appendChild(header);

      // Uniform sub-grid — strict left-to-right reading order
      var subgrid = document.createElement('div');
      subgrid.className = 'video-grid video-grid--uniform';
      subgrid.id = 'az-subgrid-' + L;
      for (var k = 0; k < groupVideos.length; k++) {
        var card = App.ui.createVideoCard(groupVideos[k], {
          uniform: true,
          sortMode: 'az'
        });
        if (card) subgrid.appendChild(card);
      }
      section.appendChild(subgrid);
      grid.appendChild(section);

      App.ui.attachFavoriteListeners(subgrid);
    }
  }

  /**
   * Build the sticky A-Z quick-jump bar. Letters without videos are disabled;
   * clicking a live letter smooth-scrolls to its section.
   */
  function _buildAlphabetNav(activeLetters) {
    var nav = document.createElement('nav');
    nav.className = 'gallery-az-nav';
    nav.id = 'gallery-az-nav';
    nav.setAttribute('aria-label', 'Alphabet quick jump navigation');

    var list = document.createElement('div');
    list.className = 'gallery-az-nav__list';

    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var activeSet = {};
    for (var i = 0; i < activeLetters.length; i++) {
      activeSet[activeLetters[i]] = true;
    }

    for (var a = 0; a < alphabet.length; a++) {
      var char = alphabet[a];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-az-nav__btn';
      btn.textContent = char;
      btn.setAttribute('data-letter', char);

      if (activeSet[char]) {
        btn.classList.add('gallery-az-nav__btn--active');
        btn.addEventListener('click', (function(targetLetter) {
          return function(e) {
            e.preventDefault();
            var targetEl = document.getElementById('az-group-' + targetLetter);
            if (targetEl) {
              var headerOffset = 90;
              var elementPosition = targetEl.getBoundingClientRect().top;
              var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          };
        })(char));
      } else {
        btn.classList.add('gallery-az-nav__btn--disabled');
        btn.disabled = true;
      }

      list.appendChild(btn);
    }

    nav.appendChild(list);
    return nav;
  }

  // ── Infinite Scroll (delegated to App.pagination) ──────────

  /**
   * Called by App.pagination when the user scrolls near the bottom.
   * Dispatches to YouTube API or local pagination.
   */
  function _onScrollReachBottom() {
    // In A-Z mode all grouped results are rendered at once with the jump nav
    if (App.filterState.get('sort') === 'az') return;

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
      query: App.filterState.get('query'),
      sort: App.filterState.get('sort'),
      maxResults: App.pagination.getPageSize()
    }).then(function(result) {
      var newVideos = result.videos || [];
      _ytNextPageToken = result.nextPageToken;
      _ytHasMore = result.hasMore;

      allFilteredResults = allFilteredResults.concat(newVideos);

      if (newVideos.length > 0) {
        _renderResults(newVideos, true);
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
      _renderResults(newSlice, true);

      if (loader) loader.classList.remove('gallery-loading--active');
      App.pagination.setLoading(false);
    }, App.pagination.getDelayMs());
  }

  return {
    init: init
  };
})();
