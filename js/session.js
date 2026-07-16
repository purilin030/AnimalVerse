/* ============================================================
   Session — Cross-page state that survives full-page navigations.
   Thin wrapper over sessionStorage with a namespaced key prefix.

   Use cases (current + FYP2):
     - Gallery → Playback → back to Gallery: restore filter state
     - Search query preserved when navigating to playback
     - FYP2: login token, user preferences, Bedrock session
     - Scroll position restore on gallery

   Keys are auto-prefixed with 'av_' to avoid collisions.
   ============================================================ */
App.session = (function() {
  'use strict';

  var PREFIX = 'av_';

  /**
   * Store a value (automatically JSON-stringified).
   */
  function set(key, value) {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // sessionStorage full or unavailable — silent no-op
    }
  }

  /**
   * Retrieve a value (automatically JSON-parsed).
   * @returns {*} The stored value, or defaultValue if not found.
   */
  function get(key, defaultValue) {
    try {
      var raw = sessionStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue !== undefined ? defaultValue : null;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  /**
   * Remove a single key.
   */
  function remove(key) {
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch (e) {}
  }

  /**
   * Clear ALL AnimalVerse session keys (on sign-out or reset).
   */
  function clearAll() {
    try {
      var keysToRemove = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) {
          keysToRemove.push(k);
        }
      }
      for (var j = 0; j < keysToRemove.length; j++) {
        sessionStorage.removeItem(keysToRemove[j]);
      }
    } catch (e) {}
  }

  /**
   * Check if a key exists.
   */
  function has(key) {
    try {
      return sessionStorage.getItem(PREFIX + key) !== null;
    } catch (e) {
      return false;
    }
  }

  return {
    set: set,
    get: get,
    remove: remove,
    clear: clearAll,
    has: has
  };
})();
