/* ============================================================
   HTML Include — embeds shared header, sidebar, footer & chatbot
   Fetches from includes/ directory.  Served via a local HTTP
   server (python -m http.server) or S3/CloudFront — the inline
   fallback has been removed to eliminate the duplication between
   include.js and includes/*.html.  See README for dev setup.
   ============================================================ */
(function() {
  'use strict';

  var templateCache = {};

  /**
   * Fetch an HTML template from includes/.
   * Results are cached per page load so each include is fetched once.
   */
  function loadTemplate(name) {
    if (templateCache[name]) {
      return Promise.resolve(templateCache[name]);
    }

    // Cache buster prevents stale cached responses during development
    return fetch('includes/' + name + '.html?t=' + new Date().getTime())
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load ' + name + ' (HTTP ' + res.status + ')');
        return res.text();
      })
      .then(function(html) {
        templateCache[name] = html;
        return html;
      });
  }

  /**
   * Inject all [data-include] placeholders with loaded templates.
   */
  function injectAll() {
    var els = document.querySelectorAll('[data-include]');
    if (els.length === 0) return;

    // Collect unique include names + build a map of name → placeholder elements
    var nameMap = {}; // name → [el, el, ...]
    els.forEach(function(el) {
      var name = el.getAttribute('data-include');
      if (!name) return;
      if (!nameMap[name]) nameMap[name] = [];
      nameMap[name].push(el);
    });

    // Load each unique template once
    var names = Object.keys(nameMap);
    var loadPromises = names.map(function(name) {
      return loadTemplate(name).catch(function(err) {
        console.warn('[include] ' + err.message);
        // Return an error marker that injectAll will recognise
        return { _error: true, _name: name };
      });
    });

    Promise.all(loadPromises).then(function(results) {
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var html = results[i];
        var placeholders = nameMap[name];

        placeholders.forEach(function(el) {
          if (html && html._error) {
            // Insert a visible error placeholder so the page doesn't silently break
            var errDiv = document.createElement('div');
            errDiv.className = 'include-error';
            errDiv.style.cssText = 'padding:12px;margin:8px;border:2px dashed #d03238;border-radius:8px;color:#d03238;font-family:monospace;font-size:0.85rem;';
            errDiv.textContent = '⚠ Failed to load ' + name + ' — check that you are serving via HTTP (not file://)';
            el.parentNode.insertBefore(errDiv, el);
            el.parentNode.removeChild(el);
            return;
          }

          // Normal path: inject the loaded HTML
          var temp = document.createElement('div');
          temp.innerHTML = html.trim();

          // Copy classes from the placeholder to all injected root children
          if (el.classList.length > 0) {
            var children = temp.children;
            for (var c = 0; c < children.length; c++) {
              for (var k = 0; k < el.classList.length; k++) {
                children[c].classList.add(el.classList[k]);
              }
            }
          }

          // Insert all nodes and remove placeholder
          while (temp.firstChild) {
            el.parentNode.insertBefore(temp.firstChild, el);
          }
          el.parentNode.removeChild(el);
        });
      }

      // Ensure favicon is set
      ensureFavicon();

      // Signal that includes are ready
      document.dispatchEvent(new CustomEvent('includes-loaded'));
    });
  }

  /**
   * Ensure the favicon is configured correctly.
   */
  function ensureFavicon() {
    var existing = document.querySelector('link[rel*="icon"]');
    if (existing) {
      existing.href = 'assets/images/icons/logo-header.ico';
      existing.type = 'image/x-icon';
    } else {
      var link = document.createElement('link');
      link.rel = 'icon';
      link.href = 'assets/images/icons/logo-header.ico';
      link.type = 'image/x-icon';
      document.head.appendChild(link);
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAll);
  } else {
    injectAll();
  }
})();
