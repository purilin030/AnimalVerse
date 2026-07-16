/* ============================================================
   Data Source — Owns the library / YouTube data-source decision.
   Separated from App.theme so the visual theme system stays
   purely about colors, not about where data comes from.

   Modes:
     'library'       — local videos.json data
     'youtube'       — YouTube API (or static fallback if no API key)

   Syncs the visual theme as a side effect (YouTube mode uses
   the cherry orchard theme; library mode uses light/dark).
   ============================================================ */
App.dataSource = (function() {
  'use strict';

  var DS_KEY = 'animalverse_datasource';
  var OLD_YT_KEY = 'animalverse_youtube_mode';  // migrate from old key
  var _mode = 'library';

  /* ---- Mode queries ---- */

  function getMode() {
    return _mode;
  }

  function isYoutube() {
    return _mode === 'youtube';
  }

  /* ---- Set mode (persists + syncs visual theme) ---- */

  function setMode(mode) {
    if (mode !== 'library' && mode !== 'youtube') return;

    var oldMode = _mode;
    _mode = mode;
    try { localStorage.setItem(DS_KEY, mode); } catch (e) {}

    // Sync visual theme — YouTube mode uses cherry orchard palette
    if (mode === 'youtube') {
      var ytTheme = App.theme.get();
      if (ytTheme !== 'youtube' && ytTheme !== 'youtube-dark') {
        ytTheme = 'youtube';
      }
      App.theme.set(ytTheme);
      document.body.classList.add('theme-youtube');
      // Clear the old flag (migration — no longer needed)
      try { localStorage.removeItem(OLD_YT_KEY); } catch (e) {}
    } else {
      // Restore underlying light/dark preference
      var savedTheme = localStorage.getItem('animalverse_theme') || 'light';
      if (savedTheme === 'youtube' || savedTheme === 'youtube-dark') {
        savedTheme = 'light';
      }
      App.theme.set(savedTheme);
      document.body.classList.remove('theme-youtube');
    }

    // Announce the switch
    document.dispatchEvent(new CustomEvent('datasource:switch', {
      detail: { mode: mode, previousMode: oldMode }
    }));
  }

  /* ---- Toggle between library and youtube ---- */

  function toggle(clickEvent, callback) {
    var nextMode = (_mode === 'library') ? 'youtube' : 'library';

    // Determine visual theme to transition to
    var visualTheme;
    if (nextMode === 'youtube') {
      visualTheme = 'youtube';
    } else {
      visualTheme = localStorage.getItem('animalverse_theme') || 'light';
      if (visualTheme === 'youtube' || visualTheme === 'youtube-dark') {
        visualTheme = 'light';
      }
    }

    // Use the visual wipe transition from theme.js
    App.theme.transitionTo(visualTheme, function() {
      _mode = nextMode;
      try { localStorage.setItem(DS_KEY, nextMode); } catch (e) {}

      if (nextMode === 'youtube') {
        document.body.classList.add('theme-youtube');
        try { localStorage.removeItem(OLD_YT_KEY); } catch (e) {}
      } else {
        document.body.classList.remove('theme-youtube');
      }

      document.dispatchEvent(new CustomEvent('datasource:switch', {
        detail: { mode: nextMode }
      }));

      if (typeof callback === 'function') callback(nextMode);
    }, clickEvent);
  }

  /* ---- Init: restore mode on page load ---- */

  function init() {
    // Migration: old key → new key
    var savedMode;
    try {
      savedMode = localStorage.getItem(DS_KEY);
      if (!savedMode) {
        var oldFlag = localStorage.getItem(OLD_YT_KEY);
        if (oldFlag === 'true') {
          savedMode = 'youtube';
          localStorage.setItem(DS_KEY, 'youtube');
          localStorage.removeItem(OLD_YT_KEY);
        }
      }
    } catch (e) {
      savedMode = null;
    }
    _mode = savedMode || 'library';

    // YouTube mode is only meaningful on gallery / playback pages.
    // On other pages, silently revert to library so the theme doesn't get stuck.
    var path = window.location.pathname.toLowerCase();
    var isGalleryOrPlayback =
      path.indexOf('gallery.html') !== -1 ||
      path.indexOf('playback.html') !== -1;

    if (!isGalleryOrPlayback && _mode === 'youtube') {
      _mode = 'library';
      try { localStorage.setItem(DS_KEY, 'library'); } catch (e) {}
      document.body.classList.remove('theme-youtube');
    }

    // Sync visual theme
    if (_mode === 'youtube') {
      var ytTheme = localStorage.getItem('animalverse_theme');
      if (ytTheme !== 'youtube' && ytTheme !== 'youtube-dark') {
        ytTheme = 'youtube';
      }
      App.theme.set(ytTheme);
      document.body.classList.add('theme-youtube');
    }
    // If library mode, leave the visual theme alone (theme.init already applied it)
  }

  return {
    getMode: getMode,
    isYoutube: isYoutube,
    setMode: setMode,
    toggle: toggle,
    init: init
  };
})();
