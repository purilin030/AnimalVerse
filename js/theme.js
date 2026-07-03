/* ============================================================
   Theme Toggle (Dark/Light Mode)
   ============================================================ */
App.theme = (function() {
  'use strict';

  var KEY = App.config.localStorageKeys.theme;

  /**
   * Get the current/preferred theme
   */
  function getTheme() {
    return localStorage.getItem(KEY) || 'light';
  }

  /**
   * Apply a theme and save preference
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }

  /**
   * Toggle between light and dark
   */
  function toggleTheme() {
    var current = getTheme();
    var next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  /**
   * Initialize theme module
   */
  function init() {
    // Apply saved theme
    setTheme(getTheme());

    // Listen for toggle button clicks
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  }

  return {
    init: init,
    toggle: toggleTheme,
    get: getTheme,
    set: setTheme
  };
})();
