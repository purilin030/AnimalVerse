/* ============================================================
   Player Related — Related videos grid
   Fetches videos in the same category and renders them as cards.
   ============================================================ */
App.playerRelated = (function() {
  'use strict';

  /**
   * Fetch and render related videos for the given video.
   * @param {object} video — The currently playing video
   */
  function render(video) {
    var container = document.getElementById('related-videos');
    if (!container) return;

    function renderRelated(related) {
      related = related
        .filter(function(v) { return v.id !== video.id; })
        .slice(0, 5);

      if (related.length === 0) {
        var noRel = document.createElement('p');
        noRel.className = 'text-muted';
        noRel.textContent = 'No related videos found.';
        container.appendChild(noRel);
        return;
      }

      container.innerHTML = '';
      for (var i = 0; i < related.length; i++) {
        var card = App.ui.createVideoCard(related[i]);
        if (card) {
          container.appendChild(card);
        }
      }

      App.ui.attachFavoriteListeners(container);
    }

    // YouTube video: use static youtube data
    if (App.data.isYoutubeVideo(video.id)) {
      var related = App.data.filterYoutubeVideos({ category: video.category });
      renderRelated(related);
      return;
    }

    // Local video: load from videos.json
    App.data.loadVideos().then(function() {
      var related = App.data.filterVideos({ category: video.category });
      renderRelated(related);
    });
  }

  return { render: render };
})();
