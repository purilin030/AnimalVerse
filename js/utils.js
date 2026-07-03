/* ============================================================
   Utility Functions
   ============================================================ */
App.utils = (function() {
  'use strict';

  /**
   * Calculate distance between two coordinates (Haversine formula, km)
   */
  function getDistance(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if a video's location is within X km of user's position
   */
  function isNearby(video, userLat, userLng, maxKm) {
    if (!video.location || !video.location.lat || !video.location.lng) return false;
    maxKm = maxKm || 5000;
    var dist = getDistance(userLat, userLng, video.location.lat, video.location.lng);
    return dist <= maxKm;
  }

  return {
    getDistance: getDistance,
    isNearby: isNearby
  };
})();
