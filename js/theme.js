/* ============================================================
   Theme Toggle — Visual theme only (Dark/Light & YouTube variants)
   Data-source switching is handled by App.dataSource.
   ============================================================ */
App.theme = (function() {
  'use strict';

  var KEY = App.config.localStorageKeys.theme;

  // Transition timing constants (ms)
  var THEME_SWITCH_DELAY = 280;
  var MASK_FADE_START = 580;
  var MASK_FADE_DURATION = 400;

  /**
   * Check if a theme value is a YouTube variant.
   */
  function _isYoutubeTheme(theme) {
    return theme === 'youtube' || theme === 'youtube-dark';
  }

  /**
   * Get the current theme from the DOM attribute.
   */
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem(KEY) || 'light';
  }

  /**
   * Apply a visual theme and save preference.
   * @param {string} theme — 'light', 'dark', 'youtube', or 'youtube-dark'
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }

  /**
   * Toggle between light ↔ dark, or youtube ↔ youtube-dark.
   * Purely visual — no data-source logic.
   */
  function toggleTheme() {
    var current = getTheme();
    var next;
    if (current === 'youtube') {
      next = 'youtube-dark';
    } else if (current === 'youtube-dark') {
      next = 'youtube';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'light';
    }
    setTheme(next);
  }

  /**
   * Change theme with a spotlight circular wipe transition.
   * Used by dataSource.toggle() for the YouTube/library switch animation.
   * @param {string} nextTheme — The visual theme to transition to
   * @param {function} callback — Called after the theme switch midpoint
   * @param {Event} event — Optional click event for transition origin
   */
  function transitionTo(nextTheme, callback, event) {
    var supportsClipPath = document.documentElement.style.clipPath !== undefined ||
                           document.documentElement.style.webkitClipPath !== undefined;

    if (!supportsClipPath) {
      setTheme(nextTheme);
      if (callback) callback();
      return;
    }

    var mask = document.createElement('div');
    mask.className = 'theme-transition-mask';

    // Calculate origin coordinates
    var x = '50%';
    var y = '50%';
    if (event && event.clientX !== undefined && event.clientY !== undefined) {
      x = event.clientX + 'px';
      y = event.clientY + 'px';
    } else {
      var toggleBtn = document.getElementById('theme-toggle');
      var ytBtn = document.getElementById('youtube-mode-toggle');
      var activeBtn = _isYoutubeTheme(nextTheme) ? ytBtn : toggleBtn;
      if (activeBtn) {
        var rect = activeBtn.getBoundingClientRect();
        x = (rect.left + rect.width / 2) + 'px';
        y = (rect.top + rect.height / 2) + 'px';
      }
    }

    mask.style.setProperty('--click-x', x);
    mask.style.setProperty('--click-y', y);
    document.body.appendChild(mask);

    // Force reflow
    mask.offsetHeight;

    // Expand the mask
    mask.classList.add('active');

    // Switch theme midway through the wipe
    setTimeout(function() {
      setTheme(nextTheme);
      if (callback) callback();
    }, THEME_SWITCH_DELAY);

    // Fade out and remove mask
    setTimeout(function() {
      mask.classList.add('fade-out');
      setTimeout(function() {
        mask.remove();
      }, MASK_FADE_DURATION);
    }, MASK_FADE_START);
  }

  /**
   * Initialize theme — apply saved visual theme and bind toggle button.
   */
  function init() {
    // Apply saved visual theme.  dataSource.init() runs next in
    // app.js and will override if YouTube mode is active.
    var current = localStorage.getItem(KEY) || 'light';
    setTheme(current);

    // Bind light/dark toggle button
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  }

  return {
    init: init,
    toggle: toggleTheme,
    get: getTheme,
    set: setTheme,
    transitionTo: transitionTo
  };
})();
