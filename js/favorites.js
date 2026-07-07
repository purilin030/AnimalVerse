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

  /* ---- Favorites ---- */

  function getFavorites() {
    return safeGet(FAV_KEY);
  }

  function setFavorites(list) {
    safeSet(FAV_KEY, list);
  }

  function toggleFavorite(videoId) {
    var list = getFavorites();
    var idx = list.indexOf(videoId);
    if (idx === -1) {
      list.push(videoId);
      return true; // added
    } else {
      list.splice(idx, 1);
      return false; // removed
    }
  }

  function isFavorite(videoId) {
    return getFavorites().indexOf(videoId) !== -1;
  }

  /* ---- Watch Later ---- */

  function getWatchLater() {
    return safeGet(WL_KEY);
  }

  function toggleWatchLater(videoId) {
    var list = getWatchLater();
    var idx = list.indexOf(videoId);
    if (idx === -1) {
      list.push(videoId);
      return true;
    } else {
      list.splice(idx, 1);
      return false;
    }
  }

  function isWatchLater(videoId) {
    return getWatchLater().indexOf(videoId) !== -1;
  }

  /* ---- Likes ---- */

  function getLikes() {
    return safeGet(LIKES_KEY);
  }

  function toggleLike(videoId) {
    var list = getLikes();
    var idx = list.indexOf(videoId);
    if (idx === -1) {
      list.push(videoId);
      safeSet(LIKES_KEY, list);
      return true;
    } else {
      list.splice(idx, 1);
      safeSet(LIKES_KEY, list);
      return false;
    }
  }

  function isLiked(videoId) {
    return getLikes().indexOf(videoId) !== -1;
  }

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
