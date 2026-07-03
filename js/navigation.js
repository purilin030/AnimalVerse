/* ============================================================
   Navigation (Sidebar auto-hide on hover + first-visit peek)
   ============================================================ */
App.navigation = (function() {
  'use strict';

  var sidebar = null;
  var trigger = null;
  var hideTimeout = null;
  var peekTimeout = null;
  var HIDE_DELAY = 300; // ms
  var PEEK_DELAY = 800; // ms after page load before auto-peek
  var PEEK_DURATION = 2500; // ms — how long the peek stays visible

  function init() {
    sidebar = document.getElementById('sidebar');
    trigger = document.getElementById('sidebar-trigger');

    if (!sidebar) return;

    setupHoverTrigger();
    setupFirstVisitPeek();
    setupMobileHamburger();
    setupActiveHighlight();
    setupCategoriesSubmenu();
    setupSearchForm();
    setupHeaderScroll();
  }

  /* ---- Desktop: hover on visible handle → show sidebar ---- */
  function setupHoverTrigger() {
    if (!trigger) return;

    // Mouse enters trigger handle → show sidebar
    trigger.addEventListener('mouseenter', function() {
      clearTimeout(hideTimeout);
      showSidebar();
    });

    // Mouse enters sidebar → keep it open
    sidebar.addEventListener('mouseenter', function() {
      clearTimeout(hideTimeout);
    });

    // Mouse leaves sidebar → hide after delay
    sidebar.addEventListener('mouseleave', function() {
      hideTimeout = setTimeout(hideSidebar, HIDE_DELAY);
    });

    // Mouse leaves trigger — only hide if NOT moving into sidebar
    trigger.addEventListener('mouseleave', function(e) {
      var related = e.relatedTarget;
      if (related !== sidebar && !sidebar.contains(related)) {
        hideTimeout = setTimeout(hideSidebar, HIDE_DELAY);
      }
    });
  }

  /* ---- First-visit auto-peek: sidebar slides out ~72px then retracts ---- */
  function setupFirstVisitPeek() {
    // Only play once per browser session
    if (window.sessionStorage.getItem('sidebar-peek-shown')) return;

    // Only on desktop (mobile uses hamburger)
    if (window.innerWidth <= 767) return;

    peekTimeout = setTimeout(function() {
      // Slide sidebar out partially
      sidebar.classList.add('sidebar--peek');
      if (trigger) {
        trigger.classList.add('sidebar-trigger--peeking');
      }

      // Retract after peek duration
      setTimeout(function() {
        sidebar.classList.remove('sidebar--peek');
        if (trigger) {
          trigger.classList.remove('sidebar-trigger--peeking');
        }
      }, PEEK_DURATION);

    }, PEEK_DELAY);

    // Mark as shown for this session
    window.sessionStorage.setItem('sidebar-peek-shown', '1');
  }

  function showSidebar() {
    // Remove peek class if present (user is manually opening)
    sidebar.classList.remove('sidebar--peek');
    sidebar.classList.add('sidebar--visible');

    // Add open class to hamburger button
    var hamburger = document.getElementById('hamburger-btn');
    if (hamburger) {
      hamburger.classList.add('header__hamburger--open');
    }

    // Hide the trigger handle when sidebar is fully open
    if (trigger) {
      trigger.classList.remove('sidebar-trigger--peeking');
      trigger.classList.add('sidebar-trigger--sidebar-open');
    }

    // Show backdrop on mobile
    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop && window.innerWidth <= 767) {
      backdrop.classList.add('sidebar-backdrop--visible');
    }
  }

  function hideSidebar() {
    sidebar.classList.remove('sidebar--visible');
    sidebar.classList.remove('sidebar--peek');

    // Remove open class from hamburger button
    var hamburger = document.getElementById('hamburger-btn');
    if (hamburger) {
      hamburger.classList.remove('header__hamburger--open');
    }

    // Show the trigger handle again
    if (trigger) {
      trigger.classList.remove('sidebar-trigger--sidebar-open');
      trigger.classList.remove('sidebar-trigger--peeking');
    }

    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.classList.remove('sidebar-backdrop--visible');
    }
  }

  /* ---- Mobile: hamburger toggle ---- */
  function setupMobileHamburger() {
    var hamburger = document.getElementById('hamburger-btn');
    var backdrop = document.getElementById('sidebar-backdrop');

    if (hamburger) {
      hamburger.addEventListener('click', function() {
        if (sidebar.classList.contains('sidebar--visible')) {
          hideSidebar();
        } else {
          showSidebar();
        }
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function() {
        hideSidebar();
      });
    }
  }

  /* ---- Active page highlighting ---- */
  function setupActiveHighlight() {
    var currentPage = App.router.getCurrentPage();
    var navItems = document.querySelectorAll('.sidebar__item');
    for (var i = 0; i < navItems.length; i++) {
      var page = navItems[i].getAttribute('data-page');
      if (page === currentPage) {
        navItems[i].classList.add('sidebar__item--active');
        navItems[i].setAttribute('aria-current', 'page');
      }
    }

    // Highlight header nav links
    var headerLinks = document.querySelectorAll('.header__nav-link');
    for (var j = 0; j < headerLinks.length; j++) {
      var href = headerLinks[j].getAttribute('href');
      if (href === currentPage) {
        headerLinks[j].setAttribute('aria-current', 'page');
      }
    }
  }

  /* ---- Categories submenu toggle ---- */
  function setupCategoriesSubmenu() {
    var catToggle = document.getElementById('categories-toggle');
    var catSubmenu = document.getElementById('categories-submenu');

    if (catToggle && catSubmenu) {
      catToggle.addEventListener('click', function(e) {
        e.preventDefault();
        catSubmenu.classList.toggle('sidebar__submenu--expanded');
        catToggle.classList.toggle('sidebar__item--expanded');
        var expanded = catSubmenu.classList.contains('sidebar__submenu--expanded');
        catToggle.setAttribute('aria-expanded', expanded);
      });

      // Auto-expand if a sub-category is active
      var subLinks = catSubmenu.querySelectorAll('a');
      var currentHref = window.location.href;
      for (var j = 0; j < subLinks.length; j++) {
        if (currentHref.indexOf(subLinks[j].getAttribute('href')) !== -1) {
          catSubmenu.classList.add('sidebar__submenu--expanded');
          catToggle.classList.add('sidebar__item--expanded');
          catToggle.setAttribute('aria-expanded', 'true');
          break;
        }
      }
    }
  }

  /* ---- Search form ---- */
  function setupSearchForm() {
    var searchForm = document.getElementById('header-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var input = document.getElementById('header-search-input');
        var query = input.value.trim();
        if (query) {
          App.router.navigateTo('search.html?q=' + encodeURIComponent(query));
        }
      });
    }
  }

  /* ---- Header scroll shadow ---- */
  function setupHeaderScroll() {
    var header = document.getElementById('header');
    if (header) {
      window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
          header.classList.add('header--scrolled');
        } else {
          header.classList.remove('header--scrolled');
        }
      });
    }
  }

  return {
    init: init,
    show: showSidebar,
    hide: hideSidebar
  };
})();
