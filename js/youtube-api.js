/* ============================================================
   YouTube Data API v3 — Dynamic Search & Pagination
   依赖: config.js (App.config.youtube.apiKey)
   ============================================================ */
App.youtubeApi = (function() {
  'use strict';

  var API_KEY = App.config.youtube.apiKey;
  var BASE = 'https://www.googleapis.com/youtube/v3';

  // ── 按动物分类对应的搜索关键词 ──────────────────────────
  var CATEGORY_QUERIES = {
    mammals:   'wildlife mammals nature documentary bbc earth national geographic',
    birds:     'wild birds nature documentary bbc planet earth',
    reptiles:  'reptiles snakes lizards turtles wildlife documentary',
    amphibians:'frogs amphibians wildlife nature documentary',
    aquatic:   'ocean sea life marine animals blue planet documentary',
    fish:      'fish ocean sea creatures underwater documentary',
    invertebrates: 'insects spiders butterflies invertebrates wildlife'
  };

  // 默认搜索词（分类为 all 时使用）
  var DEFAULT_QUERY = 'wildlife animals nature documentary 4k bbc earth';

  // 存储每个「分类 + 标签」组合的分页状态
  var _pageTokens = {};
  var _currentKey = '';

  function _cacheKey(category, tag) {
    return (category || 'all') + '|' + (tag || '');
  }

  /**
   * 检查 API 是否可用（用户已配置 key）
   */
  function isEnabled() {
    return API_KEY && API_KEY !== 'YOUR_API_KEY_HERE' && API_KEY.length > 0;
  }

  /**
   * 搜索 YouTube 视频
   * @param {object} options - { category, tag, query }
   * @param {string} pageToken - 分页 token（翻页时传入）
   * @returns {Promise<{videos: Array, nextPageToken: string|null, hasMore: boolean}>}
   */
  function search(options, pageToken) {
    if (!isEnabled()) {
      return Promise.reject(new Error('YouTube API key not configured'));
    }

    options = options || {};
    var query = options.query || _buildQuery(options.category, options.tag);
    var maxResults = Math.min(options.maxResults || 20, 50);

    var url = BASE + '/search?part=snippet' +
      '&q=' + encodeURIComponent(query) +
      '&maxResults=' + maxResults +
      '&type=video' +
      '&relevanceLanguage=en' +
      '&videoDuration=medium' +
      '&key=' + API_KEY;

    if (pageToken) {
      url += '&pageToken=' + pageToken;
    }

    // 安全视频过滤（移除过于暴力或不当内容）
    url += '&safeSearch=moderate';

    // 记录当前搜索 key，用于后续翻页
    _currentKey = _cacheKey(options.category, options.tag);
    if (!pageToken) {
      _pageTokens[_currentKey] = { next: null, prev: null };
    }

    return fetch(url)
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error('YouTube API error: ' + (err.error && err.error.message ? err.error.message : response.status));
          });
        }
        return response.json();
      })
      .then(function(data) {
        // 保存分页 token
        if (data.nextPageToken) {
          _pageTokens[_currentKey] = _pageTokens[_currentKey] || {};
          _pageTokens[_currentKey].next = data.nextPageToken;
        }
        if (data.prevPageToken) {
          _pageTokens[_currentKey] = _pageTokens[_currentKey] || {};
          _pageTokens[_currentKey].prev = data.prevPageToken;
        }

        var items = data.items || [];
        var videos = items.map(_toAppVideo).filter(function(v) { return v !== null; });

        // 等待时长和播放量填充完成后返回，确保 UI 渲染时已有完整数据
        return _enrichWithDetails(videos).then(function() {
          return {
            videos: videos,
            nextPageToken: data.nextPageToken || null,
            prevPageToken: data.prevPageToken || null,
            hasMore: !!data.nextPageToken,
            totalResults: Math.min(data.pageInfo ? data.pageInfo.totalResults : 0, 200)
          };
        });
      });
  }

  /**
   * 获取下一页结果（基于上一次搜索）
   */
  function nextPage(options) {
    var key = _cacheKey(options && options.category, options && options.tag);
    var token = _pageTokens[key] ? _pageTokens[key].next : null;
    return search(options, token);
  }

  /**
   * 根据分类构建搜索词
   */
  function _buildQuery(category, tag) {
    var catQuery = category && category !== 'all' ? CATEGORY_QUERIES[category] : DEFAULT_QUERY;
    if (tag) {
      return catQuery + ' ' + tag;
    }
    return catQuery;
  }

  /**
   * 将 YouTube API 返回的 item 转换为 App 内部 video 格式
   */
  function _toAppVideo(item) {
    var snippet = item.snippet;
    var rawId = '';
    if (item.id && typeof item.id === 'object') {
      rawId = item.id.videoId || '';
    } else {
      rawId = item.id || '';
    }
    if (!rawId) return null;

    var thumbs = snippet.thumbnails || {};
    var thumbUrl = (thumbs.maxres || thumbs.high || thumbs.medium || thumbs['default'] || {}).url || '';

    return {
      id: 'yt-' + rawId,
      videoId: rawId,
      source: 'youtube',
      title: snippet.title || '',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      publishedAt: snippet.publishedAt || '',
      thumbnail: thumbUrl,
      category: _inferCategory(snippet),
      tags: _extractTags(snippet),
      duration: '--:--',          // 占位，_enrichWithDetails 会填充
      views: 0,                    // 占位
      dateAdded: snippet.publishedAt ? snippet.publishedAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
      location: { name: '', lat: 0, lng: 0, region: '' },
      _fromApi: true              // 标记来自 API（区别于静态数据）
    };
  }

  /**
   * 从标题/描述推断动物分类
   */
  function _inferCategory(snippet) {
    var text = ((snippet.title || '') + ' ' + (snippet.description || '')).toLowerCase();

    // 按优先级匹配（越具体的规则越靠前）
    if (text.match(/\b(frog|toad|salamander|amphibian|newt)\b/))          return 'amphibians';
    if (text.match(/\b(snake|lizard|iguana|chameleon|turtle|crocodile|alligator|gecko|reptile)\b/)) return 'reptiles';
    if (text.match(/\b(spider|scorpion|tarantula|insect|butterfly|bee|ant|beetle|moth|dragonfly|invertebrate)\b/)) return 'invertebrates';
    if (text.match(/\b(shark|whale|dolphin|octopus|cuttlefish|squid|jellyfish|coral|ocean|sea|marine|aquatic)\b/)) return 'aquatic';
    if (text.match(/\b(fish|clownfish|trevally|koi|salmon|trout|tuna|seahorse)\b/)) return 'fish';
    if (text.match(/\b(bird|eagle|hawk|parrot|penguin|owl|flamingo|peacock|sparrow|raven|crow|falcon)\b/)) return 'birds';
    if (text.match(/\b(mammal|lion|tiger|bear|wolf|elephant|monkey|ape|deer|fox|rabbit|horse|cow|cat|dog|panda|sloth|kangaroo|koala)\b/)) return 'mammals';

    return 'mammals'; // 默认
  }

  /**
   * 从标题/描述提取标签
   */
  function _extractTags(snippet) {
    var text = ((snippet.title || '') + ' ' + (snippet.description || '')).toLowerCase();
    var animalWords = ['lion', 'tiger', 'bear', 'wolf', 'eagle', 'shark', 'whale', 'dolphin', 'elephant',
      'panda', 'snake', 'frog', 'butterfly', 'octopus', 'penguin', 'sloth', 'chameleon', 'turtle',
      'flamingo', 'peacock', 'parrot', 'gorilla', 'cheetah', 'leopard', 'jaguar', 'zebra', 'giraffe',
      'kangaroo', 'koala', 'crocodile', 'hippo', 'rhino'];
    var found = [];
    for (var i = 0; i < animalWords.length; i++) {
      if (text.indexOf(animalWords[i]) !== -1) {
        found.push(animalWords[i]);
      }
    }
    // 再加频道名
    if (snippet.channelTitle) {
      var channel = snippet.channelTitle.toLowerCase();
      if (channel.indexOf('bbc') !== -1) found.push('bbc-earth');
      if (channel.indexOf('nat geo') !== -1 || channel.indexOf('national geographic') !== -1) found.push('nat-geo');
    }
    return found;
  }

  /**
   * 批量获取视频时长和播放量（使用 Videos API）
   * 返回 Promise，完成后 videos 数组会被原地更新
   */
  function _enrichWithDetails(videos) {
    if (!videos || videos.length === 0) return Promise.resolve();

    var ids = [];
    for (var i = 0; i < videos.length; i++) {
      if (videos[i] && videos[i].videoId) {
        ids.push(videos[i].videoId);
      }
    }
    if (ids.length === 0) return Promise.resolve();

    // 每批最多 50 个 ID
    var batchSize = 50;
    var promises = [];
    for (var j = 0; j < ids.length; j += batchSize) {
      var batch = ids.slice(j, j + batchSize);
      promises.push(_fetchDetailsBatch(batch, videos));
    }
    return Promise.all(promises).then(function() { return; });
  }

  function _fetchDetailsBatch(batchIds, allVideos) {
    var url = BASE + '/videos?part=contentDetails,statistics' +
      '&id=' + batchIds.join(',') +
      '&key=' + API_KEY;

    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.items) return;
        for (var i = 0; i < data.items.length; i++) {
          var item = data.items[i];
          var ytId = item.id;
          // 在 allVideos 中找到匹配项并更新
          for (var j = 0; j < allVideos.length; j++) {
            if (allVideos[j] && allVideos[j].videoId === ytId) {
              var duration = item.contentDetails ? item.contentDetails.duration : null;
              if (duration) {
                allVideos[j].duration = _parseDuration(duration);
              }
              var stats = item.statistics || {};
              allVideos[j].views = parseInt(stats.viewCount, 10) || 0;
              break;
            }
          }
        }
      })
      .catch(function() {
        // 静默失败，使用占位值
      });
  }

  /**
   * 将 ISO 8601 时长（PT1H2M3S）转换为 MM:SS 或 H:MM:SS
   */
  function _parseDuration(iso) {
    if (!iso) return '--:--';
    var match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '--:--';
    var h = parseInt(match[1] || 0, 10);
    var m = parseInt(match[2] || 0, 10);
    var s = parseInt(match[3] || 0, 10);
    if (h > 0) {
      return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /**
   * 重置分页状态（切换分类/标签时调用）
   */
  function resetPagination(category, tag) {
    var key = _cacheKey(category, tag);
    _pageTokens[key] = { next: null, prev: null };
  }

  return {
    isEnabled: isEnabled,
    search: search,
    nextPage: nextPage,
    resetPagination: resetPagination
  };
})();
