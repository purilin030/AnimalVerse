/* ============================================================
   Player Animal — Animal info panel with tabs
   Fetches Wikipedia, Wikidata, and iNaturalist data and renders
   tabbed info with breadcrumbs and a typewriter animation effect.
   ============================================================ */
App.playerAnimal = (function() {
  'use strict';

  var _animalInfoCache = null;

  // ── Tab switching events (bound once, early) ──────────────
  function initTabEvents() {
    var tabsContainer = document.getElementById('animal-info-tabs');
    if (!tabsContainer) return;
    tabsContainer.addEventListener('click', function(e) {
      var tab = e.target.closest('.animal-info__tab');
      if (!tab || tab.classList.contains('is-active')) return;
      var source = tab.getAttribute('data-source');
      if (source) switchTab(source);
    });
  }

  // ── Main entry point ─────────────────────────────────────
  function render(video) {
    var container = document.getElementById('animal-info-body');
    var attribution = document.getElementById('animal-info-attribution');
    if (!container) return;

    var animalName = App.animalInfo.extractAnimalName(video.title);

    // Update Active Subject display name & local image
    var subjectEl = document.getElementById('animal-current-name');
    var statusImg = document.getElementById('animal-status-img');
    var statusImgContainer = document.getElementById('animal-status-img-container');

    if (subjectEl) {
      subjectEl.textContent = animalName ? animalName.toUpperCase() : 'UNKNOWN';
    }

    if (statusImg && statusImgContainer) {
      if (animalName) {
        var localImgPath = video.posterUrl || video.thumbnail || '';

        // If the posterUrl is empty or doesn't belong to local library, build a dynamic fallback path
        if (!localImgPath || localImgPath.indexOf('assets/images/library') === -1) {
          var refUrl = video.videoUrl || '';
          var pathMatch = refUrl.match(/assets\/images\/library\/([^\/]+)\/([^\/]+)/i);
          if (pathMatch) {
            var folderClass = pathMatch[1];
            var folderAnimal = pathMatch[2];
            localImgPath = 'assets/images/library/' + folderClass + '/' + folderAnimal + '/photos/000001.jpg';
          } else {
            // Fallback category mapping
            var category = video.category ? video.category.toLowerCase() : '';
            var className = 'Mammals';
            if (category === 'mammals') className = 'Mammals';
            else if (category === 'birds') className = 'Birds';
            else if (category === 'reptiles') className = 'Reptiles';
            else if (category === 'amphibians') className = 'Amphibians';
            else if (category === 'aquatic') className = 'Fish';

            var kebabName = animalName.toLowerCase().replace(/\s+/g, '-');
            localImgPath = 'assets/images/library/' + className + '/' + kebabName + '/photos/000001.jpg';
          }
        }

        statusImg.src = localImgPath;
        statusImgContainer.style.display = 'block';
      } else {
        statusImgContainer.style.display = 'none';
      }
    }

    if (!animalName) {
      container.innerHTML =
        '<div class="animal-info__empty">' +
          '<div class="animal-info__empty-icon">🐾</div>' +
          '<p class="animal-info__empty-text">No animal info available for this video.</p>' +
        '</div>';
      if (attribution) attribution.style.display = 'none';
      return;
    }

    // Show loading state
    container.innerHTML = '<div class="animal-info__loading"><p class="text-muted">📖 Loading animal info...</p></div>';

    // Progressive loading feedback
    var loadingTimer = setTimeout(function() {
      var loadingEl = container.querySelector('.animal-info__loading');
      if (loadingEl) {
        loadingEl.innerHTML = '<p class="text-muted">⏳ Fetching from databases...</p>';
      }
    }, 3000);

    // Fetch all sources
    App.animalInfo.fetchAll(animalName).then(function(result) {
      clearTimeout(loadingTimer);
      _animalInfoCache = result;

      // Render breadcrumbs if we have taxonomy data
      renderBreadcrumbs(result);

      if (!result.wikipedia && !result.wikidata && !result.inaturalist) {
        container.innerHTML =
          '<div class="animal-info__empty">' +
            '<div class="animal-info__empty-icon">🔍</div>' +
            '<p class="animal-info__empty-text">Could not find info for "' + App.ui.escapeHtml(animalName) + '".</p>' +
            '<p class="animal-info__empty-sub">Try watching a different video.</p>' +
          '</div>';
        if (attribution) attribution.style.display = 'none';
        return;
      }
      // Render the active tab (default: wikipedia)
      switchTab('wikipedia');
    });
  }

  // ── Breadcrumbs ──────────────────────────────────────────
  function renderBreadcrumbs(result) {
    var container = document.getElementById('taxonomy-breadcrumbs');
    if (!container) return;

    var ancestors = result && result.inaturalist && result.inaturalist.ancestors;
    if (!ancestors || ancestors.length === 0) {
      container.style.display = 'none';
      return;
    }

    var html = '<ul class="breadcrumb-list">';
    for (var i = 0; i < ancestors.length; i++) {
      var a = ancestors[i];
      var link = 'gallery.html?q=' + encodeURIComponent(a.name);
      html += '<li class="breadcrumb-item">' +
                '<span class="breadcrumb-rank">' + App.ui.escapeHtml(a.rank) + '</span>' +
                '<a class="breadcrumb-name" href="' + link + '">' + App.ui.escapeHtml(a.name) + '</a>' +
              '</li>';
    }
    // Also append the actual animal name
    html += '<li class="breadcrumb-item">' +
              '<span class="breadcrumb-rank">species</span>' +
              '<span class="breadcrumb-name">' + App.ui.escapeHtml(result.animalName || '') + '</span>' +
            '</li>';

    html += '</ul>';
    container.innerHTML = html;
    container.style.display = 'block';
  }

  // ── HTML Builders (one per data source) ──────────────────
  // Each returns { html, sourceUrl, sourceName } or null.

  function buildWikipediaHTML(data) {
    if (!data.wikipedia) return null;
    var extract = data.wikipedia.extract;
    var rawSentences = [];

    var matches = extract.match(/[^.!?.!?]+[.!?.!?]*/g);
    if (matches) {
      rawSentences = matches.map(function(s) { return s.trim(); })
                            .filter(function(s) { return s.length > 5; });
    } else {
      rawSentences = extract.split('\n').map(function(s) { return s.trim(); })
                            .filter(function(s) { return s.length > 5; });
    }

    var intros = [], bullets = [];
    for (var j = 0; j < rawSentences.length; j++) {
      var s = rawSentences[j];
      var isIntro = s.slice(-1) === ':' ||
                    s.toLowerCase().endsWith('include') ||
                    s.toLowerCase().endsWith('includes') ||
                    s.toLowerCase().endsWith('following');
      if (isIntro && j < rawSentences.length - 1) { intros.push(s); }
      else { bullets.push(s); }
    }

    var formatted = '';
    for (var a = 0; a < intros.length; a++) {
      formatted += '<p class="animal-info__wiki-intro">' + App.ui.escapeHtml(intros[a]) + '</p>';
    }
    if (bullets.length > 0) {
      formatted += '<ul class="animal-info__wiki-bullets">';
      var maxBullets = Math.min(bullets.length, 5);
      for (var b = 0; b < maxBullets; b++) {
        formatted += '<li class="animal-info__wiki-bullet-item">' + App.ui.escapeHtml(bullets[b]) + '</li>';
      }
      formatted += '</ul>';
    }

    return {
      html: '<div class="animal-info__wiki-extract">' + formatted + '</div>',
      sourceUrl: data.wikipedia.pageUrl || '',
      sourceName: data.wikipedia.source || 'Wikipedia'
    };
  }

  function buildWikidataHTML(data) {
    if (!data.wikidata) return null;
    var wd = data.wikidata;
    var html = '<div class="animal-info__wikidata">';

    if (wd.description) {
      html += '<p class="animal-info__wikidata-desc">' + App.ui.escapeHtml(wd.description) + '</p>';
    }
    if (wd.conservationStatus) {
      var formattedStatus = App.animalInfo.formatConservationStatus(wd.conservationStatus);
      html += '<div class="animal-info__fact-row">' +
        '<span class="animal-info__fact-label">Conservation</span>' +
        '<span class="animal-info__fact-value">' + (formattedStatus || App.ui.escapeHtml(wd.conservationStatus)) + '</span>' +
        '</div>';
    }

    var factRows = [
      { label: 'Scientific Name', value: wd.scientificName, em: true },
      { label: 'Rank',            value: wd.taxonRank },
      { label: 'Kingdom',         value: wd.kingdom },
      { label: 'Phylum',          value: wd.phylum },
      { label: 'Lifespan',        value: wd.lifespan },
      { label: 'Diet',            value: wd.diet }
    ];
    for (var f = 0; f < factRows.length; f++) {
      var row = factRows[f];
      if (!row.value) continue;
      var valHtml = row.em ? '<em>' + App.ui.escapeHtml(row.value) + '</em>' : App.ui.escapeHtml(row.value);
      html += '<div class="animal-info__fact-row">' +
        '<span class="animal-info__fact-label">' + row.label + '</span>' +
        '<span class="animal-info__fact-value">' + valHtml + '</span>' +
        '</div>';
    }
    html += '</div>';

    return { html: html, sourceUrl: wd.pageUrl || '', sourceName: wd.source || 'Wikidata' };
  }

  function buildINaturalistHTML(data) {
    if (!data.inaturalist) return null;
    var inat = data.inaturalist;
    var html = '<div class="animal-info__inat">';

    if (inat.commonName) {
      html += '<p class="animal-info__inat-desc"><strong>' + App.ui.escapeHtml(inat.commonName) + '</strong></p>';
    }
    if (inat.wikipediaSummary) {
      html += '<p class="animal-info__inat-desc">' +
        App.ui.escapeHtml(inat.wikipediaSummary.substring(0, 300)) +
        (inat.wikipediaSummary.length > 300 ? '...' : '') + '</p>';
    }

    html += '<div class="animal-info__facts-grid">';
    if (inat.conservationStatus) {
      var inatStatus = App.animalInfo.formatConservationStatus(inat.conservationStatus);
      html += '<div class="animal-info__fact-row">' +
        '<span class="animal-info__fact-label">Status</span>' +
        '<span class="animal-info__fact-value">' + (inatStatus || App.ui.escapeHtml(inat.conservationStatus)) + '</span>' +
        '</div>';
    }
    var inatRows = [
      { label: 'Scientific', value: inat.name,        em: true },
      { label: 'Rank',       value: inat.rank },
      { label: 'Group',      value: inat.iconicTaxon }
    ];
    for (var r = 0; r < inatRows.length; r++) {
      var ir = inatRows[r];
      if (!ir.value) continue;
      var irVal = ir.em ? '<em>' + App.ui.escapeHtml(ir.value) + '</em>' : App.ui.escapeHtml(ir.value);
      html += '<div class="animal-info__fact-row">' +
        '<span class="animal-info__fact-label">' + ir.label + '</span>' +
        '<span class="animal-info__fact-value">' + irVal + '</span>' +
        '</div>';
    }
    if (inat.observationsCount > 0) {
      html += '<div class="animal-info__fact-row">' +
        '<span class="animal-info__fact-label">Sightings</span>' +
        '<span class="animal-info__fact-value">' + inat.observationsCount.toLocaleString() + '</span>' +
        '</div>';
    }
    html += '</div>';

    if (inat.photos && inat.photos.length > 0) {
      html += '<ul class="animal-info__fun-facts" style="margin-top:12px">';
      for (var kk = 0; kk < inat.photos.length; kk++) {
        html += '<li class="animal-info__fun-fact" style="padding:0;overflow:hidden">' +
          '<img src="' + App.ui.escapeHtml(inat.photos[kk]) + '" ' +
          'alt="iNaturalist photo" ' +
          'style="width:100%;height:120px;object-fit:cover;display:block" ' +
          'loading="lazy" decoding="async"/></li>';
      }
      html += '</ul>';
    }
    html += '</div>';

    return { html: html, sourceUrl: inat.inatUrl || '', sourceName: 'iNaturalist' };
  }

  // ── Tab switch dispatcher ────────────────────────────────
  function switchTab(source) {
    var container  = document.getElementById('animal-info-body');
    var attribution = document.getElementById('animal-info-attribution');
    var sourceLink  = document.getElementById('animal-info-source-link');
    if (!container || !_animalInfoCache) return;

    // Update tab button active states
    var tabs = document.querySelectorAll('.animal-info__tab');
    for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('is-active'); }
    var activeTab = document.querySelector('.animal-info__tab[data-source="' + source + '"]');
    if (activeTab) activeTab.classList.add('is-active');

    // Call the right builder
    var builders = {
      wikipedia:   buildWikipediaHTML,
      wikidata:    buildWikidataHTML,
      inaturalist: buildINaturalistHTML
    };
    var builderFn = builders[source];
    var built     = builderFn ? builderFn(_animalInfoCache) : null;

    var html           = built ? built.html       : '';
    var showAttrib     = !!(built && (built.sourceUrl || built.sourceName));
    var sourceUrl      = built ? built.sourceUrl  : '';
    var sourceName     = built ? built.sourceName : '';

    if (!html) {
      html = '<div class="animal-info__empty">' +
        '<div class="animal-info__empty-icon">📝</div>' +
        '<p class="animal-info__empty-text">No data available for this source.</p>' +
        '<p class="animal-info__empty-sub">Try switching to another source tab.</p>' +
        '</div>';
      showAttrib = false;
    }

    container.innerHTML = html;

    // Typewriter effect on rendered text
    runTypewriter(container);

    // Update attribution footer
    if (attribution && sourceLink) {
      if (showAttrib && sourceUrl) {
        attribution.style.display = 'block';
        sourceLink.textContent = sourceName;
        sourceLink.href = sourceUrl;
      } else if (showAttrib && sourceName) {
        attribution.style.display = 'block';
        sourceLink.textContent = sourceName;
        sourceLink.href = '#';
        sourceLink.style.cursor = 'default';
      } else {
        attribution.style.display = 'none';
      }
    }
  }

  // ── Typewriter animation effect ──────────────────────────
  function runTypewriter(root) {
    var textNodes = [];
    function walk(node) {
      if (node.nodeType === 3) {
        if (node.textContent.trim().length > 0) textNodes.push(node);
      } else if (node.nodeType === 1) {
        var tag = node.tagName ? node.tagName.toUpperCase() : '';
        if (tag !== 'SCRIPT' && tag !== 'STYLE') {
          for (var c = 0; c < node.childNodes.length; c++) { walk(node.childNodes[c]); }
        }
      }
    }
    walk(root);
    if (textNodes.length === 0) return;

    var originals = [];
    for (var i = 0; i < textNodes.length; i++) {
      originals.push(textNodes[i].textContent);
      textNodes[i].textContent = '';
    }
    var nodeIdx = 0, charIdx = 0;
    var SPEED = 12;
    var cursorSpan = document.createElement('span');
    cursorSpan.className = 'pixel-cursor';
    if (textNodes[0] && textNodes[0].parentNode) {
      textNodes[0].parentNode.insertBefore(cursorSpan, textNodes[0].nextSibling);
    }
    function tick() {
      if (nodeIdx >= textNodes.length) {
        if (cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
        return;
      }
      var node = textNodes[nodeIdx];
      var full = originals[nodeIdx];
      if (charIdx < full.length) {
        node.textContent += full[charIdx++];
        setTimeout(tick, SPEED);
      } else {
        nodeIdx++; charIdx = 0;
        if (nodeIdx < textNodes.length && textNodes[nodeIdx].parentNode) {
          var nParent = textNodes[nodeIdx].parentNode;
          if (cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
          nParent.insertBefore(cursorSpan, textNodes[nodeIdx].nextSibling);
        }
        setTimeout(tick, SPEED);
      }
    }
    tick();
  }

  return {
    initTabEvents: initTabEvents,
    render: render
  };
})();
