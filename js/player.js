/* ============================================================
   Video Player (YouTube & HTML5)
   ============================================================ */
App.player = (function() {
  'use strict';

  var currentVideo = null;

  function init() {
    var params = App.router.getQueryParams();
    var videoId = params.id;
    var animalName = params.animal;

    if (!videoId && !animalName) {
      var container = document.getElementById('player-container');
      App.ui.renderEmptyState(container, {
        text: 'No video selected.',
        actionLabel: 'Browse videos',
        actionHref: 'gallery.html'
      });
      return;
    }

    App.data.loadVideos().then(function() {
      if (videoId) {
        currentVideo = App.data.getVideoById(videoId);
      } else if (animalName) {
        // Resolve video by searching for animal name in title, description, or ID
        var nameLower = animalName.toLowerCase();
        var allVids = App.data.filterVideos();
        currentVideo = allVids.find(function(v) {
          var match = (v.title && v.title.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.description && v.description.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.id && v.id.toLowerCase().indexOf(nameLower) !== -1);
          return match;
        });
      }

      if (!currentVideo) {
        showError('Video not found.');
        return;
      }

      // Check video source and sync YouTube Mode theme
      if (currentVideo.source === 'youtube') {
        App.theme.enableYoutubeMode();
      } else {
        App.theme.disableYoutubeMode();
      }

      renderPlayer(currentVideo);
      renderVideoInfo(currentVideo);
      renderLocationMap(currentVideo);
      renderRelatedVideos(currentVideo);
      renderAnimalInfo(currentVideo);
    });
  }

  function showError(message) {
    var container = document.getElementById('player-container');
    App.ui.renderEmptyState(container, { text: message });
  }

  function renderPlayer(video) {
    var container = document.getElementById('player-container');
    if (!container) return;

    // Clear any placeholder content (e.g. "Loading video...")
    container.textContent = '';

    if (video.source === 'youtube') {
      var iframe = document.createElement('iframe');
      iframe.className = 'player-iframe';
      iframe.src = App.config.youtube.embedBase + (video.videoId || '') + App.config.youtube.params;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      container.appendChild(iframe);
    } else {
      var videoEl = document.createElement('video');
      videoEl.className = 'player-video';
      videoEl.controls = true;
      videoEl.poster = video.posterUrl || video.thumbnail || '';
      videoEl.textContent = 'Your browser does not support the video tag.';

      var source = document.createElement('source');
      source.src = video.videoUrl || '';
      source.type = 'video/mp4';
      videoEl.appendChild(source);

      container.appendChild(videoEl);

      videoEl.play().catch(function() { /* autoplay prevented */ });
    }
  }

  function renderVideoInfo(video) {
    var container = document.getElementById('video-info');
    if (!container) return;

    var cat = App.data.getCategoryById(video.category);
    var catName = cat ? cat.name : video.category;
    var catColor = cat ? cat.color : '';

    var isFav = App.favorites.isFavorite(video.id);
    var isWL = App.favorites.isWatchLater(video.id);
    var isLiked = App.favorites.isLiked(video.id);

    // Clear container
    container.textContent = '';

    // Title
    var title = document.createElement('h1');
    title.className = 'video-info__title';
    title.textContent = video.title || '';
    container.appendChild(title);

    // Meta row
    var meta = document.createElement('div');
    meta.className = 'video-info__meta';
    container.appendChild(meta);

    var catSpan = document.createElement('span');
    catSpan.className = 'video-info__category';
    catSpan.style.color = catColor;
    catSpan.textContent = catName || '';
    meta.appendChild(catSpan);

    var durationSpan = document.createElement('span');
    durationSpan.textContent = video.duration || '';
    meta.appendChild(durationSpan);

    var viewsSpan = document.createElement('span');
    viewsSpan.textContent = (video.views || 0).toLocaleString() + ' views';
    meta.appendChild(viewsSpan);

    if (video.location) {
      var locSpan = document.createElement('span');
      locSpan.textContent = video.location.name || '';
      meta.appendChild(locSpan);
    }

    // Description
    var desc = document.createElement('p');
    desc.className = 'video-info__description';
    desc.textContent = video.description || '';
    container.appendChild(desc);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'video-info__actions';
    container.appendChild(actions);

    var likeBtn = document.createElement('button');
    likeBtn.className = 'btn btn--like' + (isLiked ? ' is-active' : '');
    likeBtn.id = 'like-btn';
    likeBtn.setAttribute('data-id', video.id);
    likeBtn.textContent = (isLiked ? '👍 Liked' : '👍 Like');
    actions.appendChild(likeBtn);

    var favBtn = document.createElement('button');
    favBtn.className = 'btn btn--favorite' + (isFav ? ' is-active' : '');
    favBtn.id = 'fav-btn';
    favBtn.setAttribute('data-id', video.id);
    favBtn.textContent = (isFav ? '❤️' : '🤍') + ' Favorite';
    actions.appendChild(favBtn);

    var wlBtn = document.createElement('button');
    wlBtn.className = 'btn btn--watchlater' + (isWL ? ' is-active' : '');
    wlBtn.id = 'wl-btn';
    wlBtn.setAttribute('data-id', video.id);
    wlBtn.textContent = (isWL ? '⏰' : '⏱') + ' Watch Later';
    actions.appendChild(wlBtn);

    // Bind buttons (use references already created above)
    if (likeBtn) {
      likeBtn.addEventListener('click', function() {
        var added = App.favorites.toggleLike(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '👍 Liked' : '👍 Like');
        App.ui.showToast(added ? 'Added to liked videos!' : 'Removed from liked videos', added ? 'success' : 'info');
      });
    }

    if (favBtn) {
      favBtn.addEventListener('click', function() {
        var added = App.favorites.toggleFavorite(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '❤️' : '🤍') + ' Favorite';
        App.ui.showToast(added ? 'Added to favorites!' : 'Removed from favorites', added ? 'success' : 'info');
      });
    }

    if (wlBtn) {
      wlBtn.addEventListener('click', function() {
        var added = App.favorites.toggleWatchLater(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '⏰' : '⏱') + ' Watch Later';
        App.ui.showToast(added ? 'Added to Watch Later!' : 'Removed from Watch Later', added ? 'success' : 'info');
      });
    }
  }

  function renderLocationMap(video) {
    if (!video.location || !video.location.lat || !video.location.lng) return;

    var mapSection = document.getElementById('location-map');
    var mapContainer = document.getElementById('location-map-container');
    var distanceSpan = document.getElementById('location-distance');
    if (!mapSection || !mapContainer) return;

    mapSection.style.display = 'block';

    // Clear previous map instance if initialized to prevent Leaflet container error
    if (mapContainer._leaflet_id) {
      mapContainer.innerHTML = '';
      mapContainer._leaflet_id = null;
    }

    try {
      var animalLat = video.location.lat;
      var animalLng = video.location.lng;
      var map = L.map(mapContainer).setView([animalLat, animalLng], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 10
      }).addTo(map);

      // Animal location marker
      L.marker([animalLat, animalLng])
        .addTo(map)
        .bindPopup('<b>' + App.ui.escapeHtml(video.location.name) + '</b>');

      // Browser Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          var userLat = position.coords.latitude;
          var userLng = position.coords.longitude;

          // User location marker
          L.marker([userLat, userLng])
            .addTo(map)
            .bindPopup('<b>📍 You are here</b>');

          // Calculate distance (Haversine formula) — via App.utils.getDistance
          var d = App.utils.getDistance(userLat, userLng, animalLat, animalLng);
          var formattedDistance = d < 1 
            ? Math.round(d * 1000) + ' m' 
            : Math.round(d).toLocaleString() + ' km';

          if (distanceSpan) {
            distanceSpan.textContent = '📏 Distance from you: ' + formattedDistance;
          }

          // Dotted line connecting user and animal
          L.polyline([[animalLat, animalLng], [userLat, userLng]], {
            color: '#2ead4b',
            weight: 3,
            dashArray: '5, 10'
          }).addTo(map);

          // Auto-adjust view to show both points
          var bounds = L.latLngBounds([[animalLat, animalLng], [userLat, userLng]]);
          map.fitBounds(bounds, { padding: [40, 40] });

        }, function(error) {
          console.warn('Geolocation access failed or denied:', error);
          if (distanceSpan) distanceSpan.textContent = '';
        });
      }

      // Invalidate map size after animation/render completes
      setTimeout(function() { map.invalidateSize(); }, 300);
    } catch(e) {
      console.warn('Map render error:', e);
      mapSection.style.display = 'none';
    }
  }

  function renderRelatedVideos(currentVideo) {
    var container = document.getElementById('related-videos');
    if (!container) return;

    function renderRelated(related) {
      related = related
        .filter(function(v) { return v.id !== currentVideo.id; })
        .slice(0, 5);

      if (related.length === 0) {
        var noRel = document.createElement('p');
        noRel.className = 'text-muted';
        noRel.textContent = 'No related videos found.';
        container.appendChild(noRel);
        return;
      }

      container.innerHTML = '';
      for (var i = 0; i < related.length; i++) {
        var card = App.ui.createVideoCard(related[i]);
        if (card) {
          container.appendChild(card);
        }
      }

      App.ui.attachFavoriteListeners(container);
    }

    // YouTube mode: use static youtube data (no network request)
    if (App.data.isYoutubeVideo(currentVideo.id)) {
      var related = App.data.filterYoutubeVideos({ category: currentVideo.category });
      renderRelated(related);
      return;
    }

    // Normal mode: load from videos.json
    App.data.loadVideos().then(function() {
      var related = App.data.filterVideos({ category: currentVideo.category });
      renderRelated(related);
    });
  }

  // ── Animal Info Panel ─────────────────────────────────────
  var _animalInfoCache = null;

  function renderAnimalInfo(video) {
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

  function renderBreadcrumbs(result) {
    var container = document.getElementById('taxonomy-breadcrumbs');
    if (!container) return;
    
    // Attempt to get ancestors from iNaturalist
    var ancestors = result && result.inaturalist && result.inaturalist.ancestors;
    if (!ancestors || ancestors.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    var html = '<ul class="breadcrumb-list">';
    for (var i = 0; i < ancestors.length; i++) {
      var a = ancestors[i];
      // Search for video/animal based on this taxonomy rank for the link
      // For now, it just searches the gallery page with a query
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

  // ── Animal Info HTML Builders ─────────────────────────────
  // Each builder returns { html, sourceUrl, sourceName } or null if no data.

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

  // ── switchTab: dispatcher ──────────────────────────────────────────
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
    (function runTypewriter(root) {
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
    })(container);

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

  // ── Tab switching events ──────────────────────────────────
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

  return {
    init: function() {
      initTabEvents();  // Bind tab clicks early
      init();
    }
  };
})();
