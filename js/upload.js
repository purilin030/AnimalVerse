/* ============================================================
   Upload Module
   Handles the simulated video upload process, map pinning,
   and saving the sighting to localStorage.
   ============================================================ */
App.upload = (function() {
  'use strict';

  var map;
  var marker;
  var videoFile = null;

  function init() {
    initDragAndDrop();
    initMap();
    initAutocomplete();
    initForm();
    
    var anotherBtn = document.getElementById('upload-another-btn');
    if (anotherBtn) {
      anotherBtn.addEventListener('click', resetForm);
    }
  }

  function initDragAndDrop() {
    var dropzone = document.getElementById('upload-dropzone');
    var fileInput = document.getElementById('video-file');
    var preview = document.getElementById('upload-preview');
    var previewPlayer = document.getElementById('video-preview-player');
    var removeBtn = document.getElementById('remove-video-btn');

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, function() {
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, function() {
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', function(e) {
      var dt = e.dataTransfer;
      var files = dt.files;
      handleFiles(files);
    }, false);

    fileInput.addEventListener('change', function() {
      handleFiles(this.files);
    });

    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      videoFile = null;
      fileInput.value = '';
      previewPlayer.src = '';
      preview.style.display = 'none';
    });

    function handleFiles(files) {
      if (files.length === 0) return;
      var file = files[0];
      if (file.type === 'video/mp4' || file.type === 'video/webm') {
        videoFile = file;
        var url = URL.createObjectURL(file);
        previewPlayer.src = url;
        preview.style.display = 'block';
      } else {
        App.ui.showToast('Please upload an MP4 or WebM video.', 'error');
      }
    }
  }

  function initMap() {
    var mapContainer = document.getElementById('upload-map');
    if (!mapContainer || typeof L === 'undefined') return;

    var latInput = document.getElementById('video-lat');
    var lngInput = document.getElementById('video-lng');
    var locNameInput = document.getElementById('video-location-name');

    // Default to a central location (e.g., Africa)
    var defaultLat = 0.0;
    var defaultLng = 20.0;

    map = L.map('upload-map').setView([defaultLat, defaultLng], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;

      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }

      latInput.value = lat;
      lngInput.value = lng;
      
      // Reverse geocode to get a generic name
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var name = 'Unknown Location';
          if (data && data.address) {
            name = data.address.country || data.address.state || data.address.city || name;
          }
          locNameInput.value = name;
        })
        .catch(function() {
          locNameInput.value = 'Pinned Location';
        });
    });
  }

  function initAutocomplete() {
    var input = document.getElementById('video-species');
    var dropdown = document.getElementById('species-autocomplete');
    if (!input || !dropdown) return;

    var speciesList = [];
    
    // Load species from animal-facts.json
    fetch('data/animal-facts.json')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.species) {
          for (var key in data.species) {
            speciesList.push(data.species[key].name || key);
          }
        }
      })
      .catch(function() {
        // Fallback mock list
        speciesList = ['Lion', 'Tiger', 'Elephant', 'Giraffe', 'Penguin', 'Dolphin'];
      });

    input.addEventListener('input', function() {
      var val = this.value.toLowerCase();
      dropdown.innerHTML = '';
      if (!val) {
        dropdown.style.display = 'none';
        return;
      }

      var matches = speciesList.filter(function(s) {
        return s.toLowerCase().indexOf(val) !== -1;
      });

      if (matches.length > 0) {
        matches.slice(0, 5).forEach(function(match) {
          var item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.textContent = match;
          item.addEventListener('click', function() {
            input.value = match;
            dropdown.style.display = 'none';
          });
          dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function initForm() {
    var form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      if (!videoFile) {
        App.ui.showToast('Please select a video file.', 'error');
        return;
      }
      
      var lat = document.getElementById('video-lat').value;
      if (!lat) {
        App.ui.showToast('Please pin a location on the map.', 'error');
        return;
      }

      // Simulate upload process
      var btn = document.getElementById('upload-submit-btn');
      var originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span>Uploading...</span>';

      setTimeout(function() {
        saveSimulatedVideo();
        form.style.display = 'none';
        document.getElementById('upload-success-state').style.display = 'block';
        App.ui.showToast('Sighting published successfully!', 'success');
      }, 2000);
    });
  }

  function saveSimulatedVideo() {
    var title = document.getElementById('video-title').value;
    var species = document.getElementById('video-species').value;
    var category = document.getElementById('video-category').value;
    var desc = document.getElementById('video-desc').value;
    var lat = parseFloat(document.getElementById('video-lat').value);
    var lng = parseFloat(document.getElementById('video-lng').value);
    var locName = document.getElementById('video-location-name').value;

    var newVideo = {
      id: 'v_' + Date.now(),
      title: title,
      category: category,
      animalName: species, // simulated mapping
      description: desc,
      duration: '0:15', // mock duration
      views: 0,
      featured: false,
      source: 'local',
      videoUrl: URL.createObjectURL(videoFile),
      posterUrl: '', // Could generate a thumbnail in a real app
      thumbnail: '',
      location: {
        lat: lat,
        lng: lng,
        name: locName
      },
      timestamp: Date.now()
    };

    var uploadedStr = localStorage.getItem('animalverse_uploaded');
    var uploaded = uploadedStr ? JSON.parse(uploadedStr) : [];
    uploaded.push(newVideo);
    localStorage.setItem('animalverse_uploaded', JSON.stringify(uploaded));
  }

  function resetForm() {
    var form = document.getElementById('upload-form');
    form.reset();
    
    videoFile = null;
    var fileInput = document.getElementById('video-file');
    var preview = document.getElementById('upload-preview');
    var previewPlayer = document.getElementById('video-preview-player');
    
    if (fileInput) fileInput.value = '';
    if (previewPlayer) previewPlayer.src = '';
    if (preview) preview.style.display = 'none';
    
    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
    }
    
    document.getElementById('video-lat').value = '';
    document.getElementById('video-lng').value = '';
    document.getElementById('video-location-name').value = '';
    
    var btn = document.getElementById('upload-submit-btn');
    btn.disabled = false;
    btn.innerHTML = '<span>Publish Sighting</span>';
    
    form.style.display = 'grid';
    document.getElementById('upload-success-state').style.display = 'none';
    
    setTimeout(function() {
      if (map) map.invalidateSize();
    }, 100);
  }

  return {
    init: init
  };
})();
