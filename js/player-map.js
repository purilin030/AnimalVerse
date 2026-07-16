/* ============================================================
   Player Map — Leaflet location map with geolocation
   Renders a mini-map showing the video's filming location,
   the user's position (via geolocation), and the distance between them.
   ============================================================ */
App.playerMap = (function() {
  'use strict';

  /**
   * Render a Leaflet location map for the given video.
   * @param {object} video — Video object with .location { lat, lng, name }
   */
  function render(video) {
    if (!video.location || !video.location.lat || !video.location.lng) return;

    var mapSection = document.getElementById('location-map');
    var mapContainer = document.getElementById('location-map-container');
    var distanceSpan = document.getElementById('location-distance');
    if (!mapSection || !mapContainer) return;

    mapSection.style.display = 'block';

    // Clear previous map instance if initialized
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

          // Calculate distance
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

      // Invalidate map size after render completes
      setTimeout(function() { map.invalidateSize(); }, 300);
    } catch(e) {
      console.warn('Map render error:', e);
      mapSection.style.display = 'none';
    }
  }

  return { render: render };
})();
