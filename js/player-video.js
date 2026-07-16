/* ============================================================
   Player Video — YouTube iframe & HTML5 video embed
   ============================================================ */
App.playerVideo = (function() {
  'use strict';

  /**
   * Render the video player (YouTube iframe or HTML5 <video>)
   * into the element with id 'player-container'.
   * @param {object} video — Video object with .source, .videoId, .videoUrl, etc.
   */
  function render(video) {
    var container = document.getElementById('player-container');
    if (!container) return;

    // Clear any placeholder content
    container.textContent = '';

    if (video.source === 'youtube') {
      var iframe = document.createElement('iframe');
      iframe.className = 'player-iframe';
      iframe.src = App.config.youtube.embedBase + (video.videoId || '') + App.config.youtube.params;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      container.appendChild(iframe);
    } else {
      var videoEl = document.createElement('video');
      videoEl.className = 'player-video';
      videoEl.controls = true;
      videoEl.poster = video.posterUrl || video.thumbnail || '';
      videoEl.textContent = 'Your browser does not support the video tag.';

      var source = document.createElement('source');
      source.src = video.videoUrl || '';
      source.type = 'video/mp4';
      videoEl.appendChild(source);

      container.appendChild(videoEl);

      videoEl.play().catch(function() { /* autoplay prevented */ });
    }
  }

  return { render: render };
})();
