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

  /**
   * Fisher-Yates shuffle (returns new shuffled copy, original unchanged)
   */
  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /**
   * Pluralize a word based on count: pluralize(1, 'video') => '1 video', pluralize(3, 'video') => '3 videos'
   */
  function pluralize(count, singular, plural) {
    return count + ' ' + (count !== 1 ? (plural || singular + 's') : singular);
  }

  /**
   * Compute deterministic aspect-ratio class from video ID
   * Returns { className, heightWeight } for masonry layout
   */
  function getVideoAspect(videoId) {
    var hash = 0;
    for (var i = 0; i < videoId.length; i++) {
      hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
    }
    var r = Math.abs(hash) % 4;

    var ASPECT_MAP = [
      { className: 'aspect-square', heightWeight: 1.0 },
      { className: 'aspect-portrait-tall', heightWeight: 1.33 },
      { className: 'aspect-portrait-short', heightWeight: 1.25 },
      { className: 'aspect-video', heightWeight: 0.56 }
    ];
    return ASPECT_MAP[r];
  }

  /**
   * Approximate lat/lng to world region name
   */
  function guessRegion(lat, lng) {
    if (lat < -55) return 'Antarctica';
    if (lat < -10 && lng > 110) return 'Australia';
    if (lat < -10 && lng < -30) return 'Ocean';
    if (lat > 60) return 'Europe';
    if (lng > -25 && lng < 55) return lat > 35 ? 'Europe' : 'Africa';
    if (lng >= 55 && lng < 180) return 'Asia';
    if (lat > 20 && lng < -25) return 'North America';
    if (lat <= 20 && lng < -25) return 'South America';
    if (lng <= -130) return 'Ocean';
    return 'Asia';
  }

  return {
    getDistance: getDistance,
    isNearby: isNearby,
    shuffleArray: shuffleArray,
    pluralize: pluralize,
    getVideoAspect: getVideoAspect,
    guessRegion: guessRegion
  };
})();
