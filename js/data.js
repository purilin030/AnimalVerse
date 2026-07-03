/* ============================================================
   Video Data Loader & Filter
   ============================================================ */
App.data = (function() {
  'use strict';

  var cache = null;
  var _gbifCache = {}; // species name → GBIF image URL

  // Common animal → GBIF scientific name mapping
  var _speciesMap = {
    'lion': 'Panthera leo',
    'elephant': 'Loxodonta africana',
    'parrot': 'Psittaciformes',
    'eagle': 'Aquila chrysaetos',
    'penguin': 'Aptenodytes forsteri',
    'flamingo': 'Phoenicopterus roseus',
    'polar bear': 'Ursus maritimus',
    'dolphin': 'Tursiops truncatus',
    'sea turtle': 'Chelonia mydas',
    'turtle': 'Chelonia mydas',
    'chameleon': 'Furcifer pardalis',
    'octopus': 'Enteroctopus dofleini',
    'tree frog': 'Hylidae',
    'frog': 'Anura',
    'great white shark': 'Carcharodon carcharias',
    'shark': 'Carcharodon carcharias',
    'kitten': 'Felis catus',
    'cat': 'Felis catus',
    'bald eagle': 'Haliaeetus leucocephalus',
    'lioness': 'Panthera leo',
    'macaw': 'Ara macao',
    'toucan': 'Ramphastos toco',
    'tiger': 'Panthera tigris',
    'red panda': 'Ailurus fulgens',
    'peacock': 'Pavo cristatus',
    'komodo dragon': 'Varanus komodoensis',
    'giant panda': 'Ailuropoda melanoleuca',
    'snow leopard': 'Panthera uncia',
    'asian elephant': 'Elephas maximus',
    'sun bear': 'Helarctos malayanus',
    'giraffe': 'Giraffa camelopardalis',
    'cheetah': 'Acinonyx jubatus',
    'zebra': 'Equus quagga',
    'hippopotamus': 'Hippopotamus amphibius',
    'rhinoceros': 'Ceratotherium simum',
    'gorilla': 'Gorilla gorilla',
    'chimpanzee': 'Pan troglodytes',
    'brown bear': 'Ursus arctos',
    'red fox': 'Vulpes vulpes',
    'wild boar': 'Sus scrofa',
    'european bison': 'Bison bonasus',
    'lynx': 'Lynx lynx',
    'reindeer': 'Rangifer tarandus',
    'badger': 'Meles meles',
    'grizzly bear': 'Ursus arctos horribilis',
    'moose': 'Alces alces',
    'coyote': 'Canis latrans',
    'bison': 'Bison bison',
    'raccoon': 'Procyon lotor',
    'beaver': 'Castor canadensis',
    'mountain lion': 'Puma concolor',
    'elk': 'Cervus canadensis',
    'jaguar': 'Panthera onca',
    'sloth': 'Bradypus tridactylus',
    'anaconda': 'Eunectes murinus',
    'capybara': 'Hydrochoerus hydrochaeris',
    'llama': 'Lama glama',
    'piranha': 'Serrasalmus',
    'vampire bat': 'Desmodus rotundus',
    'howler monkey': 'Alouatta',
    'kangaroo': 'Macropus',
    'koala': 'Phascolarctos cinereus',
    'platypus': 'Ornithorhynchus anatinus',
    'wombat': 'Vombatus ursinus',
    'tasmanian devil': 'Sarcophilus harrisii',
    'dingo': 'Canis lupus dingo',
    'emu': 'Dromaius novaehollandiae',
    'kookaburra': 'Dacelo novaeguineae',
    'wallaby': 'Macropus agilis',
    'seal': 'Pinnipedia',
    'blue whale': 'Balaenoptera musculus',
    'orca': 'Orcinus orca',
    'albatross': 'Diomedeidae',
    'leopard seal': 'Hydrurga leptonyx',
    'krill': 'Euphausiacea',
    'snow petrel': 'Pagodroma nivea',
    'manta ray': 'Manta birostris',
    'clownfish': 'Amphiprioninae',
    'jellyfish': 'Scyphozoa',
    'seahorse': 'Hippocampus',
    'coral': 'Anthozoa',
    'sambar deer': 'Rusa unicolor',
    'orangutan': 'Pongo pygmaeus',
    'wolf': 'Canis lupus',
    'otter': 'Lutrinae',
    'crocodile': 'Crocodylidae',
    'squid': 'Teuthida',
    'arctic tern': 'Sterna paradisaea'
  };

  // Common animals by region (for filling nearby results)
  var _regionAnimals = {
    'Asia': ['Tiger', 'Elephant', 'Orangutan', 'Red Panda', 'Peacock', 'Komodo Dragon', 'Giant Panda', 'Snow Leopard', 'Asian Elephant', 'Sun Bear'],
    'Africa': ['Lion', 'Elephant', 'Giraffe', 'Cheetah', 'Zebra', 'Hippopotamus', 'Rhinoceros', 'Gorilla', 'Chimpanzee', 'Flamingo'],
    'Europe': ['Brown Bear', 'Wolf', 'Red Fox', 'Eagle', 'Wild Boar', 'European Bison', 'Lynx', 'Reindeer', 'Badger', 'Otter'],
    'North America': ['Bald Eagle', 'Grizzly Bear', 'Wolf', 'Moose', 'Coyote', 'Bison', 'Raccoon', 'Beaver', 'Mountain Lion', 'Elk'],
    'South America': ['Jaguar', 'Sloth', 'Toucan', 'Anaconda', 'Capybara', 'Llama', 'Macaw', 'Piranha', 'Vampire Bat', 'Howler Monkey'],
    'Australia': ['Kangaroo', 'Koala', 'Platypus', 'Wombat', 'Tasmanian Devil', 'Dingo', 'Emu', 'Crocodile', 'Kookaburra', 'Wallaby'],
    'Antarctica': ['Penguin', 'Seal', 'Blue Whale', 'Orca', 'Albatross', 'Leopard Seal', 'Krill', 'Snow Petrel', 'Squid', 'Arctic Tern'],
    'Ocean': ['Blue Whale', 'Dolphin', 'Shark', 'Octopus', 'Sea Turtle', 'Manta Ray', 'Clownfish', 'Jellyfish', 'Seahorse', 'Coral']
  };

  var _regionWikiCategory = {
    'Asia': 'Fauna_of_Asia',
    'Africa': 'Fauna_of_Africa',
    'Europe': 'Fauna_of_Europe',
    'North America': 'Fauna_of_North_America',
    'South America': 'Fauna_of_South_America',
    'Australia': 'Fauna_of_Australia',
    'Antarctica': 'Fauna_of_Antarctica',
    'Ocean': 'Marine_life'
  };

  /**
   * Fetch a list of animal names for a given region.
   * Returns hardcoded list + optionally enriches with Wikipedia results.
   */
  function fetchRegionAnimals(region) {
    var base = _regionAnimals[region] || _regionAnimals['Asia'];

    // Try Wikipedia API for more variety
    var wikiCat = _regionWikiCategory[region];
    if (!wikiCat) return Promise.resolve(base);

    var url = 'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:' + wikiCat + '&cmlimit=100&format=json&origin=*';

    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var wikiNames = [];
        if (data && data.query && data.query.categorymembers) {
          for (var i = 0; i < data.query.categorymembers.length; i++) {
            var title = data.query.categorymembers[i].title;
            // Skip subcategories and non-article pages
            if (title.indexOf('Category:') === 0) continue;
            if (title.indexOf('List of') === 0) continue;
            if (title.indexOf('Template:') === 0) continue;
            if (title.indexOf('Wikipedia:') === 0) continue;
            // Remove parenthetical disambiguation like "Lion (disambiguation)"
            var clean = title.replace(/\s*\(.*?\)\s*$/, '').trim();
            if (clean.length > 0) {
              wikiNames.push(clean);
            }
          }
        }
        // Merge hardcoded + Wikipedia, deduplicate, shuffle, return top 10
        var merged = base.concat(wikiNames);
        var unique = [];
        var seen = {};
        for (var j = 0; j < merged.length; j++) {
          var key = merged[j].toLowerCase().trim();
          if (!seen[key]) {
            seen[key] = true;
            unique.push(merged[j]);
          }
        }
        // Simple shuffle
        for (var k = unique.length - 1; k > 0; k--) {
          var r = Math.floor(Math.random() * (k + 1));
          var tmp = unique[k];
          unique[k] = unique[r];
          unique[r] = tmp;
        }
        return unique.slice(0, 30);
      })
      .catch(function() {
        // Fallback to hardcoded list on error
        return base;
      });
  }

  /**
   * Extract a common animal name from a video title
   */
  function _extractAnimalName(title) {
    if (!title) return null;
    var lower = title.toLowerCase();

    // Match longest key first to avoid "eagle" matching before "bald eagle"
    var keys = Object.keys(_speciesMap).sort(function(a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1) {
        return keys[i];
      }
    }
    return null;
  }

  /**
   * Fetch a species image from GBIF API
   * Returns a Promise with the image URL, or null if not found
   */
  function fetchGBIFThumbnail(commonName) {
    // Check cache first
    if (_gbifCache[commonName]) {
      return Promise.resolve(_gbifCache[commonName]);
    }

    var scientificName = _speciesMap[commonName];
    if (!scientificName) {
      return Promise.resolve(null);
    }

    var matchUrl = 'https://api.gbif.org/v1/species/match?name=' + encodeURIComponent(scientificName);

    return fetch(matchUrl)
      .then(function(r) { return r.json(); })
      .then(function(matchData) {
        var speciesKey = matchData.speciesKey;
        if (!speciesKey) return null;

        var searchUrl = 'https://api.gbif.org/v1/occurrence/search?speciesKey=' + speciesKey + '&mediaType=StillImage&limit=1';
        return fetch(searchUrl);
      })
      .then(function(r) { return r.json(); })
      .then(function(occData) {
        if (occData.results && occData.results.length > 0) {
          var media = occData.results[0].media;
          if (media && media.length > 0 && media[0].identifier) {
            var imgUrl = media[0].identifier;
            _gbifCache[commonName] = imgUrl;
            return imgUrl;
          }
        }
        return null;
      })
      .catch(function() {
        return null;
      });
  }

  /**
   * Fetch animal image: try GBIF first, fall back to Wikipedia.
   */
  function fetchAnimalImage(commonName) {
    var key = commonName ? commonName.toLowerCase().trim() : '';
    if (!key) return Promise.resolve(null);

    // Check cache
    if (_gbifCache[key]) {
      return Promise.resolve(_gbifCache[key]);
    }

    // Step 1: Try GBIF
    return fetchGBIFThumbnail(key).then(function(gbifUrl) {
      if (gbifUrl) {
        _gbifCache[key] = gbifUrl;
        return gbifUrl;
      }
      // Step 2: GBIF failed — try Wikipedia Page Images
      var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=' + encodeURIComponent(commonName) + '&format=json&pithumbsize=400&origin=*';
      return fetch(wikiUrl)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var pages = data && data.query && data.query.pages;
          if (!pages) return null;
          for (var id in pages) {
            if (pages[id].thumbnail && pages[id].thumbnail.source) {
              var img = pages[id].thumbnail.source;
              _gbifCache[key] = img;
              return img;
            }
          }
          return null;
        })
        .catch(function() { return null; });
    });
  }

  /**
   * Enrich videos with GBIF thumbnails as fallback.
   * Returns a Promise that resolves when all fetches complete.
   */
  function enrichThumbnails(videos) {
    var promises = [];
    if (!videos) return Promise.resolve();

    for (var i = 0; i < videos.length; i++) {
      (function(idx) {
        var name = _extractAnimalName(videos[idx].title);
        if (name) {
          var p = fetchGBIFThumbnail(name).then(function(imgUrl) {
            if (imgUrl && videos[idx]) {
              videos[idx].gbifThumbnail = imgUrl;
            }
          });
          promises.push(p);
        }
      })(i);
    }

    return Promise.all(promises);
  }

  /**
   * Fetch videos.json and cache it
   */
  function loadVideos() {
    if (cache) {
      return Promise.resolve(cache);
    }
    return fetch(App.config.videosDataUrl + '?t=' + new Date().getTime())
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load videos: ' + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        cache = data;
        return data;
      })
      .catch(function(error) {
        console.error('Failed to load videos:', error);
        return { videos: [], categories: [] };
      });
  }

  /**
   * Get a single video by ID
   */
  function getVideoById(id) {
    if (!cache) return null;
    return cache.videos.find(function(v) { return v.id === id; }) || null;
  }

  /**
   * Get a category by ID/slug
   */
  function getCategoryById(id) {
    if (!cache) return null;
    return cache.categories.find(function(c) { return c.id === id; }) || null;
  }

  /**
   * Get all categories
   */
  function getCategories() {
    return cache ? cache.categories : [];
  }

  /**
   * Filter videos by options
   */
  function filterVideos(options) {
    if (!cache) return [];
    options = options || {};
    var results = cache.videos.slice();

    // Filter by category
    if (options.category && options.category !== 'all') {
      results = results.filter(function(v) { return v.category === options.category; });
    }

    // Filter by tag
    if (options.tag) {
      results = results.filter(function(v) {
        return v.tags && v.tags.indexOf(options.tag) !== -1;
      });
    }

    // Filter by featured
    if (options.featured) {
      results = results.filter(function(v) { return v.featured; });
    }

    // Search query
    if (options.query) {
      var q = options.query.toLowerCase();
      results = results.filter(function(v) {
        return v.title.toLowerCase().indexOf(q) !== -1 ||
               v.description.toLowerCase().indexOf(q) !== -1 ||
               (v.location && v.location.name && v.location.name.toLowerCase().indexOf(q) !== -1);
      });
    }

    // Filter by region for nearby
    if (options.region) {
      var region = options.region.toLowerCase();
      results = results.filter(function(v) {
        return v.location && v.location.region &&
               v.location.region.toLowerCase() === region;
      });
    }

    // Sort
    if (options.sort === 'newest') {
      results.sort(function(a, b) { return new Date(b.dateAdded) - new Date(a.dateAdded); });
    } else if (options.sort === 'oldest') {
      results.sort(function(a, b) { return new Date(a.dateAdded) - new Date(b.dateAdded); });
    } else if (options.sort === 'az') {
      results.sort(function(a, b) { return a.title.localeCompare(b.title); });
    } else if (options.sort === 'popular') {
      results.sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
    }

    return results;
  }

  /**
   * Get nearby videos based on user location
   */
  function getNearbyVideos(userLat, userLng, maxKm) {
    if (!cache) return [];
    maxKm = maxKm || 5000;
    return cache.videos.filter(function(v) {
      return App.utils.isNearby(v, userLat, userLng, maxKm);
    });
  }

  return {
    loadVideos: loadVideos,
    getVideoById: getVideoById,
    getCategoryById: getCategoryById,
    getCategories: getCategories,
    filterVideos: filterVideos,
    getNearbyVideos: getNearbyVideos,
    fetchGBIFThumbnail: fetchGBIFThumbnail,
    fetchAnimalImage: fetchAnimalImage,
    fetchRegionAnimals: fetchRegionAnimals
  };
})();
