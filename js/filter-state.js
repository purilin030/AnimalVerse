/* ============================================================
   Filter State — Shared filter values with URL-param sync
   and session persistence.  Used by gallery.js and search.js
   so filter state survives full-page navigations.
   ============================================================ */
App.filterState = (function() {
  'use strict';

  var DEFAULTS = { category: 'all', tag: null, sort: 'newest', query: '' };
  var _state = {};
  var _listeners = [];

  // ── Init from URL params ─────────────────────────────────

  function initFromUrl() {
    var params = App.router.getQueryParams();
    var saved = App.session.get('filterState');

    // URL params take priority over session, session over defaults
    _state = {
      category: params.category || (saved ? saved.category : null) || DEFAULTS.category,
      tag:      params.tag      || (saved ? saved.tag      : null) || DEFAULTS.tag,
      sort:     params.sort     || (saved ? saved.sort     : null) || DEFAULTS.sort,
      query:    params.q        || (saved ? saved.query    : null) || DEFAULTS.query
    };
  }

  /* ---- Getters ---- */

  function get(key) {
    return _state[key];
  }

  function getAll() {
    return {
      category: _state.category,
      tag: _state.tag,
      sort: _state.sort,
      query: _state.query
    };
  }

  /* ---- Setters ---- */

  function set(key, value) {
    _state[key] = value;
    _persist();
    _notify({ key: key, value: value, state: getAll() });
  }

  function setAll(obj) {
    if (obj.category !== undefined) _state.category = obj.category;
    if (obj.tag      !== undefined) _state.tag      = obj.tag;
    if (obj.sort     !== undefined) _state.sort     = obj.sort;
    if (obj.query    !== undefined) _state.query    = obj.query;
    _persist();
    _notify({ state: getAll() });
  }

  function reset() {
    _state = {
      category: DEFAULTS.category,
      tag: DEFAULTS.tag,
      sort: DEFAULTS.sort,
      query: DEFAULTS.query
    };
    _persist();
    _notify({ state: getAll() });
  }

  /* ---- Change listeners ---- */

  function onChange(fn) {
    _listeners.push(fn);
    // Return an unsubscribe function
    return function() {
      _listeners = _listeners.filter(function(f) { return f !== fn; });
    };
  }

  /* ---- Internal ---- */

  function _persist() {
    App.session.set('filterState', getAll());
  }

  function _notify(detail) {
    for (var i = 0; i < _listeners.length; i++) {
      _listeners[i](detail);
    }
  }

  return {
    initFromUrl: initFromUrl,
    get: get,
    getAll: getAll,
    set: set,
    setAll: setAll,
    reset: reset,
    onChange: onChange
  };
})();
