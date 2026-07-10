/* ============================================================
   HTML Include — embeds shared header, sidebar, footer & chatbot
   Supports file:// and http:// (fallback to inline HTML)
   ============================================================ */
(function() {
  'use strict';

  /**
   * Load an HTML template: try fetch first, fall back to inline
   */
  var templateCache = {};

  function loadTemplate(name, inlineHtml) {
    if (templateCache[name]) {
      return Promise.resolve(templateCache[name]);
    }

    // Try fetch from includes/ directory with cache buster to prevent caching
    var cacheBuster = '?t=' + new Date().getTime();
    return fetch('includes/' + name + '.html' + cacheBuster)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function(html) {
        templateCache[name] = html;
        return html;
      })
      .catch(function() {
        // Fallback to inline HTML (works on file://)
        templateCache[name] = inlineHtml;
        return inlineHtml;
      });
  }

  /* ===== Inline fallback HTML templates ===== */
  var INLINE = {
    header: [
      '<!-- ===== HEADER ===== -->',
      '<header class="header theme-pixel" id="header">',
      '  <div class="header__inner">',
      '    <button class="header__hamburger" id="hamburger-btn" aria-label="Toggle navigation menu">',
      '      <span class="header__hamburger-line"></span>',
      '      <span class="header__hamburger-line"></span>',
      '      <span class="header__hamburger-line"></span>',
      '    </button>',
      '    <a href="home.html" class="header__logo" aria-label="AnimalVerse Home">',
      '      <div class="header__logo-icon-wrap">',
      '        <img class="header__logo-img" src="assets/images/logos/logo-header.png" alt="AnimalVerse" width="32" height="32">',
      '      </div>',
      '      <span class="header__brand-name">',
      '        <span class="header__brand-cro">Animal</span><span class="header__brand-key">Verse</span>',
      '      </span>',
      '    </a>',
      '    <nav class="header__nav" aria-label="Main navigation">',
      '      <a href="home.html" class="header__nav-link">Home</a>',
      '      <a href="gallery.html" class="header__nav-link">Gallery</a>',
      '      <a href="map.html" class="header__nav-link">Animal Map</a>',
      '      <a href="about.html" class="header__nav-link">About</a>',
      '    </nav>',
      '    <div class="header__actions">',
      '      <a class="header__action-btn" href="favorites.html" aria-label="My Favorites">',
      '        <svg class="header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">',
      '          <path d="M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      '        </svg>',
      '      </a>',
      '      <button class="header__action-btn" id="theme-toggle" aria-label="Toggle dark/light mode">',
      '        <svg class="theme-icon theme-icon--sun header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">',
      '          <circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/>',
      '          <line x1="10" y1="1" x2="10" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '          <line x1="10" y1="17" x2="10" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '          <line x1="1" y1="10" x2="3" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '          <line x1="17" y1="10" x2="19" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '        </svg>',
      '        <svg class="theme-icon theme-icon--moon header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="display:none">',
      '          <path d="M15 10.5C15 14 12 17 8.5 17C5 17 3 14.5 3 11C3 7.5 5.5 5 9 5C6 6.5 5 9 5 11.5C5 14 7 15.5 9.5 15.5C11.5 15.5 13.5 14 15 10.5Z" fill="currentColor"/>',
      '        </svg>',
      '      </button>',
      '      <div class="header__user-wrapper">',
      '        <button class="header__action-btn header__user-icon" id="user-dropdown-trigger" aria-label="User menu" aria-haspopup="true" aria-expanded="false">',
      '          <svg class="header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">',
      '            <circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/>',
      '            <path d="M3 18C3 14.5 6 12 10 12C14 12 17 14.5 17 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '          </svg>',
      '        </button>',
      '        <div class="user-dropdown" id="user-dropdown" role="menu">',
      '          <a href="dashboard.html" class="user-dropdown__item" role="menuitem">',
      '            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">',
      '              <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
      '              <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
      '              <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
      '              <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
      '            </svg>',
      '            <span>Dashboard</span>',
      '          </a>',
      '          <div class="user-dropdown__divider" role="separator"></div>',
      '          <button class="user-dropdown__item user-dropdown__item--danger" role="menuitem" id="signout-btn">',
      '            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">',
      '              <path d="M8 17H4C3 17 2 16 2 15V5C2 4 3 3 4 3H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '              <path d="M14 14L18 10L14 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      '              <path d="M18 10H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '            </svg>',
      '            <span>Sign Out</span>',
      '          </button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</header>'
    ].join('\n'),

    sidebar: [
      '<!-- Sidebar edge tab -->',
      '<div class="sidebar-trigger theme-pixel" id="sidebar-trigger" aria-hidden="true">',
      '  <svg class="sidebar-trigger__chevron" width="12" height="20" viewBox="0 0 8 14" fill="none" aria-hidden="true">',
      '    <path d="M1.5 1L6.5 7L1.5 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      '  </svg>',
      '</div>',
      '<aside class="sidebar theme-pixel" id="sidebar">',
      '  <nav class="sidebar__nav" aria-label="Sidebar navigation">',
      '    <ul class="sidebar__menu">',
      '      <li class="sidebar__group-label" role="heading" aria-level="2">Browse</li>',
      '      <li class="sidebar__item" data-page="home.html"><a href="home.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2 L14 8 H12 V14 H4 V8 H2 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">Home</span></a></li>',
      '      <li class="sidebar__item" data-page="dashboard.html"><a href="dashboard.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="2" width="5" height="5" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><rect x="9" y="2" width="5" height="5" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><rect x="2" y="9" width="5" height="5" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><rect x="9" y="9" width="5" height="5" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">Dashboard</span></a></li>',
      '      <li class="sidebar__item sidebar__item--has-submenu" data-page="categories.html"><a href="#" class="sidebar__link" id="categories-toggle" aria-expanded="false" aria-controls="categories-submenu"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 3 H6 L8 5 H14 V13 H2 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">Categories</span><svg class="sidebar__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4 3 L7 6 L4 9" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></a><ul class="sidebar__submenu" id="categories-submenu" role="group" aria-label="Animal categories"><li><a href="gallery.html?category=mammals" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--mammals"></span>Mammals</a></li><li><a href="gallery.html?category=birds" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--birds"></span>Birds</a></li><li><a href="gallery.html?category=reptiles" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--reptiles"></span>Reptiles</a></li><li><a href="gallery.html?category=amphibians" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--amphibians"></span>Amphibians</a></li><li><a href="gallery.html?category=aquatic" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--aquatic"></span>Aquatic</a></li><li><a href="gallery.html?category=fish" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--fish"></span>Fish</a></li><li><a href="gallery.html?category=invertebrates" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--invertebrates"></span>Invertebrates</a></li><li><a href="gallery.html?category=themed" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--themed"></span>Themed Series</a></li></ul></li>',
      '      <li class="sidebar__item" data-page="map.html"><a href="map.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 2 H11 V5 L13 7 V9 L8 14 L3 9 V7 L5 5 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><rect x="7" y="6" width="2" height="2" fill="currentColor"/></svg></span><span class="sidebar__item-label">Animal Map</span></a></li>',
      '      <li class="sidebar__group-label" role="heading" aria-level="2">Library</li>',
      '      <li class="sidebar__item" data-page="favorites.html"><a href="favorites.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 5 L5 2 H3 V5 L8 11 L13 5 V2 H11 L8 5 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">Favorites</span></a></li>',
      '      <li class="sidebar__item" data-page="liked_vid.html"><a href="liked_vid.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="10" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><path d="M6 5 V11 L10 8 Z" fill="currentColor"/></svg></span><span class="sidebar__item-label">Liked Videos</span></a></li>',
      '      <li class="sidebar__item" data-page="view_history.html"><a href="view_history.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 2 H11 L14 5 V11 L11 14 H5 L2 11 V5 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><path d="M8 5 V8 H11" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">View History</span></a></li>',
      '      <li class="sidebar__item" data-page="statistics.html"><a href="statistics.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 14 H14" stroke="currentColor" stroke-width="2" stroke-linecap="square"/><rect x="3" y="9" width="2" height="3" fill="currentColor"/><rect x="7" y="5" width="2" height="7" fill="currentColor"/><rect x="11" y="2" width="2" height="10" fill="currentColor"/></svg></span><span class="sidebar__item-label">Statistics</span></a></li>',
      '      <li class="sidebar__divider" role="separator"></li>',
      '      <li class="sidebar__item" data-page="about.html"><a href="about.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 2 H11 L14 5 V11 L11 14 H5 L2 11 V5 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><rect x="7" y="5" width="2" height="2" fill="currentColor"/><rect x="7" y="8" width="2" height="4" fill="currentColor"/></svg></span><span class="sidebar__item-label">About</span></a></li>',
      '      <li class="sidebar__item" data-page="contact.html"><a href="contact.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="10" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/><path d="M3 4 L8 8 L13 4" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg></span><span class="sidebar__item-label">Contact</span></a></li>',
      '    </ul>',
      '    <div class="sidebar__footer">',
      '      <a href="random_vid.html" class="sidebar__more-btn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2 V14 M2 8 H14" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"/></svg> <span class="sidebar__more-btn-text">Random Video</span></a>',
      '      <span class="sidebar__footer-text">v1.0 FYP 2025</span>',
      '    </div>',
      '  </nav>',
      '</aside>',
      '<div class="sidebar-backdrop" id="sidebar-backdrop"></div>'
    ].join('\n'),

    footer: [
      '<!-- ===== FOOTER ===== -->',
      '<footer class="footer" id="footer">',
      '  <div class="footer__inner">',
      '    <div class="footer__brand">',
      '      <img class="footer__logo-img" src="assets/images/logos/logo-header.png" alt="AnimalVerse" width="24" height="24">',
      '      <span class="footer__brand-name">AnimalVerse</span>',
      '    </div>',
      '    <div class="footer__links">',
      '      <div class="footer__col">',
      '        <h4 class="footer__col-title">Quick Links</h4>',
      '        <a href="home.html" class="footer__link">Home</a>',
      '        <a href="gallery.html" class="footer__link">Gallery</a>',
      '        <a href="map.html" class="footer__link">Animal Map</a>',
      '        <a href="about.html" class="footer__link">About</a>',
      '        <a href="contact.html" class="footer__link">Contact</a>',
      '      </div>',
      '      <div class="footer__col">',
      '        <h4 class="footer__col-title">Categories</h4>',
      '        <a href="gallery.html?category=mammals" class="footer__link">Mammals</a>',
      '        <a href="gallery.html?category=birds" class="footer__link">Birds</a>',
      '        <a href="gallery.html?category=reptiles" class="footer__link">Reptiles</a>',
      '        <a href="gallery.html?category=amphibians" class="footer__link">Amphibians</a>',
      '        <a href="gallery.html?category=aquatic" class="footer__link">Aquatic</a>',
      '      </div>',
      '      <div class="footer__col">',
      '        <h4 class="footer__col-title">Connect</h4>',
      '        <div class="footer__social">',
      '          <a href="#" class="footer__social-icon" title="Facebook" aria-label="Facebook">FB</a>',
      '          <a href="#" class="footer__social-icon" title="Instagram" aria-label="Instagram">IG</a>',
      '          <a href="#" class="footer__social-icon" title="X (Twitter)" aria-label="X (Twitter)">X</a>',
      '          <a href="#" class="footer__social-icon" title="YouTube" aria-label="YouTube">YT</a>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="footer__bottom">',
      '      <p>&copy; 2026 AnimalVerse. Built with love by Wong Jiun Hong</p>',
      '      <p class="footer__bottom-links">',
      '        <a href="about.html">Privacy Policy</a>',
      '        <span class="footer__dot">&middot;</span>',
      '        <a href="about.html">Terms of Service</a>',
      '      </p>',
      '      <p class="footer__fyp">UTAR FYP 2026 | Bachelor of Information Systems (Honours)</p>',
      '    </div>',
      '  </div>',
      '</footer>'
    ].join('\n'),

    chatbot: [
      '<!-- ===== CHATBOT & TOAST ===== -->',
      '<button class="chatbot-btn" id="chatbot-btn" aria-label="Open AI Assistant">',
      '  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">',
      '    <rect x="3" y="4" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>',
      '    <path d="M8 10H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '    <path d="M8 14H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '    <path d="M16 18V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '    <path d="M8 18V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      '  </svg>',
      '  <span class="chatbot-btn__tooltip">AI Assistant (Coming Soon in FYP2)</span>',
      '</button>',
      '<div class="toast-container" id="toast-container" aria-live="polite"></div>'
    ].join('\n')
  };

  /**
   * Inject all [data-include] placeholders with loaded templates
   */
  function injectAll() {
    var els = document.querySelectorAll('[data-include]');
    if (els.length === 0) return;

    var names = [];
    els.forEach(function(el) {
      names.push(el.getAttribute('data-include'));
    });

    // Load all needed templates, then inject
    var loadPromises = names.map(function(name) {
      return loadTemplate(name, INLINE[name] || '');
    });

    Promise.all(loadPromises).then(function(htmls) {
      var idx = 0;
      els.forEach(function(el) {
        if (htmls[idx]) {
          var temp = document.createElement('div');
          temp.innerHTML = htmls[idx].trim();
          
          // Copy classes from the placeholder element to all injected root element children
          if (el.classList.length > 0) {
            var children = temp.children;
            for (var c = 0; c < children.length; c++) {
              for (var i = 0; i < el.classList.length; i++) {
                children[c].classList.add(el.classList[i]);
              }
            }
          }
          
          // Insert all nodes and remove placeholder
          while (temp.firstChild) {
            el.parentNode.insertBefore(temp.firstChild, el);
          }
          el.parentNode.removeChild(el);
        }
        idx++;
      });

      // Ensure favicon is set
      ensureFavicon();

      // Signal that includes are ready
      document.dispatchEvent(new CustomEvent('includes-loaded'));
    });
  }

  /**
   * Ensure the favicon is configured correctly
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
