/* ============================================================
   Player Facade — Coordinates playback page sub-modules
   Delegates to:
     App.playerVideo   — video embed (YouTube iframe / HTML5)
     App.playerInfo    — metadata & action buttons
     App.playerMap     — Leaflet location map
     App.playerRelated — related videos grid
     App.playerAnimal  — animal info panel (tabs, breadcrumbs, typewriter)
   ============================================================ */
App.player = (function() {
  'use strict';

  function init() {
    var params = App.router.getQueryParams();
    var videoId = params.id;
    var animalName = params.animal;

    if (!videoId && !animalName) {
      var container = document.getElementById('player-container');
      App.ui.renderEmptyState(container, {
        text: 'No video selected.',
        actionLabel: 'Browse videos',
        actionHref: 'gallery.html'
      });
      return;
    }

    App.data.loadVideos().then(function() {
      var video = null;
      if (videoId) {
        video = App.data.getVideoById(videoId);
      } else if (animalName) {
        var nameLower = animalName.toLowerCase();
        var allVids = App.data.filterVideos();
        video = allVids.find(function(v) {
          var match = (v.title && v.title.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.description && v.description.toLowerCase().indexOf(nameLower) !== -1) ||
                      (v.id && v.id.toLowerCase().indexOf(nameLower) !== -1);
          return match;
        });
      }

      if (!video) {
        var playerContainer = document.getElementById('player-container');
        App.ui.renderEmptyState(playerContainer, { text: 'Video not found.' });
        return;
      }

      // Sync YouTube Mode theme based on video source
      App.dataSource.setMode(video.source === 'youtube' ? 'youtube' : 'library');

      // Delegate to sub-modules
      App.playerVideo.render(video);
      App.playerInfo.render(video);
      App.playerMap.render(video);
      App.playerRelated.render(video);
      App.playerAnimal.render(video);
    });
  }

  return {
    init: function() {
      App.playerAnimal.initTabEvents();  // Bind tab clicks early
      init();
    }
  };
})();
