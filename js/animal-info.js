/* ============================================================
   Animal Info Module — Multi-Source Animal Description Engine
   Sources: Wikipedia (summary), Wikidata (species profile),
            Local curated fun facts
   ============================================================ */
App.animalInfo = (function() {
  'use strict';




  // ── Fetch with timeout — prevents hanging on slow APIs ────
  var REQUEST_TIMEOUT = 6000; // 6 seconds per individual API call

  function _fetchWithTimeout(url, ms) {
    ms = ms || REQUEST_TIMEOUT;
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        reject(new Error('Request timed out: ' + url));
      }, ms);

      fetch(url).then(function(response) {
        clearTimeout(timer);
        resolve(response);
      }, function(err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ── Source 1: Wikipedia Summary ────────────────────────────
  function _fetchWikipedia(animalName) {
    var url = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&exlimit=1&titles='
      + encodeURIComponent(animalName) + '&format=json&origin=*';

    return _fetchWithTimeout(url).then(function(r) {
      return r.json();
    }).then(function(data) {
      var pages = data.query && data.query.pages;
      if (!pages) return null;
      var pageId = Object.keys(pages)[0];
      if (pageId === '-1' || !pages[pageId].extract) return null;

      var page = pages[pageId];
      return {
        title: page.title,
        extract: page.extract,
        pageUrl: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
        source: 'Wikipedia',
        sourceIcon: '🌐'
      };
    }).catch(function() {
      return null;
    });
  }

  // ── Source 2: Wikidata Species Profile ─────────────────────
  function _fetchWikidata(animalName) {
    var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles='
      + encodeURIComponent(animalName) + '&format=json&origin=*';

    return _fetchWithTimeout(wikiUrl).then(function(r) {
      return r.json();
    }).then(function(data) {
      var pages = data.query && data.query.pages;
      if (!pages) return null;
      var pageId = Object.keys(pages)[0];
      if (pageId === '-1') return null;

      var page = pages[pageId];
      var entityId = page.pageprops && page.pageprops.wikibase_item;
      if (!entityId) return null;

      return entityId; // pass entity ID to next step
    }).then(function(entityId) {
      if (!entityId) return null; // short-circuit if no entity ID

      var wdUrl = 'https://www.wikidata.org/wiki/Special:EntityData/' + entityId + '.json';
      return _fetchWithTimeout(wdUrl).then(function(r) { return r.json(); });
    }).then(function(data) {
      if (!data) return null;

      var entity = data && data.entities;
      if (!entity) return null;
      var eId = Object.keys(entity)[0];
      var ent = entity[eId];
      if (!ent) return null;

      var claims = ent.claims || {};
      return {
        name: ent.labels && ent.labels.en && ent.labels.en.value,
        description: ent.descriptions && ent.descriptions.en && ent.descriptions.en.value,
        scientificName: _getClaimValue(claims, 'P225'),
        conservationStatus: _getClaimValue(claims, 'P141'),
        taxonRank: _getClaimValue(claims, 'P105'),
        parentTaxon: _getClaimValue(claims, 'P171'),
        kingdom: _getClaimValue(claims, 'P1057'),
        phylum: _getClaimValue(claims, 'P7927'),
        lifespan: _getClaimValue(claims, 'P3063'),
        gestationPeriod: _getClaimValue(claims, 'P3066'),
        diet: _getClaimValue(claims, 'P4852'),
        source: 'Wikidata',
        sourceIcon: '📊',
        pageUrl: 'https://www.wikidata.org/wiki/' + eId
      };
    }).catch(function() {
      return null;
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

  // ── Public API ──────────────────────────────────────────────
  // Delegates to App.utils.extractAnimalName (canonical implementation in utils.js)
  function extractAnimalName(title) {
    return App.utils.extractAnimalName(title);
  }

  function fetchWikipedia(animalName) {
    return _fetchWikipedia(animalName);
  }

  function fetchWikidata(animalName) {
    return _fetchWikidata(animalName);
  }

  function fetchLocalFacts(animalName) {
    return _fetchLocalFacts(animalName);
  }

  // ── Source 4: iNaturalist ──────────────────────────────
  function _fetchINaturalist(animalName) {
    // Step 1: search for taxon by name
    var searchUrl = 'https://api.inaturalist.org/v1/taxa?q=' +
      encodeURIComponent(animalName) +
      '&rank=species,genus,family&per_page=1&locale=en';

    return _fetchWithTimeout(searchUrl, 6000).then(function(r) {
      return r.json();
    }).then(function(data) {
      if (!data || !data.results || data.results.length === 0) return null;
      var taxon = data.results[0];

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
          // We only care about major ranks for breadcrumbs
          if (['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].indexOf(ancestor.rank) !== -1) {
            ancestors.push({ name: ancestor.name, rank: ancestor.rank });
          }
        }
      }

      // Build photo list (up to 3)
      var photos = [];
      if (taxon.taxon_photos && taxon.taxon_photos.length > 0) {
        for (var i = 0; i < Math.min(3, taxon.taxon_photos.length); i++) {
          var p = taxon.taxon_photos[i];
          if (p.photo && p.photo.medium_url) photos.push(p.photo.medium_url);
        }
      } else if (taxon.default_photo && taxon.default_photo.medium_url) {
        photos.push(taxon.default_photo.medium_url);
      }

      return {
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
    }).catch(function() {
      return null;
    });
  }

  // ── Fetch all sources in parallel ──────────────────────────
  function fetchAll(animalName) {
    // Overall safety timeout — if nothing returns in 10s, resolve with nulls
    var overallTimer;
    var overallPromise = new Promise(function(resolve) {
      overallTimer = setTimeout(function() {
        resolve({ timedOut: true });
      }, 10000);
    });

    var fetchPromise = Promise.all([
      _fetchWikipedia(animalName),
      _fetchWikidata(animalName),
      _fetchINaturalist(animalName)
    ]).then(function(results) {
      clearTimeout(overallTimer);
      return {
        wikipedia: results[0],
        wikidata: results[1],
        inaturalist: results[2],
        animalName: animalName
      };
    });

    // Race: whichever comes first
    return Promise.race([fetchPromise, overallPromise]).then(function(result) {
      if (result && result.timedOut) {
        return {
          wikipedia: null,
          wikidata: null,
          inaturalist: null,
          animalName: animalName
        };
      }
      return result;
    });
  }

  // ── Format helper for rendering ────────────────────────────
  function formatConservationStatus(status) {
    if (!status) return null;
    var map = {
      'least concern': { label: 'Least Concern', icon: '🟢' },
      'near threatened': { label: 'Near Threatened', icon: '🟡' },
      'vulnerable': { label: 'Vulnerable', icon: '🟠' },
      'endangered': { label: 'Endangered', icon: '🔴' },
      'critically endangered': { label: 'Critically Endangered', icon: '⛔' },
      'extinct in the wild': { label: 'Extinct in the Wild', icon: '💀' },
      'extinct': { label: 'Extinct', icon: '⚫' }
    };
    var lower = status.toLowerCase();
    var mapped = map[lower] || map[lower.replace(/^lc$/i, 'least concern')];
    if (mapped) return mapped.icon + ' ' + mapped.label;
    return status;
  }

  return {
    extractAnimalName: extractAnimalName,
    fetchWikipedia: fetchWikipedia,
    fetchWikidata: fetchWikidata,
    fetchLocalFacts: fetchLocalFacts,
    fetchINaturalist: _fetchINaturalist,
    fetchAll: fetchAll,
    formatConservationStatus: formatConservationStatus
  };
})();
