/* ============================================================
   HTML Include — embeds shared header & sidebar
   Works on file:// and http:// (no fetch needed)
   ============================================================ */
(function() {
  'use strict';

  var includes = {
    header: '<!-- ===== HEADER ===== -->' +
'<link rel="icon" href="assets/images/icons/logo-header.ico" type="image/x-icon">' +
'<header class="header" id="header">' +
'<div class="header__inner">' +
'<button class="header__hamburger" id="hamburger-btn" aria-label="Toggle navigation menu">' +
'<span class="header__hamburger-line"></span>' +
'<span class="header__hamburger-line"></span>' +
'<span class="header__hamburger-line"></span>' +
'</button>' +
'<a href="home.html" class="header__logo" aria-label="AnimalVerse Home">' +
'<div class="header__logo-icon-wrap">' +
'<img class="header__logo-img" src="assets/images/logos/logo-header.png" alt="AnimalVerse" width="32" height="32">' +
'</div>' +
'<span class="header__brand-name">' +
'<span class="header__brand-cro">Animal</span><span class="header__brand-key">Verse</span>' +
'</span>' +
'</a>' +
'<nav class="header__nav" aria-label="Main navigation">' +
'<a href="home.html" class="header__nav-link">Home</a>' +
'<a href="gallery.html" class="header__nav-link">Gallery</a>' +
'<a href="map.html" class="header__nav-link">Animal Map</a>' +
'<a href="about.html" class="header__nav-link">About</a>' +
'</nav>' +
'<div class="header__actions">' +
'<a class="header__action-btn" href="favorites.html" aria-label="My Favorites">' +
'<svg class="header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
'<path d="M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
'</svg>' +
'</a>' +
'<button class="header__action-btn" id="theme-toggle" aria-label="Toggle dark/light mode">' +
'<svg class="theme-icon theme-icon--sun header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
'<circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/>' +
'<line x1="10" y1="1" x2="10" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="10" y1="17" x2="10" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="1" y1="10" x2="3" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="17" y1="10" x2="19" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="3.5" y1="3.5" x2="4.93" y2="4.93" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="15.07" y1="15.07" x2="16.5" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="3.5" y1="16.5" x2="4.93" y2="15.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<line x1="15.07" y1="4.93" x2="16.5" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'</svg>' +
'<svg class="theme-icon theme-icon--moon header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="display:none">' +
'<path d="M15 10.5C15 14 12 17 8.5 17C5 17 3 14.5 3 11C3 7.5 5.5 5 9 5C6 6.5 5 9 5 11.5C5 14 7 15.5 9.5 15.5C11.5 15.5 13.5 14 15 10.5Z" fill="currentColor"/>' +
'</svg>' +
'</button>' +
'<div class="header__user-wrapper">' +
'<button class="header__action-btn header__user-icon" id="user-dropdown-trigger" aria-label="User menu" aria-haspopup="true" aria-expanded="false">' +
'<svg class="header__action-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
'<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/>' +
'<path d="M3 18C3 14.5 6 12 10 12C14 12 17 14.5 17 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'</svg>' +
'</button>' +
'<div class="user-dropdown" id="user-dropdown" role="menu">' +
'<a href="dashboard.html" class="user-dropdown__item" role="menuitem">' +
'<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
'<rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
'<rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
'<rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
'<rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
'</svg>' +
'<span>Dashboard</span>' +
'</a>' +
'<div class="user-dropdown__divider" role="separator"></div>' +
'<button class="user-dropdown__item user-dropdown__item--danger" role="menuitem" id="signout-btn">' +
'<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
'<path d="M8 17H4C3 17 2 16 2 15V5C2 4 3 3 4 3H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<path d="M14 14L18 10L14 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
'<path d="M18 10H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'</svg>' +
'<span>Sign Out</span>' +
'</button>' +
'</div>' +
'</div>' +
'</div>' +
'</div>' +
'</header>',

    sidebar: '<!-- Sidebar edge tab — hover to reveal (not clickable) -->' +
'<div class="sidebar-trigger" id="sidebar-trigger"><svg class="sidebar-trigger__chevron" width="12" height="20" viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M1.5 1L6.5 7L1.5 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
'<aside class="sidebar" id="sidebar">' +
'<nav class="sidebar__nav" aria-label="Main navigation">' +
'<ul class="sidebar__menu">' +
'<li class="sidebar__group-label">Browse</li>' +
'<li class="sidebar__item" data-page="home.html"><a href="home.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10L10 2L18 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 8V16H16V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sidebar__item-label">Home</span></a></li>' +
'<li class="sidebar__item" data-page="dashboard.html"><a href="dashboard.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/></svg></span><span class="sidebar__item-label">Dashboard</span></a></li>' +
'<li class="sidebar__item sidebar__item--has-submenu" data-page="categories.html"><a href="#" class="sidebar__link" id="categories-toggle" aria-expanded="false" aria-controls="categories-submenu"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 4H8L10 6H18V16H2V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span><span class="sidebar__item-label">Categories</span><svg class="sidebar__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4 3L7 6L4 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></a><ul class="sidebar__submenu" id="categories-submenu" role="group" aria-label="Animal categories"><li><a href="gallery.html?category=mammals" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--mammals"></span>Mammals</a></li><li><a href="gallery.html?category=birds" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--birds"></span>Birds</a></li><li><a href="gallery.html?category=reptiles" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--reptiles"></span>Reptiles</a></li><li><a href="gallery.html?category=amphibians" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--amphibians"></span>Amphibians</a></li><li><a href="gallery.html?category=aquatic" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--aquatic"></span>Aquatic</a></li><li><a href="gallery.html?category=themed" class="sidebar__sub-link"><span class="sidebar__sub-dot sidebar__sub-dot--themed"></span>Themed Series</a></li></ul></li>' +
'<li class="sidebar__item" data-page="map.html"><a href="map.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2C6.5 2 4 4.5 4 8C4 12 10 18 10 18C10 18 16 12 16 8C16 4.5 13.5 2 10 2Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg></span><span class="sidebar__item-label">Animal Map</span></a></li>' +
'<li class="sidebar__group-label">Library</li>' +
'<li class="sidebar__item" data-page="favorites.html"><a href="favorites.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span><span class="sidebar__item-label">Favorites</span></a></li>' +
'<li class="sidebar__item" data-page="liked.html"><a href="liked.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 9V17H15V9L10 3L5 9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 17H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="sidebar__item-label">Liked Videos</span></a></li>' +
'<li class="sidebar__item" data-page="history.html"><a href="history.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6V10L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="sidebar__item-label">View History</span></a></li>' +
'<li class="sidebar__item" data-page="chart.html"><a href="chart.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 18H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="4" y="10" width="3" height="8" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="8.5" y="5" width="3" height="13" rx="0.5" stroke="currentColor" stroke-width="1.2"/><rect x="13" y="7" width="3" height="11" rx="0.5" stroke="currentColor" stroke-width="1.2"/></svg></span><span class="sidebar__item-label">Statistics</span></a></li>' +

'<li class="sidebar__group-label">Admin</li>' +
'<li class="sidebar__item" data-page="dashboard.html#videos"><a href="dashboard.html#videos" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 7L14 10L9 13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span><span class="sidebar__item-label">Video Management</span><span class="sidebar__badge">Admin Only</span></a></li>' +
'<li class="sidebar__item" data-page="dashboard.html#users"><a href="dashboard.html#users" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 17C2 13.5 4.5 11 8 11C11.5 11 14 13.5 14 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="sidebar__item-label">User Management</span><span class="sidebar__badge">Admin Only</span></a></li>' +
'<li class="sidebar__item" data-page="dashboard.html#settings"><a href="dashboard.html#settings" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 1V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 17V19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 3.5L5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15 15L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M1 10H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 10H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="sidebar__item-label">Site Settings</span><span class="sidebar__badge">Admin Only</span></a></li>' +
'<li class="sidebar__divider" role="separator"></li>' +
'<li class="sidebar__item" data-page="about.html"><a href="about.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="7" r="0.5" fill="currentColor"/></svg></span><span class="sidebar__item-label">About</span></a></li>' +
'<li class="sidebar__item" data-page="contact.html"><a href="contact.html" class="sidebar__link"><span class="sidebar__item-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 5L10 10L18 5V16H2V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 5L10 10L18 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sidebar__item-label">Contact</span></a></li>' +
'</ul>' +
'<div class="sidebar__footer">' +
'<a href="random_vid.html" class="sidebar__more-btn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Random Video</a>' +
'<span class="sidebar__footer-text">v1.0 FYP 2025</span>' +
'</div>' +
'</nav>' +
'</aside>' +
'<div class="sidebar-backdrop" id="sidebar-backdrop"></div>',

    footer: '<!-- ===== FOOTER ===== -->' +
'<footer class="footer" id="footer">' +
'<div class="footer__inner">' +
'<div class="footer__brand">' +
'<img class="footer__logo-img" src="assets/images/logos/logo-footer.png" alt="AnimalVerse" width="20" height="20">' +
'</div>' +
'<div class="footer__links">' +
'<div class="footer__col">' +
'<h4 class="footer__col-title">Quick Links</h4>' +
'<a href="home.html" class="footer__link">Home</a>' +
'<a href="gallery.html" class="footer__link">Gallery</a>' +
'<a href="map.html" class="footer__link">Animal Map</a>' +
'<a href="about.html" class="footer__link">About</a>' +
'<a href="contact.html" class="footer__link">Contact</a>' +
'</div>' +
'<div class="footer__col">' +
'<h4 class="footer__col-title">Categories</h4>' +
'<a href="gallery.html?category=mammals" class="footer__link">Mammals</a>' +
'<a href="gallery.html?category=birds" class="footer__link">Birds</a>' +
'<a href="gallery.html?category=reptiles" class="footer__link">Reptiles</a>' +
'<a href="gallery.html?category=amphibians" class="footer__link">Amphibians</a>' +
'<a href="gallery.html?category=aquatic" class="footer__link">Aquatic</a>' +
'</div>' +
'<div class="footer__col">' +
'<h4 class="footer__col-title">Connect</h4>' +
'<div class="footer__social">' +
'<span class="footer__social-icon" title="Facebook">FB</span>' +
'<span class="footer__social-icon" title="Instagram">IG</span>' +
'<span class="footer__social-icon" title="X (Twitter)">X</span>' +
'<span class="footer__social-icon" title="YouTube">YT</span>' +
'</div>' +
'</div>' +
'</div>' +
'<div class="footer__bottom">' +
'<p>&copy; 2026 AnimalVerse. Built with love by Wong Jiun Hong</p>' +
'<p class="footer__bottom-links">' +
'<a href="#">Privacy Policy</a>' +
'<span class="footer__dot">&#183;</span>' +
'<a href="#">Terms of Service</a>' +
'</p>' +
'<p class="footer__fyp">UTAR FYP 2026 | Bachelor of Information Systems (Honours)</p>' +
'</div>' +
'</div>' +
'</footer>',

    chatbot: '<!-- ===== CHATBOT & TOAST ===== -->' +
'<button class="chatbot-btn" id="chatbot-btn" aria-label="Open AI Assistant">' +
'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
'<rect x="3" y="4" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/>' +
'<path d="M8 10H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<path d="M8 14H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<path d="M16 18V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'<path d="M8 18V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
'</svg>' +
'<span class="chatbot-btn__tooltip">AI Assistant (Coming Soon in FYP2)</span>' +
'</button>' +
'<div class="toast-container" id="toast-container" aria-live="polite"></div>'
  };

  function injectAll() {
    var els = document.querySelectorAll('[data-include]');
    var count = els.length;
    if (count === 0) return;

    els.forEach(function(el) {
      var name = el.getAttribute('data-include');
      if (includes[name]) {
        el.outerHTML = includes[name];
      }
    });

    // Update Tab Icon (Favicon)
    var iconLinks = document.querySelectorAll('link[rel*="icon"]');
    if (iconLinks.length > 0) {
      iconLinks.forEach(function(link) {
        link.href = 'assets/images/icons/logo-header.ico';
        link.type = 'image/x-icon';
      });
    } else {
      var newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = 'assets/images/icons/logo-header.ico';
      newLink.type = 'image/x-icon';
      document.head.appendChild(newLink);
    }

    // Dispatch event after all injected
    document.dispatchEvent(new CustomEvent('includes-loaded'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAll);
  } else {
    injectAll();
  }
})();
