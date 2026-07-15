/* ============================================================
   Theme Toggle (Dark/Light/Youtube Mode)
   ============================================================ */
App.theme = (function() {
  'use strict';

  var KEY = App.config.localStorageKeys.theme;
  var YT_KEY = App.config.localStorageKeys.youtubeMode;
  var _savedTheme = null;

  /**
   * Get the current/preferred theme
   */
  function getTheme() {
    return localStorage.getItem(KEY) || 'light';
  }

  /**
   * Check if a theme value is a YouTube mode variant
   */
  function _isYoutubeTheme(theme) {
    return theme === 'youtube' || theme === 'youtube-dark';
  }

  /**
   * Apply a theme and save preference
   * @param {string} theme - 'light', 'dark', 'youtube', or 'youtube-dark'
   */
  function setTheme(theme) {
    if (_isYoutubeTheme(theme)) {
      // Save current light/dark theme before switching to YouTube
      _savedTheme = getTheme();
      // Only save as YouTube mode if not already in it
      if (!_isYoutubeTheme(_savedTheme)) {
        localStorage.setItem(YT_KEY, 'true');
      }
    } else {
      // Exiting YouTube mode — clear flag
      localStorage.removeItem(YT_KEY);
      _savedTheme = null;
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }

  /**
   * Check if currently in YouTube theme mode
   */
  function isYoutubeMode() {
    var theme = document.documentElement.getAttribute('data-theme');
    return _isYoutubeTheme(theme);
  }

  /**
   * Enable YouTube mode: saves current theme and switches to red/white theme
   */
  function enableYoutubeMode() {
    if (isYoutubeMode()) return;
    _savedTheme = getTheme();
    setTheme('youtube');

    // Also toggle body class for any CSS that targets it
    document.body.classList.add('theme-youtube');
  }

  /**
   * Disable YouTube mode: restores the previously saved theme
   */
  function disableYoutubeMode() {
    if (!isYoutubeMode()) return;
    var restoreTheme = _savedTheme || 'light';
    _savedTheme = null;
    localStorage.removeItem(YT_KEY);
    document.documentElement.setAttribute('data-theme', restoreTheme);
    localStorage.setItem(KEY, restoreTheme);
    document.body.classList.remove('theme-youtube');
  }

  /**
   * Helper to change theme with a visual spotlight circular wipe transition
   */
  function changeThemeWithTransition(nextTheme, callback, event) {
    // Check clip-path support
    var supportsClipPath = document.documentElement.style.clipPath !== undefined ||
                           document.documentElement.style.webkitClipPath !== undefined;

    if (!supportsClipPath) {
      setTheme(nextTheme);
      if (callback) callback();
      return;
    }

    var mask = document.createElement('div');
    mask.className = 'theme-transition-mask';

    // Calculate click coordinates or fallback to triggering button coordinates
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

    // Expand the mask (wipe screen)
    mask.classList.add('active');

    // Change theme midway (after 280ms)
    setTimeout(function() {
      setTheme(nextTheme);
      if (callback) callback();
    }, 280);

    // Fade out and remove mask
    setTimeout(function() {
      mask.classList.add('fade-out');
      setTimeout(function() {
        mask.remove();
      }, 400);
    }, 580);
  }

  /**
   * Toggle YouTube mode on/off with visual transition
   * @param {function} [callback] - Function called when transition changes theme
   * @param {Event} [event] - Optional click event for coordinates
   * @returns {boolean} Whether YouTube mode is now active (predicted)
   */
  function toggleYoutubeMode(callback, event) {
    var nowActive = !isYoutubeMode();
    var currentTheme = getTheme();
    var nextTheme = nowActive ? 'youtube' : (_savedTheme || 'light');

    changeThemeWithTransition(nextTheme, function() {
      if (nowActive) {
        _savedTheme = _isYoutubeTheme(currentTheme) ? currentTheme : 'light';
        localStorage.setItem(YT_KEY, 'true');
        document.body.classList.add('theme-youtube');
      } else {
        _savedTheme = null;
        localStorage.removeItem(YT_KEY);
        document.body.classList.remove('theme-youtube');
      }
      if (callback) callback(nowActive);
    }, event);

    return nowActive;
  }

  /**
   * Toggle between light and dark instantly (also works inside YouTube mode)
   */
  function toggleTheme() {
    var current = getTheme();
    var next;

    if (current === 'youtube') {
      // YouTube light → YouTube dark
      next = 'youtube-dark';
    } else if (current === 'youtube-dark') {
      // YouTube dark → YouTube light
      next = 'youtube';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'light';
    }

    setTheme(next);
  }

  /**
   * Initialize theme module
   */
  function init() {
    var path = window.location.pathname.toLowerCase();
    var isGallery = path.indexOf('gallery.html') !== -1;
    var isPlayback = path.indexOf('playback.html') !== -1;

    // Check if YouTube mode was active from localStorage
    var wasYoutubeMode = localStorage.getItem(YT_KEY) === 'true';
    if (wasYoutubeMode && (isGallery || isPlayback)) {
      // Load saved theme as the underlying preference
      var storedTheme = localStorage.getItem(KEY) || 'light';
      _savedTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'light';
      // Restore the exact YouTube variant (youtube or youtube-dark)
      var ytTheme = storedTheme === 'youtube-dark' ? 'youtube-dark' : 'youtube';
      document.documentElement.setAttribute('data-theme', ytTheme);
      document.body.classList.add('theme-youtube');
      localStorage.setItem(KEY, ytTheme);
    } else {
      // Exit YouTube mode and clean up
      localStorage.removeItem(YT_KEY);
      document.body.classList.remove('theme-youtube');

      var current = localStorage.getItem(KEY) || 'light';
      if (_isYoutubeTheme(current)) {
        current = 'light'; // Fallback to light if it got stuck on youtube
      }
      setTheme(current);
    }

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
    set: setTheme,
    isYoutubeMode: isYoutubeMode,
    enableYoutubeMode: enableYoutubeMode,
    disableYoutubeMode: disableYoutubeMode,
    toggleYoutubeMode: toggleYoutubeMode
  };
})();
