/* ============================================================
   Favorites & Watch Later (localStorage)
   ============================================================ */
App.favorites = (function() {
  'use strict';

  var FAV_KEY = App.config.localStorageKeys.favorites;
  var WL_KEY = App.config.localStorageKeys.watchLater;

  /* ---- Favorites ---- */

  function getFavorites() {
    var stored = localStorage.getItem(FAV_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  function setFavorites(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
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
    var stored = localStorage.getItem(WL_KEY);
    return stored ? JSON.parse(stored) : [];
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

  return {
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    getWatchLater: getWatchLater,
    toggleWatchLater: toggleWatchLater,
    isWatchLater: isWatchLater
  };
})();
