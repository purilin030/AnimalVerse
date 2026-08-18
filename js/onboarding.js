/* ============================================================
   Onboarding — first-visit 3-step feature guide
   Shows a dismissible modal the first time a user visits the site,
   pointing out the three high-value features users commonly miss:
   1. World Map exploration  2. Live species encyclopedia
   3. Random blind-box discovery.
   Once dismissed (or "Start Exploring" clicked) the flag is stored
   in localStorage so it never reappears.
   ============================================================ */
App.onboarding = (function() {
  'use strict';

  var STORAGE_KEY = 'animalverse-onboarded';
  var SHOW_DELAY = 1200; // ms after page load — let the hero settle first

  var STEPS = [
    {
      icon: '🗺️',
      title: 'Explore the World Map',
      desc: 'Every video is pinned to real GPS coordinates. Open the map and discover wildlife by global location.'
    },
    {
      icon: '📚',
      title: 'Live Species Encyclopedia',
      desc: 'While a video plays, the encyclopedia drawer pulls the scientific name, conservation status and facts from Wikipedia, Wikidata & iNaturalist.'
    },
    {
      icon: '🎲',
      title: 'Random Discovery',
      desc: 'Not sure what to watch? Hit the dice and let a mystery animal surprise you.'
    }
  ];

  var overlay = null;
  var current = 0;

  function init() {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch (e) {
      return; // localStorage unavailable — skip onboarding
    }

    build();
    setTimeout(show, SHOW_DELAY);
  }

  function build() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'onboarding';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'onboarding-title');
    overlay.style.display = 'none';

    var card = document.createElement('div');
    card.className = 'onboarding__card';

    // Progress dots (top)
    var dots = document.createElement('div');
    dots.className = 'onboarding__dots';
    dots.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < STEPS.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'onboarding__dot';
      dot.setAttribute('data-step', i);
      dots.appendChild(dot);
    }
    card.appendChild(dots);

    // Skip button
    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'onboarding__skip';
    skip.textContent = 'Skip';
    skip.setAttribute('data-action', 'close');
    card.appendChild(skip);

    // Icon
    var iconWrap = document.createElement('div');
    iconWrap.className = 'onboarding__icon';
    var icon = document.createElement('span');
    icon.id = 'onboarding-icon';
    icon.textContent = STEPS[0].icon;
    iconWrap.appendChild(icon);
    card.appendChild(iconWrap);

    // Title + description
    var title = document.createElement('h2');
    title.id = 'onboarding-title';
    title.className = 'onboarding__title';
    title.textContent = STEPS[0].title;
    card.appendChild(title);

    var desc = document.createElement('p');
    desc.className = 'onboarding__desc';
    desc.id = 'onboarding-desc';
    desc.textContent = STEPS[0].desc;
    card.appendChild(desc);

    // Controls
    var controls = document.createElement('div');
    controls.className = 'onboarding__controls';

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'onboarding__btn onboarding__btn--ghost';
    prev.textContent = '← Back';
    prev.setAttribute('data-action', 'prev');
    controls.appendChild(prev);

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'onboarding__btn onboarding__btn--primary';
    next.textContent = 'Next →';
    next.setAttribute('data-action', 'next');
    controls.appendChild(next);

    card.appendChild(controls);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // ── Event wiring ──
    overlay.addEventListener('click', function(e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        handleAction(actionEl.getAttribute('data-action'));
        return;
      }
      // Click on the backdrop (not the card) dismisses
      if (e.target === overlay) {
        close();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display !== 'none') {
        close();
      } else if (e.key === 'ArrowRight' && overlay.style.display !== 'none') {
        handleAction('next');
      } else if (e.key === 'ArrowLeft' && overlay.style.display !== 'none') {
        handleAction('prev');
      }
    });
  }

  function handleAction(action) {
    if (action === 'close') {
      close();
    } else if (action === 'next') {
      // Last step: the primary button becomes "Start Exploring" → dismiss
      if (current >= STEPS.length - 1) {
        close();
        return;
      }
      current = Math.min(current + 1, STEPS.length - 1);
      render();
      if (current === STEPS.length - 1) {
        setPrimaryLabel('Start Exploring');
      }
    } else if (action === 'prev') {
      current = Math.max(current - 1, 0);
      render();
      setPrimaryLabel('Next →');
    }
  }

  function render() {
    var iconEl = document.getElementById('onboarding-icon');
    var titleEl = document.getElementById('onboarding-title');
    var descEl = document.getElementById('onboarding-desc');
    if (iconEl) iconEl.textContent = STEPS[current].icon;
    if (titleEl) titleEl.textContent = STEPS[current].title;
    if (descEl) descEl.textContent = STEPS[current].desc;

    var dots = overlay.querySelectorAll('.onboarding__dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-active', i === current);
    }

    var prev = overlay.querySelector('[data-action="prev"]');
    if (prev) prev.style.visibility = current === 0 ? 'hidden' : 'visible';
  }

  function setPrimaryLabel(label) {
    var next = overlay.querySelector('[data-action="next"]');
    if (next) next.textContent = label;
  }

  function show() {
    if (!overlay) return;
    overlay.style.display = 'flex';
    render();
    var next = overlay.querySelector('[data-action="next"]');
    if (next) next.focus();
    // Pause the random FAB float while the modal is open (optional nicety)
  }

  function close() {
    if (!overlay) return;
    overlay.style.display = 'none';
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      /* ignore quota / privacy-mode errors */
    }
  }

  return {
    init: init
  };
})();
