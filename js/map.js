/* ============================================================
   Animal Map - Leaflet.js World Map with Live iNaturalist Integration
   ============================================================ */
App.map = (function() {
  'use strict';

  var mapInstance = null;
  var currentTileLayer = null;
  var markerObjects = []; // Stores { video: video, marker: marker }
  
  // External observations state
  var externalObservationsGroup = null;
  var externalMarkerObjects = []; // Stores { category: category, marker: marker }
  var loadedObservationIds = new Set();
  var isObservationsEnabled = false;
  var isFetching = false;
  var themeObserver = null;

  // Category colors for markers matching variables.css Design System
  var catColors = {
    mammals: '#9fe870',      // Wise Green / Accent
    birds: '#38c8ff',        // Info Cyan
    reptiles: '#2ead4b',     // Success Green
    amphibians: '#c5edab',   // Light Accent Green
    aquatic: '#a855f7'       // Purple
  };

  // Base map tile URLs (CartoDB voyager for light, Dark Matter for dark)
  var tileUrls = {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  var tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  function init() {
    App.data.loadVideos().then(function(data) {
      renderMap(data);
      setupThemeObserver();
    });
  }

  /**
   * Smoothly switch map tile layers based on data-theme
   */
  function updateMapTheme(theme) {
    if (!mapInstance) return;

    if (currentTileLayer) {
      mapInstance.removeLayer(currentTileLayer);
    }

    var url = tileUrls[theme] || tileUrls.light;
    currentTileLayer = L.tileLayer(url, {
      attribution: tileAttribution,
      maxZoom: 18
    }).addTo(mapInstance);
  }

  /**
   * Observe mutations on the <html> tag to switch map tiles dynamically
   */
  function setupThemeObserver() {
    if (themeObserver) {
      themeObserver.disconnect();
    }

    themeObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'data-theme') {
          var nextTheme = document.documentElement.getAttribute('data-theme') || 'light';
          updateMapTheme(nextTheme);
        }
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  function renderMap(data) {
    var container = document.getElementById('animal-map');
    if (!container) return;

    // Reset caches
    markerObjects = [];
    externalMarkerObjects = [];
    loadedObservationIds.clear();
    isObservationsEnabled = false;
    isFetching = false;

    // Initialize Leaflet Map
    mapInstance = L.map('animal-map', {
      center: [20, 0],
      zoom: 2.5,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
      zoomControl: false // Add manually to position customly
    });

    // Move Zoom controls to top-left to avoid overlaps with the floating legend panel
    L.control.zoom({
      position: 'topleft'
    }).addTo(mapInstance);

    // Initial theme tile setup
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateMapTheme(currentTheme);

    // Initialize LayerGroup for iNaturalist external observations
    externalObservationsGroup = L.layerGroup().addTo(mapInstance);

    // Create markers and store them
    data.videos.forEach(function(video) {
      if (!video.location || !video.location.lat || !video.location.lng) return;

      var color = catColors[video.category] || '#868685';
      var cat = App.data.getCategoryById(video.category);
      var catName = cat ? cat.name : video.category;

      // Custom divIcon with a core dot + spreading ripple pulse effect
      var icon = L.divIcon({
        className: 'animal-marker',
        html: '<span class="animal-marker__wrapper">' +
              '  <span class="animal-marker__pulse" style="background:' + color + '"></span>' +
              '  <span class="animal-marker__inner" style="background:' + color + '"></span>' +
              '</span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
      });

      var marker = L.marker([video.location.lat, video.location.lng], { icon: icon });

      var popupContent = buildPopupContent({
        imgSrc: video.thumbnail || 'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp',
        title: video.title,
        tagClass: video.category,
        tagText: catName,
        locationName: video.location.name,
        linkHref: 'playback.html?id=' + video.id,
        linkLabel: 'Watch Video'
      });

      marker.bindPopup(popupContent, { 
        maxWidth: 280, 
        minWidth: 260,
        className: 'map-popup-wrapper',
        offset: L.point(0, -6)
      });

      marker.addTo(mapInstance);

      markerObjects.push({
        video: video,
        marker: marker
      });
    });

    // Interactive Category Filters supporting Multiple Selections
    var legendItems = document.querySelectorAll('.map-legend__item');
    legendItems.forEach(function(item) {
      item.addEventListener('click', function() {
        // Toggle active state for clicked item
        this.classList.toggle('map-legend__item--active');

        // Collect all active categories
        var activeCategories = [];
        legendItems.forEach(function(el) {
          if (el.classList.contains('map-legend__item--active')) {
            activeCategories.push(el.getAttribute('data-category'));
          }
        });

        if (activeCategories.length === 0) {
          // If no categories are selected, show all markers back on map
          markerObjects.forEach(function(obj) {
            if (!mapInstance.hasLayer(obj.marker)) {
              mapInstance.addLayer(obj.marker);
            }
          });
          if (isObservationsEnabled) {
            externalMarkerObjects.forEach(function(obj) {
              if (!externalObservationsGroup.hasLayer(obj.marker)) {
                externalObservationsGroup.addLayer(obj.marker);
              }
            });
          }
        } else {
          // Filter local markers based on selected categories
          markerObjects.forEach(function(obj) {
            if (activeCategories.indexOf(obj.video.category) !== -1) {
              if (!mapInstance.hasLayer(obj.marker)) {
                mapInstance.addLayer(obj.marker);
              }
            } else {
              if (mapInstance.hasLayer(obj.marker)) {
                mapInstance.removeLayer(obj.marker);
              }
            }
          });

          // Filter external markers based on selected categories
          externalMarkerObjects.forEach(function(obj) {
            if (activeCategories.indexOf(obj.category) !== -1) {
              if (isObservationsEnabled && !externalObservationsGroup.hasLayer(obj.marker)) {
                externalObservationsGroup.addLayer(obj.marker);
              }
            } else {
              if (externalObservationsGroup.hasLayer(obj.marker)) {
                externalObservationsGroup.removeLayer(obj.marker);
              }
            }
          });
        }
      });
    });

    // Toggle switch logic for Live Observations
    var observationsToggle = document.getElementById('observations-toggle');
    if (observationsToggle) {
      observationsToggle.addEventListener('change', function() {
        isObservationsEnabled = this.checked;
        if (isObservationsEnabled) {
          fetchWildlifeObservations();
        } else {
          clearObservations();
        }
      });
    }

    // Dynamic viewport observations fetching
    mapInstance.on('moveend', function() {
      if (isObservationsEnabled) {
        fetchWildlifeObservations();
      }
    });

    // Invalidate map size after rendering is fully loaded
    setTimeout(function() { 
      if (mapInstance) {
        mapInstance.invalidateSize(); 
      }
    }, 100);
  }

  /**
   * Fetch live observations from iNaturalist based on map bounding box
   */
  function fetchWildlifeObservations() {
    if (!mapInstance || isFetching) return;

    var bounds = mapInstance.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    var legendPanel = document.getElementById('map-legend');
    if (legendPanel) {
      legendPanel.classList.add('loading');
    }
    isFetching = true;

    // Query iNaturalist observations API
    var url = 'https://api.inaturalist.org/v1/observations' +
      '?nelat=' + ne.lat.toFixed(5) +
      '&nelng=' + ne.lng.toFixed(5) +
      '&swlat=' + sw.lat.toFixed(5) +
      '&swlng=' + sw.lng.toFixed(5) +
      '&per_page=30' +
      '&order=desc' +
      '&order_by=created_at' +
      '&only_id=false';

    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('iNaturalist API request failed');
        }
        return response.json();
      })
      .then(function(data) {
        if (!isObservationsEnabled) return; // User turned it off during fetch

        if (data.results) {
          data.results.forEach(function(obs) {
            if (!obs.location) return;
            var coords = obs.location.split(',');
            var lat = parseFloat(coords[0]);
            var lng = parseFloat(coords[1]);
            var id = obs.id;

            // Skip if already loaded
            if (loadedObservationIds.has(id)) return;

            // Extract picture and fallback
            var thumb = 'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp';
            if (obs.photos && obs.photos.length > 0) {
              thumb = obs.photos[0].url.replace('square', 'medium'); // higher resolution thumbnail
            }

            // Names
            var scientificName = obs.taxon ? obs.taxon.name : 'Unknown Species';
            var commonName = (obs.taxon && obs.taxon.preferred_common_name) 
              ? obs.taxon.preferred_common_name 
              : scientificName;

            // Class taxonomy mapping
            var iconic = obs.taxon ? obs.taxon.iconic_taxon_name : '';
            var category = 'aquatic';
            if (iconic === 'Mammalia') category = 'mammals';
            else if (iconic === 'Aves') category = 'birds';
            else if (iconic === 'Reptilia') category = 'reptiles';
            else if (iconic === 'Amphibia') category = 'amphibians';
            else if (iconic === 'Actinopterygii' || iconic === 'Mollusca' || iconic === 'Chromista') category = 'aquatic';

            var color = catColors[category] || '#868685';
            
            var icon = L.divIcon({
              className: 'animal-marker animal-marker--external',
              html: '<span class="animal-marker__wrapper">' +
                    '  <span class="animal-marker__pulse" style="background:' + color + '"></span>' +
                    '  <span class="animal-marker__inner" style="border-color:' + color + '"></span>' +
                    '</span>',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -14]
            });

            var marker = L.marker([lat, lng], { icon: icon });

            var place = obs.place_guess || 'Unknown Location';
            var cat = App.data.getCategoryById(category);
            var catName = cat ? cat.name : category;

            var popupContent = buildPopupContent({
              imgSrc: thumb,
              title: commonName,
              subtitle: scientificName,
              tagClass: 'external',
              tagText: 'iNaturalist · ' + catName,
              locationName: place,
              linkHref: obs.uri,
              linkLabel: 'View Observation',
              linkClass: ' external-link',
              linkTarget: ' target="_blank"',
              linkSvgAttrs: 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"',
              linkSvgPath: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>'
            });

            marker.bindPopup(popupContent, {
              maxWidth: 280,
              minWidth: 260,
              className: 'map-popup-wrapper',
              offset: L.point(0, -6)
            });

            // Cache external marker representation
            externalMarkerObjects.push({
              category: category,
              marker: marker
            });

            // If any category filters are active, only draw matched markers
            var activeCategories = [];
            document.querySelectorAll('.map-legend__item--active').forEach(function(el) {
              activeCategories.push(el.getAttribute('data-category'));
            });

            if (activeCategories.length === 0 || activeCategories.indexOf(category) !== -1) {
              marker.addTo(externalObservationsGroup);
            }
            
            loadedObservationIds.add(id);
          });
        }
      })
      .catch(function(err) {
        console.error('Error loading iNaturalist data:', err);
      })
      .finally(function() {
        isFetching = false;
        if (legendPanel) {
          legendPanel.classList.remove('loading');
        }
      });
  }

  /**
   * Reset external markers from memory and map layers
   */
  function clearObservations() {
    if (externalObservationsGroup) {
      externalObservationsGroup.clearLayers();
    }
    externalMarkerObjects = [];
    loadedObservationIds.clear();
  }

  /**
   * Build a Leaflet popup HTML string for map markers
   * Shared by video markers and iNaturalist observation markers
   */
  function buildPopupContent(opts) {
    var subtitleHtml = opts.subtitle
      ? '<span style="font-size:11px; font-style:italic; color:var(--clr-text-muted); display:block; margin:-2px 0 6px 0;">' + App.ui.escapeHtml(opts.subtitle) + '</span>'
      : '';

    // Escape attribute values to prevent HTML attribute injection
    var safeImgSrc    = App.ui.escapeHtml(opts.imgSrc    || '');
    var safeAlt       = App.ui.escapeHtml(opts.title     || '');
    var safeTagClass  = App.ui.escapeHtml(opts.tagClass  || '');
    var safeLinkHref  = App.ui.escapeHtml(opts.linkHref  || '#');
    var safeLinkClass = App.ui.escapeHtml(opts.linkClass || '');
    var safeLinkLabel = App.ui.escapeHtml(opts.linkLabel || '');

    return '<div class="map-popup">' +
      '  <div class="map-popup__img-container">' +
      '    <img class="map-popup__thumb" src="' + safeImgSrc + '" alt="' + safeAlt + '" onerror="this.src=\'assets/images/library/Mammals/lion/photos/lion-pexels-1.webp\'">' +
      '  </div>' +
      '  <div class="map-popup__body">' +
      '    <span class="map-popup__category-tag ' + safeTagClass + '">' + App.ui.escapeHtml(opts.tagText) + '</span>' +
      '    <h4 class="map-popup__title">' + App.ui.escapeHtml(opts.title) + '</h4>' +
      subtitleHtml +
      '    <p class="map-popup__location">' +
      '      <svg class="map-popup__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>' +
      '      <span>' + App.ui.escapeHtml(opts.locationName) + '</span>' +
      '    </p>' +
      '    <a class="map-popup__watch' + safeLinkClass + '" href="' + safeLinkHref + '"' + (opts.linkTarget || '') + '>' +
      '      <span>' + safeLinkLabel + '</span>' +
      '      <svg class="map-popup__btn-icon" ' + (opts.linkSvgAttrs || 'viewBox="0 0 24 24" fill="currentColor"') + '>' +
              (opts.linkSvgPath || '<polygon points="6 23 21 12 6 1 6 23"/>') +
      '      </svg>' +
      '    </a>' +
      '  </div>' +
      '</div>';
  }

  return {
    init: init
  };
})();
