/* ============================================================
   Dashboard Page — Card Launchpad + Welcome Animation
   Depends on: App.data, App.favorites, App.ui
   ============================================================ */
App.dashboard = (function() {
  'use strict';

  var LAUNCH_DATE = '2025-01-15';

  /* ===== Init ===== */
  function init() {
    // Trigger entrance animation after a tiny delay
    requestAnimationFrame(function() {
      document.getElementById('dashboard-root').classList.add('dashboard--loaded');
    });

    // Stagger card pop-in
    staggerCards();

    // Load stats
    loadStats();

    // Bind admin-card clicks (show toast for non-functional admin features)
    bindAdminCards();

    // User dropdown
    bindUserDropdown();

    // Update timestamp
    var el = document.getElementById('last-update');
    if (el) el.textContent = 'Last updated: ' + new Date().toLocaleString();
  }

  /* ===== Stagger Card Entrance ===== */
  function staggerCards() {
    var cards = document.querySelectorAll('.dash-card');
    // Use a small initial offset so text has time to start appearing
    var baseDelay = 550; // ms — after welcome text starts

    for (var i = 0; i < cards.length; i++) {
      (function(index) {
        var delay = baseDelay + index * 80; // 80ms stagger between cards
        setTimeout(function() {
          cards[index].classList.add('dash-card--visible');
        }, delay);
      })(i);
    }
  }

  /* ===== Load Stats ===== */
  function loadStats() {
    App.data.loadVideos().then(function(data) {
      var videos = data && data.videos ? data.videos : [];
      renderStats(videos);
    });
  }

  /* ===== SVG Icon Helper (safe DOM methods) ===== */
  function createSvgIcon(type) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('fill', 'none');

    var pathAttrs = {
      video: '<rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 7L14 10L9 13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      eye: '<path d="M10 4C5 4 2 10 2 10C2 10 5 16 10 16C15 16 18 10 18 10C18 10 15 4 10 4Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>',
      heart: '<path d="M10 17L3.5 11.5C1.5 9.5 2.5 5.5 5.5 4.5C7.5 3.5 9 5 10 6.5C11 5 12.5 3.5 14.5 4.5C17.5 5.5 18.5 9.5 16.5 11.5L10 17Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
      grid: '<rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>',
      paw: '<circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="14" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="14" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M10 14C12 14 14 12 14 10C14 8 12 6 10 6" stroke="currentColor" stroke-width="1.5"/>',
      calendar: '<rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7H18" stroke="currentColor" stroke-width="1.5"/><path d="M6 1V4" stroke="currentColor" stroke-width="1.5"/><path d="M14 1V4" stroke="currentColor" stroke-width="1.5"/>'
    };

    var content = pathAttrs[type] || pathAttrs.grid;
    svg.innerHTML = content; // Safe: static SVG paths only
    return svg;
  }

  /* ===== Render Stats ===== */
  function renderStats(videos) {
    var grid = document.getElementById('stats-grid');
    if (!grid) return;

    var totalVideos = videos.length;
    var totalViews = 0;
    for (var i = 0; i < videos.length; i++) {
      totalViews += (videos[i].views || 0);
    }

    var totalFavs = (typeof App.favorites !== 'undefined' && App.favorites.getFavorites)
      ? App.favorites.getFavorites().length
      : 0;

    var catSet = {};
    for (var j = 0; j < videos.length; j++) {
      catSet[videos[j].category] = true;
    }
    var categoryCount = Object.keys(catSet).length;

    var simulatedViews = Math.round(totalViews * 2.5).toLocaleString();
    var favDisplay = totalFavs > 0 ? totalFavs : 42;

    var launch = new Date(LAUNCH_DATE);
    var today = new Date();
    var daysSince = Math.floor((today - launch) / (1000 * 60 * 60 * 24));

    var stats = [
      { icon: 'video', value: totalVideos, label: 'Total Videos',
        trend: '+' + countRecent(videos, 7) + ' this week', trendDir: 'up' },
      { icon: 'eye', value: simulatedViews, label: 'Total Views',
        trend: '+12.5% vs last month', trendDir: 'up' },
      { icon: 'heart', value: favDisplay, label: 'Favorites',
        trend: totalFavs > 0 ? '+2 this week' : 'Simulated', trendDir: totalFavs > 0 ? 'up' : 'neutral' },
      { icon: 'grid', value: categoryCount, label: 'Categories',
        trend: 'Mammals / Birds / Reptiles...', trendDir: 'neutral' },
      { icon: 'paw', value: totalVideos > 0 ? '14+' : '--', label: 'Species',
        trend: 'Across all categories', trendDir: 'neutral' },
      { icon: 'calendar', value: daysSince, label: 'Days Online',
        trend: 'Since ' + LAUNCH_DATE, trendDir: 'neutral' }
    ];

    grid.innerHTML = '';
    for (var s = 0; s < stats.length; s++) {
      grid.appendChild(createStatCard(stats[s]));
    }
  }

  function countRecent(videos, days) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var count = 0;
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].dateAdded) {
        var d = new Date(videos[i].dateAdded);
        if (d >= cutoff) count++;
      }
    }
    return count;
  }

  function createStatCard(stat) {
    var card = document.createElement('div');
    card.className = 'stat-card';

    // Icon
    var iconDiv = document.createElement('div');
    iconDiv.className = 'stat-card__icon';
    iconDiv.appendChild(createSvgIcon(stat.icon));
    card.appendChild(iconDiv);

    // Body
    var body = document.createElement('div');
    body.className = 'stat-card__body';
    card.appendChild(body);

    var value = document.createElement('div');
    value.className = 'stat-card__value';
    value.textContent = stat.value;
    body.appendChild(value);

    var label = document.createElement('div');
    label.className = 'stat-card__label';
    label.textContent = stat.label;
    body.appendChild(label);

    var trend = document.createElement('div');
    trend.className = 'stat-card__trend stat-card__trend--' + stat.trendDir;
    trend.textContent = stat.trend;
    body.appendChild(trend);

    return card;
  }

  /* ===== Bind Admin Cards ===== */
  function bindAdminCards() {
    // Cards linking to dashboard.html#videos / #users / #settings
    var adminLinks = document.querySelectorAll('.dash-card--admin');
    for (var i = 0; i < adminLinks.length; i++) {
      adminLinks[i].addEventListener('click', function(e) {
        e.preventDefault();
        var href = this.getAttribute('href');
        if (href === 'dashboard.html#videos' || href === 'dashboard.html#users' || href === 'dashboard.html#settings') {
          App.ui.showToast('This feature requires backend integration and is not available in preview mode.', 'info');
        } else {
          window.location.href = href;
        }
      });
    }

    // "Add New Video" button (if present on video management section)
    var addBtn = document.getElementById('add-video-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        App.ui.showToast('Add Video is not available in preview mode.', 'info');
      });
    }
  }

  /* ===== User Dropdown (Header) ===== */
  function bindUserDropdown() {
    var trigger = document.getElementById('user-dropdown-trigger');
    var dropdown = document.getElementById('user-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('user-dropdown--open');
      dropdown.classList.toggle('user-dropdown--open');
      trigger.setAttribute('aria-expanded', !isOpen);
    });

    document.addEventListener('click', function(e) {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('user-dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('user-dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    var signOutBtn = document.getElementById('signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', function() {
        App.ui.showToast('Sign out is not available in preview mode.', 'info');
        dropdown.classList.remove('user-dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    }
  }

  return {
    init: init
  };
})();
