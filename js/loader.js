/* ============================================================
   Loader — Module dependency graph and verification.
   Add this script ONCE, right after config.js, on every page.
   app.js calls App.deps.verify() before dispatch — if any
   module is missing its dependencies, a red error banner
   appears at the top of the page with the exact fix.

   This is the single source of truth for script load order.
   Adding a new module: add its entry here, then add the
   <script> tag to the pages that need it.
   ============================================================ */
(function() {
  'use strict';

  /* ==========================================================
     DEPENDENCY MAP — one entry per module.
     { deps: [...], file: '...' }
     Adding a new module?  Add its entry here first.
     ========================================================== */
  var MODULES = {

    // ── Core (loaded on every page) ─────────────────────────
    'App.config':       { deps: [],                           file: 'js/config.js' },
    'App.speciesMap':   { deps: [],                           file: 'js/species-map.js' },
    'App.utils':        { deps: ['App.speciesMap'],           file: 'js/utils.js' },
    'App.youtubeApi':   { deps: ['App.config'],               file: 'js/youtube-api.js' },
    'App.data':         { deps: ['App.config','App.speciesMap','App.utils','App.youtubeApi'], file: 'js/data.js' },
    'App.router':       { deps: [],                           file: 'js/router.js' },
    'App.session':      { deps: [],                           file: 'js/session.js' },
    'App.theme':        { deps: ['App.config'],               file: 'js/theme.js' },
    'App.dataSource':   { deps: ['App.config'],               file: 'js/data-source.js' },
    'App.favorites':    { deps: ['App.config'],               file: 'js/favorites.js' },
    'App.animalInfo':   { deps: ['App.utils','App.speciesMap'], file: 'js/animal-info.js' },
    'App.ui':           { deps: ['App.favorites','App.utils','App.data'], file: 'js/ui.js' },
    'App.navigation':   { deps: ['App.router'],               file: 'js/navigation.js' },
    'App.filterState':  { deps: ['App.router','App.session'], file: 'js/filter-state.js' },
    'App.pagination':   { deps: [],                           file: 'js/pagination.js' },
    'App.chatbot':      { deps: [],                           file: 'js/chatbot.js' },
    'App.particles':    { deps: [],                           file: 'js/particles.js' },
    'App.globe':        { deps: [],                           file: 'js/globe.js' },

    // ── Player sub-modules ──────────────────────────────────
    'App.playerVideo':  { deps: ['App.config'],               file: 'js/player-video.js' },
    'App.playerInfo':   { deps: ['App.data','App.favorites','App.ui'], file: 'js/player-info.js' },
    'App.playerMap':    { deps: ['App.ui','App.utils'],       file: 'js/player-map.js' },
    'App.playerRelated':{ deps: ['App.data','App.ui'],        file: 'js/player-related.js' },
    'App.playerAnimal': { deps: ['App.animalInfo','App.ui'],  file: 'js/player-animal.js' },
    'App.player':       { deps: ['App.router','App.data','App.ui','App.dataSource',
                                 'App.playerVideo','App.playerInfo','App.playerMap',
                                 'App.playerRelated','App.playerAnimal'],
                          file: 'js/player.js' },

    // ── Page modules ────────────────────────────────────────
    'App.home':         { deps: ['App.data','App.utils','App.ui'], file: 'js/home.js' },
    'App.gallery':      { deps: ['App.router','App.data','App.ui','App.utils',
                                 'App.dataSource','App.filterState','App.pagination'],
                          file: 'js/gallery.js' },
    'App.search':       { deps: ['App.router','App.data','App.ui','App.utils'], file: 'js/search.js' },
    'App.categories':   { deps: ['App.data','App.ui','App.utils'], file: 'js/categories.js' },
    'App.map':          { deps: ['App.data','App.utils','App.theme'], file: 'js/map.js' },
    'App.upload':       { deps: [],                           file: 'js/upload.js' },
    'App.contact':      { deps: ['App.ui'],                   file: 'js/contact.js' },
    'App.randomVid':    { deps: ['App.ui'],                   file: 'js/random-vid.js' },
    'App.favoritesPage':{ deps: ['App.data','App.favorites','App.ui'], file: 'js/favorites-page.js' },
    'App.likedPage':    { deps: ['App.data','App.favorites','App.ui'], file: 'js/liked-vid.js' },
    'App.dashboard':    { deps: ['App.data','App.favorites','App.ui'], file: 'js/dashboard.js' }
  };

  /* ---- Namespace resolver ---- */
  function _resolve(path) {
    var parts = path.split('.');
    var obj = window;
    for (var i = 0; i < parts.length; i++) {
      if (!obj) return null;
      obj = obj[parts[i]];
    }
    return obj;
  }

  /* ---- Public API ---- */

  App.deps = {
    /**
     * Verify all loaded modules have their dependencies present.
     * Only checks modules that ARE loaded on this page (gracefully
     * skips modules from other pages).
     * @returns {boolean} true if all deps satisfied
     */
    verify: function() {
      var missing = [];

      for (var name in MODULES) {
        if (!MODULES.hasOwnProperty(name)) continue;

        // Is this module loaded on the current page?
        var modObj = _resolve(name);
        if (!modObj) continue; // not loaded — skip (page-specific module)

        // Check each declared dependency
        var entry = MODULES[name];
        for (var j = 0; j < entry.deps.length; j++) {
          if (!_resolve(entry.deps[j])) {
            missing.push({
              module: name,
              needs: entry.deps[j],
              file: entry.file,
              depFile: MODULES[entry.deps[j]] ? MODULES[entry.deps[j]].file : '(unknown)'
            });
          }
        }
      }

      if (missing.length > 0) {
        _showError(missing);
        return false;
      }
      return true;
    },

    /**
     * Return the dependency list for a module (useful for debugging).
     */
    depsFor: function(moduleName) {
      var entry = MODULES[moduleName];
      return entry ? entry.deps.slice() : null;
    }
  };

  /* ---- Error display ---- */

  function _showError(missing) {
    // Console errors — one per missing dep
    console.group('%c[Loader] ' + missing.length + ' dependency error(s) — fix before deployment',
      'color:#d03238;font-weight:bold;');
    for (var i = 0; i < missing.length; i++) {
      var m = missing[i];
      console.error(
        '%c' + m.module + '%c needs %c' + m.needs + '%c — add %c<script defer src="' + m.depFile + '">%c before ' + m.file,
        'font-weight:bold;', '', 'font-weight:bold;', '',
        'background:#ffd11a;color:#0e0f0c;', ''
      );
    }
    console.groupEnd();

    // Visible red banner at top of page
    if (document.body) {
      var banner = document.createElement('div');
      banner.id = 'loader-error-banner';
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:#d03238;color:#fff;padding:14px 20px;' +
        'font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.6;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.3);';

      var html = '<strong style="font-size:15px;">⚠ Module Dependency Errors</strong>';
      html += '<div style="margin-top:6px;font-size:12px;opacity:0.9;">The page may be broken until these are fixed:</div>';
      html += '<ul style="margin:8px 0 0 0;padding-left:18px;">';
      for (var j = 0; j < missing.length; j++) {
        var item = missing[j];
        html += '<li><code style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;">' +
                item.module + '</code> is missing <code style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;">' +
                item.needs + '</code> — add <code style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;">&lt;script defer src="' +
                item.depFile + '"&gt;</code> before <code>' + item.file + '</code></li>';
      }
      html += '</ul>';
      banner.innerHTML = html;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }
})();
