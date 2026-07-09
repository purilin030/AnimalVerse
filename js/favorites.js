/* ============================================================
   Favorites & Watch Later (localStorage)
   ============================================================ */
App.favorites = (function() {
  'use strict';

  var FAV_KEY = App.config.localStorageKeys.favorites;
  var WL_KEY = App.config.localStorageKeys.watchLater;
  var LIKES_KEY = App.config.localStorageKeys.likes;

  /**
   * Safely read from localStorage with fallback
   */
  function safeGet(key) {
    try {
      var stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('localStorage read failed for', key, e);
      return [];
    }
  }

  /**
   * Safely write to localStorage
   */
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed for', key, e);
    }
  }

  /**
   * Generic toggle helper — adds videoId to the list if absent, removes it if present.
   * Returns true if added, false if removed.
   * Used by toggleFavorite, toggleWatchLater, toggleLike.
   */
  function _toggleList(key, videoId) {
    var list = safeGet(key);
    var idx = list.indexOf(videoId);
    if (idx === -1) {
      list.push(videoId);
    } else {
      list.splice(idx, 1);
    }
    safeSet(key, list);
    return idx === -1; // true = added, false = removed
  }

  /* ---- Favorites ---- */

  function getFavorites() { return safeGet(FAV_KEY); }

  function toggleFavorite(videoId) { return _toggleList(FAV_KEY, videoId); }

  function isFavorite(videoId) { return getFavorites().indexOf(videoId) !== -1; }

  /* ---- Watch Later ---- */

  function getWatchLater() { return safeGet(WL_KEY); }

  function toggleWatchLater(videoId) { return _toggleList(WL_KEY, videoId); }

  function isWatchLater(videoId) { return getWatchLater().indexOf(videoId) !== -1; }

  /* ---- Likes ---- */

  function getLikes() { return safeGet(LIKES_KEY); }

  function toggleLike(videoId) { return _toggleList(LIKES_KEY, videoId); }

  function isLiked(videoId) { return getLikes().indexOf(videoId) !== -1; }


  return {
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    getWatchLater: getWatchLater,
    toggleWatchLater: toggleWatchLater,
    isWatchLater: isWatchLater,
    getLikes: getLikes,
    toggleLike: toggleLike,
    isLiked: isLiked
  };
})();
