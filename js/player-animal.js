/* ============================================================
   Player Animal — Animal info panel with tabs & Diagnostics
   Fetches Wikipedia, Wikidata, and iNaturalist data, renders
   tabbed info, and provides comprehensive debugging/inspection
   to ensure transparency whether data is missing or errored.
   ============================================================ */
App.playerAnimal = (function() {
  'use strict';

  var _animalInfoCache = null;
  var _currentVideo = null;
  var _currentSource = 'wikipedia';

  // ── Tab switching events (bound once, early) ──────────────
  function initTabEvents() {
    var tabsContainer = document.getElementById('animal-info-tabs');
    if (!tabsContainer) return;
    tabsContainer.addEventListener('click', function(e) {
      // Check if clicked the debug button
      var debugBtn = e.target.closest('.animal-info__debug-toggle');
      if (debugBtn) {
        toggleOverviewModal();
        return;
      }

      var tab = e.target.closest('.animal-info__tab');
      if (!tab || tab.classList.contains('is-active')) return;
      var source = tab.getAttribute('data-source');
      if (source) switchTab(source);
    });

    // Delegate retry and debug toggle inside the body container
    var container = document.getElementById('animal-info-body');
    if (container) {
      container.addEventListener('click', function(e) {
        var retryBtn = e.target.closest('[data-action="retry-source"]');
        if (retryBtn) {
          var src = retryBtn.getAttribute('data-source') || _currentSource;
          retrySource(src);
          return;
        }

        var inspectToggle = e.target.closest('[data-action="toggle-debug-inspector"]');
        if (inspectToggle) {
          var panel = inspectToggle.nextElementSibling;
          if (panel && panel.classList.contains('animal-info__debug-panel')) {
            var isHidden = panel.style.display === 'none' || !panel.style.display;
            panel.style.display = isHidden ? 'block' : 'none';
            inspectToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            var arrow = inspectToggle.querySelector('.debug-arrow');
            if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
          }
          return;
        }

        var photoBtn = e.target.closest('[data-action="open-photo-lightbox"]');
        if (photoBtn) {
          e.preventDefault();
          var pSrc = photoBtn.getAttribute('data-photo-src');
          var pTitle = photoBtn.getAttribute('data-photo-title') || 'Species Observation Photo';
          var pInatUrl = photoBtn.getAttribute('data-inat-url') || '';
          openPhotoLightbox(pSrc, pTitle, pInatUrl);
          return;
        }
      });
    }
  }

  // ── Main entry point ─────────────────────────────────────
  function render(video) {
    _currentVideo = video;
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

    // Ensure debug button exists in tab header
    ensureDebugTabButton();

    if (!animalName) {
      _animalInfoCache = {
        wikipedia: null,
        wikidata: null,
        inaturalist: null,
        animalName: '',
        diagnostics: {
          wikipedia: { source: 'Wikipedia', status: 'INVALID_QUERY', reason: 'No animal name could be extracted from video title "' + (video.title || '') + '"' },
          wikidata: { source: 'Wikidata', status: 'INVALID_QUERY', reason: 'No animal name extracted.' },
          inaturalist: { source: 'iNaturalist', status: 'INVALID_QUERY', reason: 'No animal name extracted.' }
        }
      };

      container.innerHTML =
        '<div class="animal-info__empty">' +
          '<div class="animal-info__empty-icon">🐾</div>' +
          '<p class="animal-info__empty-text">No animal name identified in video title.</p>' +
          '<p class="animal-info__empty-sub">Title: "' + App.ui.escapeHtml(video.title || '') + '"</p>' +
          buildDebugInspectorHTML('wikipedia') +
        '</div>';
      if (attribution) attribution.style.display = 'none';
      return;
    }

    // Show loading state
    container.innerHTML = '<div class="animal-info__loading"><p class="text-muted">📖 Querying scientific databases for "' + App.ui.escapeHtml(animalName) + '"...</p></div>';

    // Progressive loading feedback
    var loadingTimer = setTimeout(function() {
      var loadingEl = container.querySelector('.animal-info__loading');
      if (loadingEl) {
        loadingEl.innerHTML = '<p class="text-muted">⏳ Waiting for Wikipedia, Wikidata & iNaturalist responses...</p>';
      }
    }, 2500);

    // Fetch all sources with full diagnostics
    App.animalInfo.fetchAll(animalName).then(function(result) {
      clearTimeout(loadingTimer);
      _animalInfoCache = result;

      // Output formatted debugging info to developer console
      logDiagnosticsToConsole(animalName, video.title, result);

      // Render breadcrumbs if we have taxonomy data
      renderBreadcrumbs(result);

      // Render the active tab
      switchTab(_currentSource || 'wikipedia');
    });
  }

  // ── Inject / Ensure Debug toggle button in Tab Row ────────
  function ensureDebugTabButton() {
    var tabsContainer = document.getElementById('animal-info-tabs');
    if (!tabsContainer) return;

    var existingBtn = tabsContainer.querySelector('.animal-info__debug-toggle');
    if (!existingBtn) {
      var btn = document.createElement('button');
      btn.className = 'animal-info__debug-toggle';
      btn.type = 'button';
      btn.title = 'View API Diagnostics & Health Status';
      btn.innerHTML = '🛠️ <span class="debug-btn-text">Debug</span>';
      tabsContainer.appendChild(btn);
    }
  }

  // ── Console Diagnostic Logging ────────────────────────────
  function logDiagnosticsToConsole(animalName, title, result) {
    if (!window.console) return;
    try {
      var diags = result.diagnostics || {};
      var wikiDiag = diags.wikipedia || {};
      var wdDiag   = diags.wikidata || {};
      var inatDiag = diags.inaturalist || {};

      var allSuccess = (wikiDiag.status === 'SUCCESS' && wdDiag.status === 'SUCCESS' && inatDiag.status === 'SUCCESS');
      var badgeStyle = allSuccess
        ? 'background:#10b981;color:#fff;font-weight:bold;padding:2px 8px;border-radius:4px'
        : 'background:#f59e0b;color:#111;font-weight:bold;padding:2px 8px;border-radius:4px';

      console.groupCollapsed('%c[AnimalVerse API Debug]%c ' + animalName + ' (' + (allSuccess ? 'All OK' : 'Check Status') + ')', badgeStyle, 'color:#3b82f6;font-weight:bold;margin-left:6px');
      console.log('Video Title:   ', title);
      console.log('Queried Term:  ', animalName);
      console.table([
        { Source: 'Wikipedia',   Status: wikiDiag.status,   'HTTP Code': wikiDiag.statusCode, 'Latency (ms)': wikiDiag.durationMs, 'Data Found': !!result.wikipedia, Reason: wikiDiag.reason },
        { Source: 'Wikidata',    Status: wdDiag.status,    'HTTP Code': wdDiag.statusCode,   'Latency (ms)': wdDiag.durationMs,   'Data Found': !!result.wikidata,  Reason: wdDiag.reason },
        { Source: 'iNaturalist', Status: inatDiag.status, 'HTTP Code': inatDiag.statusCode, 'Latency (ms)': inatDiag.durationMs, 'Data Found': !!result.inaturalist,Reason: inatDiag.reason }
      ]);
      console.log('Direct API Endpoints:', {
        Wikipedia: wikiDiag.url,
        Wikidata: wdDiag.url,
        iNaturalist: inatDiag.url
      });
      console.log('Full Raw Cache Object:', result);
      console.groupEnd();
    } catch (e) {
      // Silent fail in console
    }
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
    html += '<li class="breadcrumb-item">' +
              '<span class="breadcrumb-rank">species</span>' +
              '<span class="breadcrumb-name">' + App.ui.escapeHtml(result.animalName || '') + '</span>' +
            '</li>';

    html += '</ul>';
    container.innerHTML = html;
    container.style.display = 'block';
  }

  // ── HTML Builders (one per data source) ──────────────────
  function buildWikipediaHTML(data) {
    if (!data || !data.wikipedia || (!data.wikipedia.extract && !data.wikipedia.overview)) return null;
    
    var wiki = data.wikipedia;
    var analysis = (wiki.overview && wiki.overview.length > 0)
      ? { overview: wiki.overview, speciesList: wiki.speciesList || [], highlights: wiki.highlights || [] }
      : (App.animalInfo.analyzeWikipediaText ? App.animalInfo.analyzeWikipediaText(wiki.extract || '') : { overview: [wiki.extract || ''], speciesList: [], highlights: [] });

    var overview = analysis.overview || [];
    var speciesList = analysis.speciesList || [];
    var highlights = analysis.highlights || [];

    if (overview.length === 0 && speciesList.length === 0 && highlights.length === 0) {
      if (wiki.extract && wiki.extract.trim()) {
        overview = [wiki.extract.trim()];
      } else {
        return null;
      }
    }

    var html = '<div class="animal-info__wiki-container">';

    // 1. Overview Section (Point Form)
    if (overview.length > 0) {
      html += '<div class="animal-info__wiki-section">' +
        '<div class="animal-info__wiki-section-title">📌 Overview</div>' +
        '<ul class="animal-info__wiki-point-list">';
      for (var o = 0; o < overview.length; o++) {
        html += '<li class="animal-info__wiki-point-item">' +
          '<span class="wiki-point-bullet" aria-hidden="true">▪</span>' +
          '<span class="wiki-point-text">' + App.ui.escapeHtml(overview[o]) + '</span>' +
          '</li>';
      }
      html += '</ul>' +
        '</div>';
    }

    // 2. Notable Species Section (Individual clean items - not bundled into a long paragraph)
    if (speciesList.length > 0) {
      html += '<div class="animal-info__wiki-section">' +
        '<div class="animal-info__wiki-section-title">🐾 Notable Species / Examples</div>' +
        '<ul class="animal-info__wiki-species-list">';
      for (var s = 0; s < speciesList.length; s++) {
        var sp = speciesList[s];
        var detailHtml = sp.detail ? '<span class="wiki-species-detail">— ' + App.ui.escapeHtml(sp.detail) + '</span>' : '';
        html += '<li class="animal-info__wiki-species-item">' +
          '<span class="wiki-species-bullet" aria-hidden="true">▪</span>' +
          '<div class="wiki-species-content">' +
            '<strong class="wiki-species-name">' + App.ui.escapeHtml(sp.name) + '</strong> ' +
            detailHtml +
          '</div>' +
          '</li>';
      }
      html += '</ul>' +
        '</div>';
    } else if (highlights.length > 0) {
      // 3. Key Highlights (for species without sub-species lists)
      html += '<div class="animal-info__wiki-section">' +
        '<div class="animal-info__wiki-section-title">⚡ Key Facts</div>' +
        '<ul class="animal-info__wiki-point-list">';
      for (var h = 0; h < highlights.length; h++) {
        html += '<li class="animal-info__wiki-point-item">' +
          '<span class="wiki-point-bullet" aria-hidden="true">▪</span>' +
          '<span class="wiki-point-text">' + App.ui.escapeHtml(highlights[h]) + '</span>' +
          '</li>';
      }
      html += '</ul>' +
        '</div>';
    }

    html += '</div>';

    return {
      html: html,
      sourceUrl: wiki.pageUrl || '',
      sourceName: 'Wikipedia ↗ (Full Article)'
    };
  }

  function buildWikidataHTML(data) {
    if (!data || !data.wikidata) return null;
    var wd = data.wikidata;

    var factRows = [
      { label: 'Scientific Name', value: wd.scientificName, em: true },
      { label: 'Rank',            value: wd.taxonRank },
      { label: 'Kingdom',         value: wd.kingdom },
      { label: 'Phylum',          value: wd.phylum },
      { label: 'Lifespan',        value: wd.lifespan },
      { label: 'Diet',            value: wd.diet }
    ];

    var validFactRows = factRows.filter(function(r) { return !!r.value; });
    var hasContent = !!(wd.description || wd.conservationStatus || validFactRows.length > 0);
    if (!hasContent) return null;

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

    for (var f = 0; f < validFactRows.length; f++) {
      var row = validFactRows[f];
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
    if (!data || !data.inaturalist) return null;
    var inat = data.inaturalist;

    var inatRows = [
      { label: 'Scientific', value: inat.name,        em: true },
      { label: 'Rank',       value: inat.rank },
      { label: 'Group',      value: inat.iconicTaxon }
    ].filter(function(r) { return !!r.value; });

    var hasPhotos = inat.photos && inat.photos.length > 0;
    var hasContent = !!(inat.commonName || inat.wikipediaSummary || inat.conservationStatus || inatRows.length > 0 || hasPhotos);
    if (!hasContent) return null;

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

    for (var r = 0; r < inatRows.length; r++) {
      var ir = inatRows[r];
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

    if (hasPhotos) {
      html += '<div class="animal-info__inat-gallery" style="margin-top:12px">';
      var photoTitle = inat.commonName || inat.name || 'Species Observation Photo';
      var photoInatUrl = inat.inatUrl || '';
      for (var kk = 0; kk < inat.photos.length; kk++) {
        var photoUrl = inat.photos[kk];
        html += '<button type="button" class="animal-info__inat-photo-card" ' +
          'data-action="open-photo-lightbox" ' +
          'data-photo-src="' + App.ui.escapeHtml(photoUrl) + '" ' +
          'data-photo-title="' + App.ui.escapeHtml(photoTitle) + '" ' +
          'data-inat-url="' + App.ui.escapeHtml(photoInatUrl) + '" ' +
          'title="Click to preview large photo">' +
          '<img src="' + App.ui.escapeHtml(photoUrl) + '" ' +
          'data-original-src="' + App.ui.escapeHtml(photoUrl) + '" ' +
          'data-retry-count="0" ' +
          'alt="' + App.ui.escapeHtml(photoTitle) + '" ' +
          'referrerpolicy="no-referrer" ' +
          'loading="lazy" decoding="async" ' +
          'onerror="App.playerAnimal.handlePhotoError(this)" ' +
          'class="animal-info__inat-photo-img" />' +
          '<span class="animal-info__inat-photo-overlay">' +
            '<span class="inat-overlay-text">🔍 Click to Preview</span>' +
          '</span>' +
          '</button>';
      }
      html += '</div>';
    }
    html += '</div>';

    return { html: html, sourceUrl: inat.inatUrl || '', sourceName: 'iNaturalist ↗' };
  }

  // ── Build Smart Empty State with Diagnosis & Inspector ─────
  function buildSmartEmptyState(source) {
    var diag = (_animalInfoCache && _animalInfoCache.diagnostics && _animalInfoCache.diagnostics[source]) || {
      source: source,
      status: 'EMPTY_DATA',
      reason: 'No data returned for this source.'
    };

    var animalName = (_animalInfoCache && _animalInfoCache.animalName) || '';
    var sourceTitles = {
      wikipedia: 'Wikipedia Summary',
      wikidata: 'Wikidata Species Profile',
      inaturalist: 'iNaturalist Observation Database'
    };
    var niceSourceName = sourceTitles[source] || source;

    var icon = '📝';
    var statusTitle = 'No data available for this source';
    var statusBadgeClass = 'badge--empty';
    var statusBadgeText = 'Confirmed Empty (200 OK)';
    var showRetry = false;
    var explanation = 'The API for <strong>' + niceSourceName + '</strong> was queried successfully, but no matching article or taxonomy profile was found for <code>"' + App.ui.escapeHtml(animalName) + '"</code>.';

    if (diag.status === 'TIMEOUT') {
      icon = '⏱️';
      statusTitle = 'API Request Timed Out';
      statusBadgeClass = 'badge--warn';
      statusBadgeText = 'Timed Out (>6s)';
      showRetry = true;
      explanation = 'The connection to <strong>' + niceSourceName + '</strong> took too long (>6000ms). This is usually caused by network latency or API rate limits.';
    } else if (diag.status === 'NETWORK_ERROR') {
      icon = '📡';
      statusTitle = 'Network Connection Failed';
      statusBadgeClass = 'badge--error';
      statusBadgeText = 'Network / CORS Error';
      showRetry = true;
      explanation = 'Could not establish connection to <strong>' + niceSourceName + '</strong>. Please check your internet connection or browser security extensions.';
    } else if (diag.status === 'HTTP_ERROR') {
      icon = '⚠️';
      statusTitle = 'API Service Error (HTTP ' + (diag.statusCode || 'Err') + ')';
      statusBadgeClass = 'badge--error';
      statusBadgeText = 'HTTP ' + (diag.statusCode || 'Error');
      showRetry = true;
      explanation = 'The upstream API service returned an error status. (' + App.ui.escapeHtml(diag.reason || '') + ')';
    } else if (diag.status === 'PARSE_ERROR') {
      icon = '🧩';
      statusTitle = 'Data Parse Error';
      statusBadgeClass = 'badge--error';
      statusBadgeText = 'Parse Exception';
      showRetry = true;
      explanation = 'Received unexpected data structure from ' + niceSourceName + ': ' + App.ui.escapeHtml(diag.reason || '');
    } else if (diag.status === 'INVALID_QUERY') {
      icon = '🐾';
      statusTitle = 'No Animal Name Extracted';
      statusBadgeClass = 'badge--warn';
      statusBadgeText = 'Invalid Query';
      showRetry = false;
      explanation = 'Could not identify a valid species keyword from the current video title.';
    }

    var html = '<div class="animal-info__empty-smart">' +
      '<div class="animal-info__empty-icon">' + icon + '</div>' +
      '<div class="animal-info__status-pill ' + statusBadgeClass + '">' + statusBadgeText + '</div>' +
      '<h4 class="animal-info__empty-heading">' + statusTitle + '</h4>' +
      '<p class="animal-info__empty-desc">' + explanation + '</p>';

    if (showRetry) {
      html += '<div class="animal-info__empty-actions">' +
        '<button type="button" class="animal-info__btn-retry" data-action="retry-source" data-source="' + source + '">' +
          '🔄 Retry Fetching ' + (source === 'wikipedia' ? 'Wiki' : source === 'wikidata' ? 'Species' : 'iNat') +
        '</button>' +
        '</div>';
    } else {
      html += '<p class="animal-info__empty-sub">💡 Try switching to another tab above to check other databases.</p>';
    }

    // Attach collapsible debug inspector
    html += buildDebugInspectorHTML(source);
    html += '</div>';

    return html;
  }

  // ── Collapsible Debug Inspector Panel ───────────────────────
  function buildDebugInspectorHTML(source) {
    var diag = (_animalInfoCache && _animalInfoCache.diagnostics && _animalInfoCache.diagnostics[source]) || {
      source: source,
      query: (_animalInfoCache && _animalInfoCache.animalName) || '',
      status: 'UNKNOWN',
      statusCode: 0,
      durationMs: 0,
      url: '',
      reason: 'No diagnostic record available.'
    };

    var videoTitle = (_currentVideo && _currentVideo.title) || '';

    var jsonPreview = '';
    if (diag.rawSummary) {
      jsonPreview = typeof diag.rawSummary === 'object' ? JSON.stringify(diag.rawSummary, null, 2) : String(diag.rawSummary);
    } else if (diag.errorDetails) {
      jsonPreview = String(diag.errorDetails);
    }

    var html = '<div class="animal-info__debug-container">' +
      '<button type="button" class="animal-info__debug-toggle-btn" data-action="toggle-debug-inspector" aria-expanded="false">' +
        '<span>🛠️ Debug & API Inspector</span>' +
        '<span class="debug-arrow">▼</span>' +
      '</button>' +
      '<div class="animal-info__debug-panel" style="display:none;">' +
        '<div class="debug-grid">' +
          '<div class="debug-row"><span class="debug-lbl">Species Query:</span><span class="debug-val"><code>"' + App.ui.escapeHtml(diag.query || 'N/A') + '"</code></span></div>' +
          '<div class="debug-row"><span class="debug-lbl">Video Title:</span><span class="debug-val">' + App.ui.escapeHtml(videoTitle) + '</span></div>' +
          '<div class="debug-row"><span class="debug-lbl">Status Code:</span><span class="debug-val"><strong>' + (diag.statusCode ? diag.statusCode + ' OK' : '0 / None') + '</strong> (' + App.ui.escapeHtml(diag.status) + ')</span></div>' +
          '<div class="debug-row"><span class="debug-lbl">Response Time:</span><span class="debug-val">' + (diag.durationMs ? diag.durationMs + ' ms' : 'N/A') + '</span></div>' +
          '<div class="debug-row"><span class="debug-lbl">Diagnostic Note:</span><span class="debug-val debug-reason">' + App.ui.escapeHtml(diag.reason || 'N/A') + '</span></div>' +
        '</div>';

    if (diag.url) {
      html += '<div class="debug-api-url-box">' +
        '<span class="debug-lbl">Target API Endpoint:</span>' +
        '<a href="' + App.ui.escapeHtml(diag.url) + '" target="_blank" rel="noopener" class="debug-api-url-link" title="Click to test & view raw API response in new tab">' +
          '🔗 Open Live API URL ↗' +
        '</a>' +
        '<div class="debug-url-code"><code>' + App.ui.escapeHtml(diag.url) + '</code></div>' +
        '</div>';
    }

    if (jsonPreview) {
      html += '<div class="debug-raw-box">' +
        '<span class="debug-lbl">Raw Response Summary / Error Trace:</span>' +
        '<pre class="debug-code-block"><code>' + App.ui.escapeHtml(jsonPreview) + '</code></pre>' +
        '</div>';
    }

    html += '<div class="debug-footer-actions">' +
      '<button type="button" class="debug-btn-mini" data-action="retry-source" data-source="' + source + '">🔄 Re-test this API</button>' +
      '</div>' +
      '</div>' + // end debug-panel
      '</div>';   // end debug-container

    return html;
  }

  // ── Tab switch dispatcher ────────────────────────────────
  function switchTab(source) {
    _currentSource = source;
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
      html = buildSmartEmptyState(source);
      showAttrib = false;
    } else {
      // If data is available, append compact debug toggle at bottom for inspection
      html += '<div class="animal-info__footer-debug">' +
        buildDebugInspectorHTML(source) +
        '</div>';
    }

    container.innerHTML = html;

    // Typewriter effect on rendered text (only if valid text nodes exist)
    if (built) {
      runTypewriter(container);
    }

    // Update attribution footer with prominent link styling
    if (attribution && sourceLink) {
      if (showAttrib && sourceUrl) {
        attribution.style.display = 'block';
        sourceLink.innerHTML = App.ui.escapeHtml(sourceName);
        sourceLink.href = sourceUrl;
        sourceLink.title = 'Open full article in new tab';
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

  // ── Retry a single source without reloading the whole page ─
  function retrySource(source) {
    var container = document.getElementById('animal-info-body');
    if (!container || !_animalInfoCache || !_animalInfoCache.animalName) return;

    var animalName = _animalInfoCache.animalName;
    var sourceNames = { wikipedia: 'Wikipedia', wikidata: 'Wikidata', inaturalist: 'iNaturalist' };
    var sName = sourceNames[source] || source;

    container.innerHTML = '<div class="animal-info__loading"><p class="text-muted">🔄 Re-fetching ' + sName + ' data for "' + App.ui.escapeHtml(animalName) + '"...</p></div>';

    App.animalInfo.fetchSingleSource(source, animalName).then(function(res) {
      _animalInfoCache[source] = res.data || null;
      if (!_animalInfoCache.diagnostics) _animalInfoCache.diagnostics = {};
      _animalInfoCache.diagnostics[source] = res.diagnostic;

      logDiagnosticsToConsole(animalName, (_currentVideo && _currentVideo.title) || '', _animalInfoCache);

      // Re-render
      switchTab(source);
    }).catch(function(err) {
      if (!_animalInfoCache.diagnostics) _animalInfoCache.diagnostics = {};
      _animalInfoCache.diagnostics[source] = {
        source: source,
        status: 'NETWORK_ERROR',
        statusCode: 0,
        durationMs: 0,
        reason: err.message,
        errorDetails: err.stack
      };
      switchTab(source);
    });
  }

  // ── Full Diagnostics Overview Modal / View ────────────────
  function toggleOverviewModal() {
    var existing = document.getElementById('animal-info-overview-modal');
    if (existing) {
      existing.parentNode.removeChild(existing);
      return;
    }

    if (!_animalInfoCache) {
      if (App.ui && App.ui.showToast) App.ui.showToast('No animal data currently loaded.', 'warning');
      return;
    }

    var diags = _animalInfoCache.diagnostics || {};
    var animalName = _animalInfoCache.animalName || 'UNKNOWN';

    var modal = document.createElement('div');
    modal.id = 'animal-info-overview-modal';
    modal.className = 'animal-info__modal-backdrop';

    var html = '<div class="animal-info__modal-card">' +
      '<div class="animal-info__modal-header">' +
        '<h3>🛠️ AnimalVerse API Health & Diagnostics</h3>' +
        '<button type="button" class="modal-close-btn" id="close-diag-modal">✕</button>' +
      '</div>' +
      '<div class="animal-info__modal-body">' +
        '<p class="modal-sub">Real-time status of all 3 external databases for active species: <strong>' + App.ui.escapeHtml(animalName) + '</strong></p>' +
        '<div class="diag-table-wrapper">' +
          '<table class="diag-table">' +
            '<thead>' +
              '<tr>' +
                '<th>Source</th>' +
                '<th>Status</th>' +
                '<th>HTTP</th>' +
                '<th>Latency</th>' +
                '<th>Verification Link</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';

    var sources = [
      { id: 'wikipedia', name: 'Wikipedia', icon: '🌐' },
      { id: 'wikidata', name: 'Wikidata', icon: '📊' },
      { id: 'inaturalist', name: 'iNaturalist', icon: '🌿' }
    ];

    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      var d = diags[s.id] || { status: 'NO_DATA', statusCode: 0, durationMs: 0, url: '', reason: '' };
      var statusColor = d.status === 'SUCCESS' ? '#10b981' : (d.status === 'EMPTY_DATA' ? '#888888' : '#ef4444');
      var statusLabel = d.status === 'SUCCESS' ? '✅ Found' : (d.status === 'EMPTY_DATA' ? '📝 No Entry' : '❌ ' + d.status);

      html += '<tr>' +
        '<td><strong>' + s.icon + ' ' + s.name + '</strong></td>' +
        '<td><span style="color:' + statusColor + ';font-weight:700">' + statusLabel + '</span></td>' +
        '<td>' + (d.statusCode || 'N/A') + '</td>' +
        '<td>' + (d.durationMs ? d.durationMs + 'ms' : '-') + '</td>' +
        '<td>' + (d.url ? '<a href="' + App.ui.escapeHtml(d.url) + '" target="_blank" rel="noopener" class="diag-table-link">Open Raw API ↗</a>' : 'N/A') + '</td>' +
      '</tr>';
    }

    html += '</tbody></table></div>' +
      '<div class="modal-tips">' +
        '💡 <strong>How to verify:</strong> Click "Open Raw API ↗" to inspect the live response directly from official servers. If the API returns empty/404, the species is confirmed absent from that database.' +
      '</div>' +
      '</div>' +
      '<div class="animal-info__modal-footer">' +
        '<button type="button" class="btn-diag-close" id="btn-diag-close">Close Diagnostics</button>' +
      '</div>' +
      '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);

    function closeModal() {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    }

    var closeBtn = modal.querySelector('#close-diag-modal');
    var bottomCloseBtn = modal.querySelector('#btn-diag-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (bottomCloseBtn) bottomCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
  }

  // ── Photo Lightbox Modal (In-App Preview without CloudFront 403) ──
  function openPhotoLightbox(photoUrl, title, inatUrl) {
    if (!photoUrl) return;

    // Remove existing lightbox if any
    var oldModal = document.getElementById('animal-lightbox-modal');
    if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);

    var modal = document.createElement('div');
    modal.id = 'animal-lightbox-modal';
    modal.className = 'animal-info__lightbox-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var html = '<div class="animal-info__lightbox-card">' +
      '<div class="animal-info__lightbox-header">' +
        '<div class="lightbox-title-wrap">' +
          '<span class="lightbox-icon">🌿</span>' +
          '<h4 class="lightbox-title">' + App.ui.escapeHtml(title || 'Species Observation Photo') + '</h4>' +
        '</div>' +
        '<button type="button" class="lightbox-close-btn" id="close-lightbox-btn" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="animal-info__lightbox-body">' +
        '<div class="lightbox-img-wrap">' +
          '<img src="' + App.ui.escapeHtml(photoUrl) + '" ' +
          'data-original-src="' + App.ui.escapeHtml(photoUrl) + '" ' +
          'data-retry-count="0" ' +
          'alt="' + App.ui.escapeHtml(title || 'Observation') + '" ' +
          'class="lightbox-full-img" ' +
          'referrerpolicy="no-referrer" ' +
          'loading="eager" ' +
          'onerror="App.playerAnimal.handlePhotoError(this)" />' +
        '</div>' +
      '</div>' +
      '<div class="animal-info__lightbox-footer">';

    if (inatUrl) {
      html += '<a href="' + App.ui.escapeHtml(inatUrl) + '" target="_blank" rel="noopener" class="lightbox-btn-link">' +
        '🔗 View Species on iNaturalist ↗' +
        '</a>';
    }

    html += '<button type="button" class="lightbox-btn-close" id="btn-lightbox-close">Close</button>' +
      '</div>' +
      '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);

    function closeLightbox() {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') closeLightbox();
    }

    var closeBtn = modal.querySelector('#close-lightbox-btn');
    var bottomCloseBtn = modal.querySelector('#btn-lightbox-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (bottomCloseBtn) bottomCloseBtn.addEventListener('click', closeLightbox);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeLightbox();
    });
    document.addEventListener('keydown', handleKey);
  }

  // ── Typewriter animation effect ──────────────────────────
  function runTypewriter(root) {
    var textNodes = [];
    function walk(node) {
      if (node.nodeType === 3) {
        if (node.textContent.trim().length > 0) textNodes.push(node);
      } else if (node.nodeType === 1) {
        var tag = node.tagName ? node.tagName.toUpperCase() : '';
        // Skip script, style, debug panels, and full wiki text panels from typewriter effect
        if (tag !== 'SCRIPT' && tag !== 'STYLE' &&
            !node.classList.contains('animal-info__debug-container') &&
            !node.classList.contains('animal-info__footer-debug') &&
            !node.classList.contains('animal-info__wiki-full-panel')) {
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
    var SPEED = 10;
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

  // ── Smart Photo Fallback & Error Handler ─────────────────
  function handlePhotoError(img) {
    if (!img) return;
    var retryCount = parseInt(img.getAttribute('data-retry-count') || '0', 10);
    var originalSrc = img.getAttribute('data-original-src') || img.src || '';

    if (retryCount === 0) {
      // Retry 1: Switch between static CDN and AWS bucket if applicable
      img.setAttribute('data-retry-count', '1');
      if (originalSrc.includes('inaturalist-open-data.s3.amazonaws.com')) {
        img.src = originalSrc.replace('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org');
        return;
      } else if (originalSrc.includes('static.inaturalist.org')) {
        img.src = originalSrc.replace('static.inaturalist.org', 'inaturalist-open-data.s3.amazonaws.com');
        return;
      }
    } else if (retryCount === 1) {
      // Retry 2: Use global image CDN proxy for anti-blocking & CORS issues
      img.setAttribute('data-retry-count', '2');
      var cleanUrl = originalSrc.replace(/^https?:\/\//, '');
      img.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(cleanUrl) + '&w=400&output=jpg';
      return;
    }

    // Final Fallback: Gracefully hide the broken image element without showing broken icon
    var card = img.closest('.animal-info__inat-photo-card') || img.closest('.animal-info__fun-fact');
    if (card) {
      card.style.display = 'none';
      var gallery = card.closest('.animal-info__inat-gallery') || card.closest('.animal-info__fun-facts');
      if (gallery) {
        var visibleItems = gallery.querySelectorAll('.animal-info__inat-photo-card:not([style*="display: none"]), .animal-info__fun-fact:not([style*="display: none"])');
        if (visibleItems.length === 0) {
          gallery.style.display = 'none';
        }
      }
    }
  }

  return {
    initTabEvents: initTabEvents,
    render: render,
    retrySource: retrySource,
    toggleOverviewModal: toggleOverviewModal,
    openPhotoLightbox: openPhotoLightbox,
    handlePhotoError: handlePhotoError
  };
})();
