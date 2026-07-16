/* ============================================================
   Pagination — Infinite-scroll state machine.
   Manages the scroll listener, loading flag, and page counter
   so page modules don't duplicate throttling / lifecycle logic.
   ============================================================ */
App.pagination = (function() {
  'use strict';

  var _page = 1;
  var _pageSize = 20;
  var _loading = false;
  var _onLoadMore = null;
  var _threshold = 400;   // px from bottom to trigger
  var _delayMs = 1200;    // artificial delay for local pagination
  var _ticking = false;
  var _bound = false;

  /* ---- Init / Destroy ---- */

  /**
   * Start the infinite-scroll listener.
   * @param {object} opts — { onLoadMore, pageSize, threshold, delayMs }
   */
  function init(opts) {
    opts = opts || {};
    _onLoadMore = opts.onLoadMore || null;
    _pageSize   = opts.pageSize   || 20;
    _threshold  = opts.threshold  || 400;
    _delayMs    = opts.delayMs    || 1200;

    if (!_bound) {
      window.addEventListener('scroll', _handleScroll, { passive: true });
      _bound = true;
    }
  }

  /**
   * Remove the scroll listener and reset state.
   */
  function destroy() {
    if (_bound) {
      window.removeEventListener('scroll', _handleScroll);
      _bound = false;
    }
    _page = 1;
    _loading = false;
    _ticking = false;
    _onLoadMore = null;
  }

  /* ---- State queries ---- */

  function isLoading() {
    return _loading;
  }

  function setLoading(val) {
    _loading = !!val;
    if (!val) _ticking = false;  // release throttle on load complete
  }

  function getPage() {
    return _page;
  }

  function advancePage() {
    _page++;
  }

  function reset() {
    _page = 1;
    _loading = false;
    _ticking = false;
  }

  function getPageSize() {
    return _pageSize;
  }

  function getDelayMs() {
    return _delayMs;
  }

  /**
   * Check whether there are more items to load (for local array pagination).
   * @param {number} total — Total items in the full result set
   * @returns {boolean}
   */
  function hasMoreLocal(total) {
    return _page * _pageSize < total;
  }

  /* ---- Internal scroll handler ---- */

  function _handleScroll() {
    if (_ticking || _loading) return;
    _ticking = true;

    requestAnimationFrame(function() {
      if (_loading) { _ticking = false; return; }

      var nearBottom = (window.innerHeight + window.scrollY) >=
                       document.documentElement.scrollHeight - _threshold;
      if (!nearBottom) { _ticking = false; return; }

      if (typeof _onLoadMore === 'function') {
        _onLoadMore();
      }
      _ticking = false;  // released when onLoadMore calls setLoading(false)
    });
  }

  return {
    init: init,
    destroy: destroy,
    isLoading: isLoading,
    setLoading: setLoading,
    getPage: getPage,
    advancePage: advancePage,
    reset: reset,
    getPageSize: getPageSize,
    getDelayMs: getDelayMs,
    hasMoreLocal: hasMoreLocal
  };
})();
