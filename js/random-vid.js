/* ============================================================
   Random Video — Lucky Pick Honeycomb Shuffle
   Hex grid animation + slot-machine-style random selection

   Module: App.randomVid
   Entry:  App.randomVid.init()  ← called by app.js after includes-loaded
   ============================================================ */
App.randomVid = (function() {
  'use strict';

  /* ---------- Animal Data ---------- */
  var ANIMALS = [
    { name: 'Lion',      emoji: '🦁', tagline: 'King of the Savanna' },
    { name: 'Elephant',  emoji: '🐘', tagline: 'Gentle Giant' },
    { name: 'Tiger',     emoji: '🐯', tagline: 'Fierce & Graceful' },
    { name: 'Eagle',     emoji: '🦅', tagline: 'Soaring High' },
    { name: 'Wolf',      emoji: '🐺', tagline: 'Loyal Pack Leader' },
    { name: 'Giraffe',   emoji: '🦒', tagline: 'Towering Above' },
    { name: 'Penguin',   emoji: '🐧', tagline: 'Arctic Ambassador' },
    { name: 'Dolphin',   emoji: '🐬', tagline: 'Ocean Acrobat' },
    { name: 'Koala',     emoji: '🐨', tagline: 'Eucalyptus Dreamer' },
    { name: 'Panda',     emoji: '🐼', tagline: 'Bamboo Lover' },
    { name: 'Fox',       emoji: '🦊', tagline: 'Clever & Cunning' },
    { name: 'Rabbit',    emoji: '🐇', tagline: 'Hoppy Friend' },
    { name: 'Monkey',    emoji: '🐒', tagline: 'Playful Trickster' },
    { name: 'Parrot',    emoji: '🦜', tagline: 'Colourful Talker' },
    { name: 'Bear',      emoji: '🐻', tagline: 'Wild & Strong' },
    { name: 'Frog',      emoji: '🐸', tagline: 'Leaping Legend' },
    { name: 'Owl',       emoji: '🦉', tagline: 'Wise Watcher' },
    { name: 'Horse',     emoji: '🐴', tagline: 'Free Spirit' },
    { name: 'Butterfly', emoji: '🦋', tagline: 'Delicate Beauty' },
    { name: 'Turtle',    emoji: '🐢', tagline: 'Slow & Steady' },
    { name: 'Whale',     emoji: '🐋', tagline: 'Ocean Titan' },
    { name: 'Peacock',   emoji: '🦚', tagline: 'Dazzling Display' },
    { name: 'Hedgehog',  emoji: '🦔', tagline: 'Spiky Cuddle' },
    { name: 'Kangaroo',  emoji: '🦘', tagline: 'Jumping Champion' },
    { name: 'Capybara',  emoji: '🦦', tagline: 'Chillest Creature Alive' },
    { name: 'Red Panda', emoji: '🦊', tagline: 'Cute Forest Dweller' },
    { name: 'Sloth',     emoji: '🦥', tagline: 'Slow-motion Master' },
  ];

  /* ---------- DOM References (resolved in init) ---------- */
  var grid, btn, btnIcon, btnLabel, result;
  var resultEmoji, resultName, resultTagline, resultWatch, resultAgain, resultClose;

  var isShuffling = false;
  var selectedIndex = -1;
  var shuffleAborted = false;

  /** Cancellable delay helper */
  function delay(ms) {
    return new Promise(function(resolve) {
      if (shuffleAborted) return resolve(null);
      var id = setTimeout(function() {
        if (shuffleAborted) return resolve(null);
        resolve(true);
      }, ms);
      // Store timer ID for potential cancellation
      delay._lastId = id;
    });
  }
  delay._lastId = null;

  /** Cancel an active shuffle (prevents state mutations after abort) */
  function cancelShuffle() {
    shuffleAborted = true;
    if (delay._lastId) clearTimeout(delay._lastId);
  }

  /* ---------- Shuffle State Machine ---------- */
  var TIMING = {
    buildup:  800,   // ms — wave pulse phase
    shuffle:  2500,  // ms — rapid flicker phase
    settle:   1200,  // ms — slow-down phase
    reveal:   800,   // ms — final reveal
  };

  /* ---------- Regular 37-Cell Honeycomb Layout Matrix ---------- */
  // 1 represents an active animal slot, 0 represents an empty background cell
  var GRID_LAYOUT = [
    [0, 1, 1, 1],          // Row 1 (4 cells, 3 active)
    [1, 1, 1, 1, 0],       // Row 2 (5 cells, 4 active)
    [1, 1, 1, 1, 1, 0],    // Row 3 (6 cells, 5 active)
    [0, 1, 1, 0, 1, 1, 0], // Row 4 (7 cells, 4 active, center is E - hive entrance!)
    [1, 1, 1, 1, 1, 0],    // Row 5 (6 cells, 5 active)
    [0, 1, 1, 1, 0],       // Row 6 (5 cells, 3 active)
    [1, 1, 1, 0]           // Row 7 (4 cells, 3 active)
  ];

  /* ---------- Build Grid ---------- */
  function buildGrid() {
    grid.innerHTML = '';
    var animalIdx = 0;

    GRID_LAYOUT.forEach(function(rowPattern) {
      var row = document.createElement('div');
      row.className = 'hex-row';

      rowPattern.forEach(function(isAnimal) {
        var hex = document.createElement('div');
        var inner = document.createElement('div');
        inner.className = 'hex-item-inner';

        if (isAnimal && animalIdx < ANIMALS.length) {
          var animal = ANIMALS[animalIdx];
          hex.className = 'hex-item hex-item--active hex-item--idle';
          hex.dataset.index = animalIdx;

          var emojiSpan = document.createElement('span');
          emojiSpan.className = 'hex-item__emoji';
          emojiSpan.textContent = animal.emoji;

          var nameSpan = document.createElement('span');
          nameSpan.className = 'hex-item__name';
          nameSpan.textContent = animal.name;

          inner.appendChild(emojiSpan);
          inner.appendChild(nameSpan);
          hex.appendChild(inner);

          // Link animal cards: Clicking a hex cell directly redirects to its playback details page!
          (function(currentAnimal) {
            hex.addEventListener('click', function() {
              if (isShuffling) return;
              window.location.href = 'playback.html?animal=' + encodeURIComponent(currentAnimal.name);
            });
          })(animal);

          animalIdx++;
        } else {
          // Decorative background cell
          hex.className = 'hex-item hex-item--empty';
          hex.appendChild(inner);
        }
        row.appendChild(hex);
      });
      grid.appendChild(row);
    });
  }

  /* ---------- Helpers ---------- */
  function getHexEl(i) {
    return grid.querySelectorAll('.hex-item--active')[i];
  }

  function clearAnimations() {
    var hexes = grid.querySelectorAll('.hex-item');
    for (var i = 0; i < hexes.length; i++) {
      hexes[i].classList.remove(
        'hex-item--idle', 'hex-item--wave', 'hex-item--shuffle',
        'hex-item--glow', 'hex-item--chosen', 'hex-item--dimmed'
      );
    }
  }

  function resetAll() {
    cancelShuffle(); // Cancel any in-flight phase promises
    clearAnimations();
    var hexes = grid.querySelectorAll('.hex-item--active');
    for (var i = 0; i < hexes.length; i++) {
      hexes[i].classList.add('hex-item--idle');
    }
    btn.classList.remove('rp-btn--shuffling');
    btnLabel.textContent = 'Initiate Shuffle';
    btnIcon.textContent = '✦';

    var wrapper = document.querySelector('.hex-grid-wrapper');
    if (wrapper) wrapper.classList.remove('hex-grid-wrapper--shuffling');

    if (result) {
      result.classList.remove('rp-result--visible');
      result.style.display = 'none';
    }
    isShuffling = false;
    selectedIndex = -1;
  }

  function removeConfetti() {
    var particles = document.querySelectorAll('.hex-confetti');
    for (var i = 0; i < particles.length; i++) {
      particles[i].remove();
    }
  }

  function spawnConfetti(hexEl) {
    var rect = hexEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    // Theme-aligned palette: gold, amber, white, bronze, dark grey
    var colors = ['#ffd700', '#f59e0b', '#b58900', '#444444', '#f7f7f7', '#ffffff', '#eab308'];

    for (var i = 0; i < 32; i++) {
      var particle = document.createElement('div');
      particle.className = 'hex-confetti';
      var angle = Math.random() * 360;
      var dist = 50 + Math.random() * 120;
      var tx = Math.cos(angle * Math.PI / 180) * dist;
      var ty = Math.sin(angle * Math.PI / 180) * dist - 80;
      particle.style.cssText =
        'left:' + cx + 'px; top:' + cy + 'px; ' +
        'background:' + colors[Math.floor(Math.random() * colors.length)] + '; ' +
        'width:' + (6 + Math.random() * 10) + 'px; ' +
        'height:' + (6 + Math.random() * 10) + 'px; ' +
        'animation: confettiFall 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; ' +
        '--tx:' + tx + 'px; --ty:' + ty + 'px; ' +
        'position: fixed; z-index: 9999; ' +
        'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);';
      document.body.appendChild(particle);
    }
    setTimeout(removeConfetti, 1600);
  }

  /* ---------- Phase 1: Buildup (wave) ---------- */
  function phaseBuildup() {
    return new Promise(function(resolve) {
      if (shuffleAborted) return resolve(null);
      clearAnimations();
      var hexes = grid.querySelectorAll('.hex-item--active');
      for (var i = 0; i < hexes.length; i++) {
        (function(idx) {
          setTimeout(function() {
            if (shuffleAborted) return;
            hexes[idx].classList.add('hex-item--wave');
          }, idx * 30);
        })(i);
      }
      setTimeout(function() {
        if (shuffleAborted) return resolve(null);
        resolve(true);
      }, hexes.length * 30 + 400);
    });
  }

  /* ---------- Phase 2: Shuffle flicker ---------- */
  function phaseShuffle() {
    return new Promise(function(resolve) {
      if (shuffleAborted) return resolve(null);

      var hexes = grid.querySelectorAll('.hex-item--active');
      var flickerId = setInterval(function() {
        if (shuffleAborted) { clearInterval(flickerId); return; }
        for (var i = 0; i < hexes.length; i++) {
          if (Math.random() < 0.25) {
            hexes[i].classList.add('hex-item--shuffle');
            setTimeout(function(el) {
              if (!shuffleAborted) el.classList.remove('hex-item--shuffle');
            }, 150, hexes[i]);
          }
        }
      }, 100);

      var glowId = setInterval(function() {
        if (shuffleAborted) { clearInterval(glowId); return; }
        var prevGlow = document.querySelectorAll('.hex-item--glow');
        for (var i = 0; i < prevGlow.length; i++) {
          prevGlow[i].classList.remove('hex-item--glow');
        }
        var count = 2 + Math.floor(Math.random() * 4);
        for (var g = 0; g < count; g++) {
          var r = Math.floor(Math.random() * hexes.length);
          hexes[r].classList.add('hex-item--glow');
          setTimeout(function(el) {
            if (!shuffleAborted) el.classList.remove('hex-item--glow');
          }, 300 + Math.random() * 400, hexes[r]);
        }
      }, 250);

      function slowDown() {
        clearInterval(flickerId);
        clearInterval(glowId);

        if (shuffleAborted) { resolve(null); return; }

        var glows = document.querySelectorAll('.hex-item--glow');
        for (var i = 0; i < glows.length; i++) {
          glows[i].classList.remove('hex-item--glow');
        }

        var settleStart = Date.now();
        function settleStep() {
          if (shuffleAborted) { resolve(null); return; }
          var elapsed = Date.now() - settleStart;
          var pct = elapsed / TIMING.settle;
          if (pct >= 1) {
            for (var i = 0; i < hexes.length; i++) {
              hexes[i].classList.remove('hex-item--shuffle');
            }
            resolve(true);
            return;
          }
          var intensity = 1 - pct;
          for (var i = 0; i < hexes.length; i++) {
            if (Math.random() < 0.15 * intensity) {
              hexes[i].classList.add('hex-item--shuffle');
              setTimeout(function(el) {
                if (!shuffleAborted) el.classList.remove('hex-item--shuffle');
              }, 80 + pct * 200, hexes[i]);
            }
          }
          requestAnimationFrame(settleStep);
        }
        settleStep();
      }

      setTimeout(function() { if (shuffleAborted) resolve(null); else slowDown(); }, TIMING.shuffle);
    });
  }

  /* ---------- Phase 3: Pick & Reveal ---------- */
  function phasePick() {
    return new Promise(function(resolve) {
      if (shuffleAborted) return resolve(null);

      var hexes = grid.querySelectorAll('.hex-item--active');
      selectedIndex = Math.floor(Math.random() * ANIMALS.length);
      var animal = ANIMALS[selectedIndex];

      // Dim all other hexes
      var allHexes = grid.querySelectorAll('.hex-item');
      for (var i = 0; i < allHexes.length; i++) {
        if (allHexes[i] !== hexes[selectedIndex]) {
          allHexes[i].classList.add('hex-item--dimmed');
        }
      }

      var chosen = getHexEl(selectedIndex);
      chosen.classList.remove('hex-item--idle', 'hex-item--shuffle', 'hex-item--wave', 'hex-item--glow');
      chosen.classList.add('hex-item--chosen');

      setTimeout(function() {
        if (!shuffleAborted) spawnConfetti(chosen);
      }, 300);

      setTimeout(function() {
        if (shuffleAborted) return resolve(null);
        resolve(animal);
      }, TIMING.reveal);
    });
  }

  /* ---------- Phase 4: Show result ---------- */
  function showResult(animal) {
    if (!result) return;
    resultEmoji.textContent = animal.emoji;
    resultName.textContent = animal.name;
    resultTagline.textContent = animal.tagline;

    var slug = animal.name.toLowerCase().replace(/\s+/g, '-');
    resultWatch.href = 'playback.html?animal=' + encodeURIComponent(animal.name);

    result.style.display = 'flex';
    result.classList.remove('rp-result--visible');
    void result.offsetWidth; // force reflow
    result.classList.add('rp-result--visible');

    var wrapper = document.querySelector('.hex-grid-wrapper');
    if (wrapper) wrapper.classList.remove('hex-grid-wrapper--shuffling');

    btn.classList.remove('rp-btn--shuffling');
    btnLabel.textContent = 'Initiate Shuffle';
    btnIcon.textContent = '✦';
    isShuffling = false;
  }

  /* ---------- Main Shuffle Sequence ---------- */
  function startShuffle() {
    if (isShuffling) return;
    shuffleAborted = false; // Reset abort flag for new shuffle
    isShuffling = true;

    if (result) {
      result.classList.remove('rp-result--visible');
      result.style.display = 'none';
    }
    removeConfetti();

    btn.classList.add('rp-btn--shuffling');
    btnLabel.textContent = 'Deciding fate...';
    btnIcon.textContent = '✦';

    var wrapper = document.querySelector('.hex-grid-wrapper');
    if (wrapper) wrapper.classList.add('hex-grid-wrapper--shuffling');

    var hexes = grid.querySelectorAll('.hex-item--active');
    for (var i = 0; i < hexes.length; i++) {
      hexes[i].classList.remove('hex-item--idle', 'hex-item--dimmed', 'hex-item--chosen');
    }

    // Immediately dim empty background cells to highlight draw focus
    var emptyHexes = grid.querySelectorAll('.hex-item--empty');
    for (var i = 0; i < emptyHexes.length; i++) {
      emptyHexes[i].classList.add('hex-item--dimmed');
    }

    phaseBuildup().then(function() {
      return phaseShuffle();
    }).then(function() {
      return phasePick();
    }).then(function(animal) {
      showResult(animal);
    });
  }

  /* ---------- Init (called by app.js after includes-loaded) ---------- */
  function init() {
    // Resolve DOM references now that the page is fully loaded
    grid          = document.getElementById('hexGrid');
    btn           = document.getElementById('rpBtn');
    btnIcon       = document.querySelector('.rp-btn__icon');
    btnLabel      = document.getElementById('rpBtnLabel');
    result        = document.getElementById('rpResult');
    resultEmoji   = document.getElementById('rpResultEmoji');
    resultName    = document.getElementById('rpResultName');
    resultTagline = document.getElementById('rpResultTagline');
    resultWatch   = document.getElementById('rpResultWatch');
    resultAgain   = document.getElementById('rpResultAgain');
    resultClose   = document.getElementById('rpResultClose');

    // Build the honeycomb grid
    if (grid) buildGrid();

    // Bind event listeners
    if (btn) btn.addEventListener('click', startShuffle);

    if (resultAgain) {
      resultAgain.addEventListener('click', function(e) {
        e.preventDefault();
        resetAll();
        setTimeout(startShuffle, 400);
      });
    }

    if (resultClose) {
      resultClose.addEventListener('click', function(e) {
        e.preventDefault();
        resetAll();
      });
    }

    if (result) {
      result.addEventListener('click', function(e) {
        if (e.target === result && result.classList.contains('rp-result--visible')) {
          resetAll();
        }
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && result && result.classList.contains('rp-result--visible')) {
        resetAll();
      }
    });

    document.dispatchEvent(new Event('randomVidReady'));
  }

  return {
    init: init
  };
})();
