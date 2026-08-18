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
   * Format a distance in km into a readable short string
   * (< 1 km → meters, otherwise rounded km)
   */
  function formatDistance(km) {
    if (km == null || isNaN(km)) return '';
    if (km < 1) {
      return Math.round(km * 1000).toLocaleString() + ' m';
    }
    return Math.round(km).toLocaleString() + ' km';
  }

  // ── Shared user position cache ─────────────────────────────
  // The home page ("Animals Near You") is the only place that prompts for
  // geolocation. When the user grants it, home.js calls setUserPosition()
  // so video cards on every page can show "📍 X km away" WITHOUT re-prompting.
  var _userPosition = null; // { lat, lng } | null

  function setUserPosition(lat, lng) {
    _userPosition = { lat: lat, lng: lng };
  }

  /**
   * Returns the cached user position, or null if the user has not
   * granted location access yet. Never triggers a permission prompt.
   */
  function getUserPosition() {
    return _userPosition;
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

  /**
   * Extract a common animal name from a video title.
   * Strips common title prefixes/suffixes, then matches against App.speciesMap
   * (longest key first to prefer "bald eagle" over "eagle").
   * Falls back to the cleaned title string if no species map match is found.
   *
   * Canonical implementation — previously duplicated in data.js and animal-info.js.
   * Both modules now delegate here. See js/species-map.js for the species map.
   *
   * @param  {string} title  Video title
   * @returns {string|null}  Matched common name (lowercase), cleaned title, or null
   */
  function extractAnimalName(title) {
    if (!title) return null;

    // ── 1. 清理标题 ──────────────────────────────────────────
    // YouTube 标题常有 "Wild Horses | BBC Earth" 或 "Lion, Tiger, Horse - Compilation"
    var clean = title
      // 移除频道/系列后缀: " | BBC Earth", " - Nat Geo Wild"
      .replace(/\s*[|–—-]\s*(?:bbc\s*(?:earth|studios|one)?|nat\s*geo(?:graphic)?\s*(?:wild)?|blue\s*planet|national\s*geographic\s*(?:wild)?|documentary|wildlife|animals?\s*(?:documentary|wild)?|4k|nature\s*(?:documentary)?).*$/i, '')
      // 移除括号内容
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      // 移除通用后缀
      .replace(/\bfull\s+(?:episode|documentary|movie|film)\b.*$/i, '')
      .replace(/\bin\s+its\s+natural\s+habitat\b.*$/i, '')
      .replace(/^(?:fascinating\s+(?:behavior|facts)\s+(?:of|about)\s+|the\s+)/i, '')
      // 去除 emoji
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      // 只保留字母、空格、逗号、撇号
      .replace(/[^a-zA-Z\s,']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    var lower = clean.toLowerCase();
    if (!lower) return null;

    // ── 2. speciesMap 的 key 列表（按字符数降序） ────────────
    // 长 key 先匹配确保 "bald eagle" 优先于 "eagle"
    var keys = Object.keys(App.speciesMap).sort(function(a, b) {
      return b.length - a.length;
    });

    // ── 3. 工具：词边界匹配（阻止 "stallion" 匹配到 "lion"） ──
    // 使用 \b 词边界防止子字符串假阳性
    // 同时处理复数形式（"lions" → 匹配 "lion"）
    function hasWord(text, word) {
      // 转义正则特殊字符（speciesMap 的 key 都是字母+空格，但留个安全边界）
      var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // \b 前后保证是独立单词；s? 允许匹配 "lions" / "horses" 等复数
      return new RegExp('\\b' + escaped + 's?\\b', 'i').test(text);
    }

    // ── 4. 优先按逗号分段匹配 ───────────────────────────────
    // YouTube 标题常有 "Lions, Tigers, Bears, Oh My!" 列举形式
    // 分词段后分别匹配，返回第一个有结果的段
    var segments = lower.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    if (segments.length > 1) {
      for (var si = 0; si < segments.length; si++) {
        for (var ki = 0; ki < keys.length; ki++) {
          if (hasWord(segments[si], keys[ki])) {
            return keys[ki];
          }
        }
      }
    }

    // ── 5. 传统全文匹配（改用词边界） ─────────────────────
    // 对于简短标题（"Horses of the Wild"）仍然按最长动物名匹配
    for (var i = 0; i < keys.length; i++) {
      if (hasWord(lower, keys[i])) {
        return keys[i];
      }
    }

    // ── 6. 无匹配：返回第一个有意义的单词 ──────────────────
    var words = clean.split(' ').filter(function(w) { return w.length > 2; });
    return words.length > 0 ? words[0] : null;
  }

  /**
   * Format a date string as a compact relative time label.
   * Examples: "2 days ago", "3 weeks ago", "2 months ago", "Jan 2025".
   * Falls back to the original string if it cannot be parsed.
   */
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    var normalized = dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr;
    var then = new Date(normalized);
    if (isNaN(then.getTime())) return dateStr;

    var now = new Date();
    var diffMs = now.getTime() - then.getTime();
    var absMs = Math.abs(diffMs);
    var suffix = diffMs >= 0 ? ' ago' : ' from now';

    var minutes = Math.floor(absMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) {
      return minutes + ' min' + (minutes === 1 ? '' : 's') + suffix;
    }

    var hours = Math.floor(absMs / 3600000);
    if (hours < 24) {
      return hours + ' hour' + (hours === 1 ? '' : 's') + suffix;
    }

    var days = Math.floor(absMs / 86400000);
    if (days < 7) {
      return days + ' day' + (days === 1 ? '' : 's') + suffix;
    }
    if (days < 30) {
      var weeks = Math.floor(days / 7);
      return weeks + ' week' + (weeks === 1 ? '' : 's') + suffix;
    }
    if (days < 365) {
      var months = Math.floor(days / 30.44);
      return months + ' month' + (months === 1 ? '' : 's') + suffix;
    }

    return then.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  /**
   * Format a number as a compact label: 1520000 -> "1.5M", 48500 -> "48.5K".
   */
  function formatCompactNumber(num) {
    num = Number(num);
    if (isNaN(num)) return '0';
    if (Math.abs(num) >= 1000000) {
      var millions = num / 1000000;
      return (millions % 1 === 0 ? millions.toString() : millions.toFixed(1).replace(/\.0$/, '')) + 'M';
    }
    if (Math.abs(num) >= 1000) {
      var thousands = num / 1000;
      return (thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    return num.toLocaleString('en-US');
  }

  return {
    getDistance: getDistance,
    isNearby: isNearby,
    formatDistance: formatDistance,
    setUserPosition: setUserPosition,
    getUserPosition: getUserPosition,
    shuffleArray: shuffleArray,
    pluralize: pluralize,
    getVideoAspect: getVideoAspect,
    guessRegion: guessRegion,
    extractAnimalName: extractAnimalName,
    formatRelativeTime: formatRelativeTime,
    formatCompactNumber: formatCompactNumber
  };
})();
