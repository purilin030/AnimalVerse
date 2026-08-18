/* ============================================================
   Animal Info Module — Multi-Source Animal Description Engine
   Sources: Wikipedia (summary), Wikidata (species profile),
            Local curated fun facts
   ============================================================ */
App.animalInfo = (function() {
  'use strict';




  // ── Fetch with timeout & metadata tracking ─────────────────
  var REQUEST_TIMEOUT = 6000; // 6 seconds per individual API call

  function _fetchWithTimeout(url, ms) {
    ms = ms || REQUEST_TIMEOUT;
    var startTime = Date.now();
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        var err = new Error('Request timed out after ' + ms + 'ms: ' + url);
        err.isTimeout = true;
        err.durationMs = Date.now() - startTime;
        err.url = url;
        reject(err);
      }, ms);

      fetch(url).then(function(response) {
        clearTimeout(timer);
        response.durationMs = Date.now() - startTime;
        response.requestUrl = url;
        resolve(response);
      }, function(err) {
        clearTimeout(timer);
        err.durationMs = Date.now() - startTime;
        err.url = url;
        err.isNetworkError = true;
        reject(err);
      });
    });
  }

  // Helper to create a standardized diagnostic record
  function _createDiagnostic(source, query, url) {
    return {
      source: source,
      query: query || '',
      url: url || '',
      status: 'PENDING',    // 'SUCCESS' | 'EMPTY_DATA' | 'TIMEOUT' | 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'INVALID_QUERY'
      statusCode: 0,
      durationMs: 0,
      reason: '',
      rawSummary: null,
      errorDetails: null,
      timestamp: new Date().toISOString()
    };
  }

  // ── Intelligent Wikipedia Text Synthesizer ─────────────────
  function analyzeWikipediaText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { overview: [], speciesList: [], highlights: [], leadText: '', fullCleanedText: '' };
    }

    // 1. Cut off boilerplate appendix sections (See also, References, External links, etc.)
    var mainText = rawText.replace(/\n==+\s*(See also|References|External links|Notes|Further reading|Bibliography|Taxonomy gallery|Gallery)[\s\S]*$/i, '').trim();

    // 2. Clean citations [1], [note 1] and pronunciation slashes
    var cleaned = mainText
      .replace(/\[\d+\]|\[note \d+\]|\[citation needed\]/gi, '')
      .replace(/\s*\(\/[^\/]+\/\s*(?:;\s*)?(?:listen)?\)/gi, '')
      .replace(/\s*\((?:listen|audio)\)/gi, '')
      .replace(/[ \t]+/g, ' ')
      .trim();

    var lines = cleaned.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

    var overviewPoints = [];
    var rawSpeciesItems = [];
    var highlights = [];
    var currentSection = 'Introduction';
    var isCollectingSpecies = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      var headerMatch = line.match(/^(=+)\s*(.*?)\s*\1$/);
      if (headerMatch) {
        currentSection = headerMatch[2].trim();
        var secLower = currentSection.toLowerCase();
        if (secLower.includes('species') || secLower.includes('subspecies') || secLower.includes('taxonomy') || secLower.includes('types') || secLower.includes('classification')) {
          isCollectingSpecies = true;
        } else if (headerMatch[1].length <= 2) {
          isCollectingSpecies = false;
        }
        continue;
      }

      // Detect list introduction (e.g. "Examples of bullfrogs include:")
      var isHangingIntro = /:\s*$/.test(line) || /\b(?:examples?|species|subspecies|members)\s+(?:of\s+[\w\s]+\s+)?includes?:?$/i.test(line);
      if (isHangingIntro) {
        isCollectingSpecies = true;
        continue;
      }

      // Check if line is a list item or short item under species section
      var isBullet = /^[\*•\-\–]\s+/.test(line);
      var isShortItem = line.length < 140 && (line.includes('(') || line.includes(',') || line.includes(' - ') || !/[.!?]$/.test(line));

      if (isCollectingSpecies && (isBullet || isShortItem)) {
        var itemClean = line.replace(/^[\*•\-\–]\s+/, '').trim();
        if (itemClean.length > 3 && !itemClean.endsWith(':')) {
          rawSpeciesItems.push(itemClean);
        }
        continue;
      }

      // Normal paragraph text
      var cleanLine = line.replace(/^[\*•\-\–]\s+/, '').trim();
      var sentences = cleanLine.match(/[^.!?]+[.!?]+(?:(?=\s+|$)|$)/g) || [cleanLine];

      for (var s = 0; s < sentences.length; s++) {
        var sent = sentences[s].trim();
        if (sent.length < 15 || /:\s*$/.test(sent)) continue;

        var lower = sent.toLowerCase();
        if (overviewPoints.length < 2 && (currentSection === 'Introduction' || lower.includes('is a') || lower.includes('refers to') || lower.includes('known as'))) {
          overviewPoints.push(sent);
        } else if (highlights.length < 2 && (lower.includes('social') || lower.includes('prey') || lower.includes('hunt') || lower.includes('habitat') || lower.includes('found in') || lower.includes('native to') || lower.includes('length') || lower.includes('weigh') || lower.includes('mane') || lower.includes('fur'))) {
          highlights.push(sent);
        }
      }
    }

    // Parse structured species list into { name, detail } point items
    var speciesList = [];
    for (var k = 0; k < rawSpeciesItems.length && speciesList.length < 5; k++) {
      var rawItem = rawSpeciesItems[k];
      var name = '', detail = '';

      if (rawItem.includes(' - ')) {
        var parts = rawItem.split(' - ');
        name = parts[0].trim();
        detail = parts[1] ? parts[1].trim() : '';
      } else if (rawItem.includes(' (')) {
        var parenIdx = rawItem.indexOf(' (');
        name = rawItem.substring(0, parenIdx).trim();
        var rest = rawItem.substring(parenIdx).trim();
        var commaAfterParen = rest.indexOf('),');
        if (commaAfterParen !== -1) {
          var sciName = rest.substring(1, commaAfterParen).trim();
          var loc = rest.substring(commaAfterParen + 2).trim();
          detail = loc || sciName;
        } else {
          detail = rest.replace(/^\(|\)$/g, '').trim();
        }
      } else if (rawItem.includes(',')) {
        var commaIdx = rawItem.indexOf(',');
        name = rawItem.substring(0, commaIdx).trim();
        detail = rawItem.substring(commaIdx + 1).trim();
      } else {
        name = rawItem;
        detail = '';
      }

      if (name.length > 2) {
        speciesList.push({ name: name, detail: detail });
      }
    }

    // Combine for summary count & backwards compatibility
    var totalPointsCount = overviewPoints.length + speciesList.length + highlights.length;

    return {
      overview: overviewPoints.slice(0, 2),
      speciesList: speciesList,
      highlights: speciesList.length === 0 ? highlights.slice(0, 2) : [],
      pointsCount: totalPointsCount,
      leadText: overviewPoints[0] || '',
      fullCleanedText: cleaned
    };
  }

  // ── Source 1: Wikipedia Summary ────────────────────────────
  function _fetchWikipedia(animalName, diagnostic) {
    diagnostic = diagnostic || _createDiagnostic('Wikipedia', animalName, '');
    var startTime = Date.now();

    if (!animalName || !animalName.trim()) {
      diagnostic.status = 'INVALID_QUERY';
      diagnostic.reason = 'Animal name is empty or could not be extracted from title.';
      return Promise.resolve({ data: null, diagnostic: diagnostic });
    }

    // Fetch full plain-text extract without exintro cutoff + follow redirects
    var url = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exlimit=1&redirects=1&titles='
      + encodeURIComponent(animalName.trim()) + '&format=json&origin=*';
    diagnostic.url = url;

    return _fetchWithTimeout(url).then(function(r) {
      diagnostic.statusCode = r.status;
      if (!r.ok) {
        diagnostic.status = 'HTTP_ERROR';
        diagnostic.reason = 'Wikipedia API returned HTTP ' + r.status + ' (' + r.statusText + ')';
        return { data: null, diagnostic: diagnostic };
      }
      return r.json().then(function(data) {
        diagnostic.durationMs = Date.now() - startTime;
        var pages = data.query && data.query.pages;
        if (!pages) {
          diagnostic.status = 'EMPTY_DATA';
          diagnostic.reason = 'Wikipedia API response query.pages is empty.';
          diagnostic.rawSummary = JSON.stringify(data);
          return { data: null, diagnostic: diagnostic };
        }
        var pageId = Object.keys(pages)[0];
        if (pageId === '-1' || !pages[pageId] || !pages[pageId].extract) {
          diagnostic.status = 'EMPTY_DATA';
          diagnostic.reason = (pageId === '-1')
            ? 'Wikipedia confirmed: No article exists for "' + animalName + '" (pageId: -1).'
            : 'Wikipedia article exists ("' + (pages[pageId].title || '') + '") but has no lead extract text.';
          diagnostic.rawSummary = 'Page ID: ' + pageId + ', Title: ' + (pages[pageId] ? pages[pageId].title : 'unknown');
          return { data: null, diagnostic: diagnostic };
        }

        var page = pages[pageId];
        var rawExtract = (page.extract || '').trim();
        if (!rawExtract) {
          diagnostic.status = 'EMPTY_DATA';
          diagnostic.reason = 'Wikipedia article "' + page.title + '" returned blank extract.';
          return { data: null, diagnostic: diagnostic };
        }

        // Analyze and synthesize point form
        var analysis = analyzeWikipediaText(rawExtract);
        var totalPoints = (analysis.overview ? analysis.overview.length : 0) +
                          (analysis.speciesList ? analysis.speciesList.length : 0) +
                          (analysis.highlights ? analysis.highlights.length : 0);

        diagnostic.status = 'SUCCESS';
        diagnostic.reason = 'Article found: "' + page.title + '" (' + rawExtract.length + ' chars, ' + totalPoints + ' points extracted)';
        diagnostic.rawSummary = { pageId: pageId, title: page.title, extractLength: rawExtract.length, pointsCount: totalPoints };

        return {
          data: {
            title: page.title,
            extract: rawExtract,
            overview: analysis.overview,
            speciesList: analysis.speciesList,
            highlights: analysis.highlights,
            leadText: analysis.leadText,
            fullCleanedText: analysis.fullCleanedText,
            pageUrl: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
            source: 'Wikipedia',
            sourceIcon: '🌐'
          },
          diagnostic: diagnostic
        };
      });
    }).catch(function(err) {
      diagnostic.durationMs = Date.now() - startTime;
      if (err.isTimeout) {
        diagnostic.status = 'TIMEOUT';
        diagnostic.reason = 'Wikipedia request timed out after ' + diagnostic.durationMs + 'ms.';
      } else if (err.isNetworkError) {
        diagnostic.status = 'NETWORK_ERROR';
        diagnostic.reason = 'Network connection failed or was blocked (CORS / offline).';
      } else {
        diagnostic.status = 'PARSE_ERROR';
        diagnostic.reason = 'Error parsing Wikipedia response: ' + err.message;
      }
      diagnostic.errorDetails = err.stack || err.message;
      return { data: null, diagnostic: diagnostic };
    });
  }

  // ── Source 2: Wikidata Species Profile ─────────────────────
  function _fetchWikidata(animalName, diagnostic) {
    diagnostic = diagnostic || _createDiagnostic('Wikidata', animalName, '');
    var startTime = Date.now();

    if (!animalName || !animalName.trim()) {
      diagnostic.status = 'INVALID_QUERY';
      diagnostic.reason = 'Animal name is empty or could not be extracted from title.';
      return Promise.resolve({ data: null, diagnostic: diagnostic });
    }

    // Step 1: Query Wikipedia with redirects for wikibase_item
    var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&redirects=1&titles='
      + encodeURIComponent(animalName.trim()) + '&format=json&origin=*';
    diagnostic.url = wikiUrl;

    return _fetchWithTimeout(wikiUrl).then(function(r) {
      diagnostic.statusCode = r.status;
      if (!r.ok) {
        throw new Error('Wikipedia pageprops returned HTTP ' + r.status);
      }
      return r.json();
    }).then(function(data) {
      var pages = data.query && data.query.pages;
      var pageId = pages ? Object.keys(pages)[0] : null;
      var entityId = (pageId && pageId !== '-1' && pages[pageId].pageprops) ? pages[pageId].pageprops.wikibase_item : null;

      if (entityId) {
        return entityId;
      }

      // Fallback Step 1.5: If Wikipedia didn't give wikibase_item, search Wikidata directly!
      var wdSearchUrl = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search='
        + encodeURIComponent(animalName.trim()) + '&language=en&limit=1&format=json&origin=*';
      return _fetchWithTimeout(wdSearchUrl, 4000).then(function(sr) {
        return sr.json();
      }).then(function(sdata) {
        if (sdata && sdata.search && sdata.search.length > 0) {
          return sdata.search[0].id;
        }
        return null;
      }).catch(function() {
        return null;
      });
    }).then(function(entityId) {
      if (!entityId) {
        diagnostic.durationMs = Date.now() - startTime;
        diagnostic.status = 'EMPTY_DATA';
        diagnostic.reason = 'No Wikidata entity (Q-ID) found for animal name "' + animalName + '".';
        return { data: null, diagnostic: diagnostic };
      }

      // Step 2: Fetch Entity Claims JSON
      var wdUrl = 'https://www.wikidata.org/wiki/Special:EntityData/' + entityId + '.json';
      diagnostic.url = wdUrl;

      return _fetchWithTimeout(wdUrl).then(function(r) {
        diagnostic.statusCode = r.status;
        return r.json();
      }).then(function(data) {
        diagnostic.durationMs = Date.now() - startTime;
        var entity = data && data.entities;
        var ent = entity ? entity[entityId] : null;
        if (!ent) {
          diagnostic.status = 'EMPTY_DATA';
          diagnostic.reason = 'Wikidata entity data for "' + entityId + '" is empty.';
          return { data: null, diagnostic: diagnostic };
        }

        var claims = ent.claims || {};
        var scientificName = _getClaimValue(claims, 'P225');
        var taxonRank = _getClaimValue(claims, 'P105');
        var description = ent.descriptions && ent.descriptions.en && ent.descriptions.en.value;
        var conservationRaw = _getClaimValue(claims, 'P141');
        var conservation = (conservationRaw && WIKIDATA_IUCN_MAP[conservationRaw]) ? WIKIDATA_IUCN_MAP[conservationRaw] : conservationRaw;

        var resultData = {
          name: (ent.labels && ent.labels.en && ent.labels.en.value) || animalName,
          description: description || null,
          scientificName: scientificName || null,
          conservationStatus: conservation || null,
          taxonRank: taxonRank || null,
          parentTaxon: _getClaimValue(claims, 'P171'),
          kingdom: _getClaimValue(claims, 'P1057'),
          phylum: _getClaimValue(claims, 'P7927'),
          lifespan: _getClaimValue(claims, 'P3063'),
          gestationPeriod: _getClaimValue(claims, 'P3066'),
          diet: _getClaimValue(claims, 'P4852'),
          source: 'Wikidata',
          sourceIcon: '📊',
          pageUrl: 'https://www.wikidata.org/wiki/' + entityId
        };

        // Check if we actually have at least one informative field
        var hasInfo = !!(resultData.description || resultData.scientificName || resultData.taxonRank || resultData.conservationStatus || resultData.diet || resultData.lifespan);
        if (!hasInfo) {
          diagnostic.status = 'EMPTY_DATA';
          diagnostic.reason = 'Wikidata entity ' + entityId + ' exists but lacks taxonomic & profile claims.';
          return { data: null, diagnostic: diagnostic };
        }

        diagnostic.status = 'SUCCESS';
        diagnostic.reason = 'Entity found: ' + entityId + ' (' + (resultData.scientificName || resultData.name) + ')';
        diagnostic.rawSummary = { entityId: entityId, scientificName: resultData.scientificName, rank: resultData.taxonRank };

        return { data: resultData, diagnostic: diagnostic };
      });
    }).catch(function(err) {
      diagnostic.durationMs = Date.now() - startTime;
      if (err.isTimeout) {
        diagnostic.status = 'TIMEOUT';
        diagnostic.reason = 'Wikidata request timed out after ' + diagnostic.durationMs + 'ms.';
      } else if (err.isNetworkError) {
        diagnostic.status = 'NETWORK_ERROR';
        diagnostic.reason = 'Network connection failed while querying Wikidata (CORS / offline).';
      } else {
        diagnostic.status = 'PARSE_ERROR';
        diagnostic.reason = 'Error parsing Wikidata response: ' + err.message;
      }
      diagnostic.errorDetails = err.stack || err.message;
      return { data: null, diagnostic: diagnostic };
    });
  }

  function _getClaimValue(claims, propId) {
    if (!claims[propId] || !claims[propId][0]) return null;
    var mainsnak = claims[propId][0].mainsnak;
    if (!mainsnak || mainsnak.snaktype !== 'value') return null;
    var datavalue = mainsnak.datavalue;
    if (!datavalue) return null;
    if (datavalue.type === 'string') return datavalue.value;
    if (datavalue.type === 'monolingualtext') return datavalue.value.text;
    if (datavalue.type === 'quantity') return datavalue.value.amount;
    if (datavalue.type === 'wikibase-entityid') return datavalue.value.id;
    return null;
  }

  // ── Source 3: Local Curated Facts ──────────────────────────
  var _localFactsCache = null;

  function _loadLocalFacts() {
    if (_localFactsCache) return Promise.resolve(_localFactsCache);
    return _fetchWithTimeout('data/animal-facts.json?t=' + Date.now(), 5000)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _localFactsCache = data.species || {};
        return _localFactsCache;
      })
      .catch(function() {
        _localFactsCache = {};
        return {};
      });
  }

  function _fetchLocalFacts(animalName) {
    var key = animalName ? animalName.toLowerCase().trim() : '';
    return _loadLocalFacts().then(function(speciesData) {
      var entry = speciesData[key];
      if (entry) {
        return {
          name: entry.description ? entry.name || animalName : animalName,
          description: entry.description || null,
          funFacts: entry.funFacts || [],
          diet: entry.diet || null,
          habitat: entry.habitat || null,
          lifespan: entry.lifespan || null,
          conservationStatus: entry.conservationStatus || null,
          topSpeed: entry.topSpeed || null,
          source: 'AnimalVerse Facts',
          sourceIcon: '🎯',
          pageUrl: null
        };
      }
      return null;
    });
  }

  // ── Source 4: iNaturalist ──────────────────────────────
  function _fetchINaturalist(animalName, diagnostic) {
    diagnostic = diagnostic || _createDiagnostic('iNaturalist', animalName, '');
    var startTime = Date.now();

    if (!animalName || !animalName.trim()) {
      diagnostic.status = 'INVALID_QUERY';
      diagnostic.reason = 'Animal name is empty or could not be extracted from title.';
      return Promise.resolve({ data: null, diagnostic: diagnostic });
    }

    // Step 1: search for taxon by name (first attempt with rank, then fallback without rank)
    var searchUrl = 'https://api.inaturalist.org/v1/taxa?q=' +
      encodeURIComponent(animalName.trim()) +
      '&rank=species,genus,family,order,class&per_page=1&locale=en';
    diagnostic.url = searchUrl;

    return _fetchWithTimeout(searchUrl, 6000).then(function(r) {
      diagnostic.statusCode = r.status;
      if (!r.ok) {
        diagnostic.status = 'HTTP_ERROR';
        diagnostic.reason = 'iNaturalist API returned HTTP ' + r.status;
        return { data: null, diagnostic: diagnostic };
      }
      return r.json();
    }).then(function(data) {
      var results = data && data.results;
      if (!results || results.length === 0) {
        // Fallback Step: try broad query without rank filter
        var fallbackUrl = 'https://api.inaturalist.org/v1/taxa?q=' +
          encodeURIComponent(animalName.trim()) + '&per_page=1&locale=en';
        return _fetchWithTimeout(fallbackUrl, 4000).then(function(fr) {
          return fr.json();
        }).then(function(fdata) {
          if (fdata && fdata.results && fdata.results.length > 0) {
            return fdata.results[0];
          }
          return null;
        }).catch(function() {
          return null;
        });
      }
      return results[0];
    }).then(function(taxon) {
      diagnostic.durationMs = Date.now() - startTime;
      if (!taxon) {
        diagnostic.status = 'EMPTY_DATA';
        diagnostic.reason = 'iNaturalist confirmed: 0 taxa match query "' + animalName + '".';
        return { data: null, diagnostic: diagnostic };
      }

      // Collect observation stats
      var iconicName = taxon.iconic_taxon_name || '';
      var conservationStatus = taxon.conservation_status
        ? (taxon.conservation_status.status_name || null)
        : null;

      // Extract taxonomy lineage from ancestors if available
      var ancestors = [];
      if (taxon.ancestors && taxon.ancestors.length > 0) {
        for (var j = 0; j < taxon.ancestors.length; j++) {
          var ancestor = taxon.ancestors[j];
          if (['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].indexOf(ancestor.rank) !== -1) {
            ancestors.push({ name: ancestor.name, rank: ancestor.rank });
          }
        }
      }

      // Build photo list (up to 3) with CDN normalization
      var photos = [];
      function normalizePhotoUrl(rawUrl) {
        if (!rawUrl) return null;
        // Prefer static.inaturalist.org over raw s3 bucket for better global connectivity
        return rawUrl.replace('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org');
      }

      if (taxon.taxon_photos && taxon.taxon_photos.length > 0) {
        for (var i = 0; i < Math.min(3, taxon.taxon_photos.length); i++) {
          var p = taxon.taxon_photos[i];
          if (p.photo) {
            var pUrl = p.photo.medium_url || p.photo.small_url || p.photo.url || p.photo.original_url;
            var normalized = normalizePhotoUrl(pUrl);
            if (normalized && photos.indexOf(normalized) === -1) {
              photos.push(normalized);
            }
          }
        }
      } else if (taxon.default_photo) {
        var dpUrl = taxon.default_photo.medium_url || taxon.default_photo.small_url || taxon.default_photo.url;
        var normDp = normalizePhotoUrl(dpUrl);
        if (normDp) photos.push(normDp);
      }

      var resultData = {
        id: taxon.id,
        name: taxon.name,
        commonName: taxon.preferred_common_name || taxon.name,
        rank: taxon.rank,
        ancestors: ancestors,
        observationsCount: taxon.observations_count || 0,
        iconicTaxon: iconicName,
        conservationStatus: conservationStatus,
        wikipediaSummary: taxon.wikipedia_summary || null,
        wikipediaUrl: taxon.wikipedia_url || null,
        photos: photos,
        inatUrl: 'https://www.inaturalist.org/taxa/' + taxon.id,
        source: 'iNaturalist',
        sourceIcon: '🌿'
      };

      diagnostic.status = 'SUCCESS';
      diagnostic.reason = 'Taxon found: ID ' + taxon.id + ' (' + (resultData.commonName || taxon.name) + ') - ' + photos.length + ' photos';
      diagnostic.rawSummary = { id: taxon.id, name: taxon.name, commonName: resultData.commonName, observations: resultData.observationsCount };

      return { data: resultData, diagnostic: diagnostic };
    }).catch(function(err) {
      diagnostic.durationMs = Date.now() - startTime;
      if (err.isTimeout) {
        diagnostic.status = 'TIMEOUT';
        diagnostic.reason = 'iNaturalist request timed out after ' + diagnostic.durationMs + 'ms.';
      } else if (err.isNetworkError) {
        diagnostic.status = 'NETWORK_ERROR';
        diagnostic.reason = 'Network connection failed while querying iNaturalist (CORS / offline).';
      } else {
        diagnostic.status = 'PARSE_ERROR';
        diagnostic.reason = 'Error parsing iNaturalist response: ' + err.message;
      }
      diagnostic.errorDetails = err.stack || err.message;
      return { data: null, diagnostic: diagnostic };
    });
  }

  // ── Fetch single source with diagnostics (for retry) ───────
  function fetchSingleSource(source, animalName) {
    if (source === 'wikipedia') {
      return _fetchWikipedia(animalName);
    } else if (source === 'wikidata') {
      return _fetchWikidata(animalName);
    } else if (source === 'inaturalist') {
      return _fetchINaturalist(animalName);
    }
    return Promise.reject(new Error('Unknown source: ' + source));
  }

  // ── Fetch all sources in parallel ──────────────────────────
  function fetchAll(animalName) {
    var diagWiki = _createDiagnostic('Wikipedia', animalName, '');
    var diagWd   = _createDiagnostic('Wikidata', animalName, '');
    var diagInat = _createDiagnostic('iNaturalist', animalName, '');

    // Overall safety timeout — if nothing returns in 10s, resolve with timeout status
    var overallTimer;
    var overallPromise = new Promise(function(resolve) {
      overallTimer = setTimeout(function() {
        resolve({ timedOut: true });
      }, 10000);
    });

    var fetchPromise = Promise.all([
      _fetchWikipedia(animalName, diagWiki),
      _fetchWikidata(animalName, diagWd),
      _fetchINaturalist(animalName, diagInat)
    ]).then(function(results) {
      clearTimeout(overallTimer);
      var wikiRes = results[0] || {};
      var wdRes   = results[1] || {};
      var inatRes = results[2] || {};

      return {
        wikipedia: wikiRes.data || null,
        wikidata: wdRes.data || null,
        inaturalist: inatRes.data || null,
        animalName: animalName,
        diagnostics: {
          wikipedia: wikiRes.diagnostic || diagWiki,
          wikidata: wdRes.diagnostic || diagWd,
          inaturalist: inatRes.diagnostic || diagInat
        }
      };
    });

    // Race: whichever comes first
    return Promise.race([fetchPromise, overallPromise]).then(function(result) {
      if (result && result.timedOut) {
        diagWiki.status = diagWiki.status === 'SUCCESS' ? diagWiki.status : 'TIMEOUT';
        diagWd.status   = diagWd.status === 'SUCCESS' ? diagWd.status : 'TIMEOUT';
        diagInat.status = diagInat.status === 'SUCCESS' ? diagInat.status : 'TIMEOUT';
        diagWiki.reason = diagWiki.reason || 'Overall fetch operation timed out (10s limit).';
        diagWd.reason   = diagWd.reason || 'Overall fetch operation timed out (10s limit).';
        diagInat.reason = diagInat.reason || 'Overall fetch operation timed out (10s limit).';

        return {
          wikipedia: null,
          wikidata: null,
          inaturalist: null,
          animalName: animalName,
          diagnostics: {
            wikipedia: diagWiki,
            wikidata: diagWd,
            inaturalist: diagInat
          }
        };
      }
      return result;
    });
  }

  // ── Format helper for rendering ────────────────────────────
  // Wikidata IUCN Red List entity Q-ID mapping
  var WIKIDATA_IUCN_MAP = {
    'Q211005': 'Least Concern',
    'Q719675': 'Near Threatened',
    'Q278113': 'Vulnerable',
    'Q11394': 'Endangered',
    'Q237350': 'Critically Endangered',
    'Q239588': 'Extinct in the Wild',
    'Q237282': 'Extinct',
    'Q3245245': 'Data Deficient',
    'Q80978': 'Not Evaluated',
    'Q28028751': 'Not Evaluated',
    'Q21706691': 'Near Threatened',
    'Q21706692': 'Near Threatened',
    'Q21706693': 'Least Concern'
  };

  // Shared IUCN status mapping → { icon, label, key } where `key` is the
  // CSS modifier suffix used by .conservation-pill--<key>.
  // The list is ordered MOST-SEVERE first: when a status string carries
  // modifiers (e.g. "Vulnerable to Critically Endangered (species
  // dependent)"), the FIRST matching entry wins → the worst-case category
  // is displayed, which is the conservative choice for conservation info.
  var CONSERVATION_STATUSES = [
    { key: 'ex', label: 'Extinct',                icon: '⚫', match: /\bextinct\b(?!\s+in the wild)|\bq237282\b/i },
    { key: 'ew', label: 'Extinct in the Wild',    icon: '💀', match: /extinct in the wild|\bq239588\b/i },
    { key: 'cr', label: 'Critically Endangered',  icon: '⛔', match: /critically endangered|\bcr\b|\bq237350\b/i },
    { key: 'en', label: 'Endangered',             icon: '🔴', match: /\bendangered\b|\bq11394\b/i },
    { key: 'vu', label: 'Vulnerable',             icon: '🟠', match: /\bvulnerable\b|\bq278113\b/i },
    { key: 'nt', label: 'Near Threatened',        icon: '🟡', match: /\bnear threatened\b|\bnt\b|\bq719675\b|\bq2170669[12]\b/i },
    { key: 'lc', label: 'Least Concern',          icon: '🟢', match: /\bleast concern\b|\blc\b|\bq211005\b|\bq21706693\b/i },
    { key: 'dd', label: 'Data Deficient',         icon: '⬜', match: /\bdata deficient\b|\bdd\b|\bq3245245\b/i },
    { key: 'ne', label: 'Not Evaluated',          icon: '⬜', match: /\bnot evaluated\b|\bne\b|\bq80978\b|\bq28028751\b/i }
  ];

  function getConservationInfo(status) {
    if (!status) return null;
    var lower = String(status).toLowerCase();
    for (var i = 0; i < CONSERVATION_STATUSES.length; i++) {
      if (CONSERVATION_STATUSES[i].match.test(lower)) {
        return CONSERVATION_STATUSES[i];
      }
    }
    return null;
  }

  function formatConservationStatus(status) {
    var info = getConservationInfo(status);
    if (info) return info.icon + ' ' + info.label;
    return status;
  }

  /**
   * Build a prominent colored IUCN status pill for the top of the
   * playback encyclopedia drawer (e.g. "⛔ Critically Endangered").
   * Returns an HTML string, or '' if the status is unknown/empty.
   */
  function buildConservationPill(status) {
    var info = getConservationInfo(status);
    if (!info) return '';
    return '<span class="conservation-pill conservation-pill--' + info.key + '" role="img" aria-label="IUCN conservation status: ' + info.label + '">' +
      '<span class="conservation-pill__dot" aria-hidden="true">' + info.icon + '</span>' +
      '<span class="conservation-pill__code">' + info.key.toUpperCase() + '</span>' +
      '<span class="conservation-pill__label">' + info.label + '</span>' +
      '</span>';
  }

  // ── Public API ──────────────────────────────────────────────
  function extractAnimalName(title) {
    return App.utils.extractAnimalName(title);
  }

  function fetchWikipedia(animalName) {
    return _fetchWikipedia(animalName).then(function(res) { return res.data; });
  }

  function fetchWikidata(animalName) {
    return _fetchWikidata(animalName).then(function(res) { return res.data; });
  }

  function fetchLocalFacts(animalName) {
    return _fetchLocalFacts(animalName);
  }

  return {
    extractAnimalName: extractAnimalName,
    fetchWikipedia: fetchWikipedia,
    fetchWikidata: fetchWikidata,
    fetchLocalFacts: fetchLocalFacts,
    fetchINaturalist: function(name) { return _fetchINaturalist(name).then(function(res) { return res.data; }); },
    fetchSingleSource: fetchSingleSource,
    fetchAll: fetchAll,
    analyzeWikipediaText: analyzeWikipediaText,
    formatConservationStatus: formatConservationStatus,
    buildConservationPill: buildConservationPill,
    getConservationInfo: getConservationInfo,
    WIKIDATA_IUCN_MAP: WIKIDATA_IUCN_MAP
  };
})();
