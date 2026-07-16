/* ============================================================
   Player Info — Video metadata & action buttons
   Renders title, category, duration, views, location, description,
   and Like / Favorite / Watch Later buttons with click handling.
   ============================================================ */
App.playerInfo = (function() {
  'use strict';

  /**
   * Render video metadata and action buttons into #video-info.
   * @param {object} video — Video object
   */
  function render(video) {
    var container = document.getElementById('video-info');
    if (!container) return;

    var cat = App.data.getCategoryById(video.category);
    var catName = cat ? cat.name : video.category;
    var catColor = cat ? cat.color : '';

    var isFav = App.favorites.isFavorite(video.id);
    var isWL = App.favorites.isWatchLater(video.id);
    var isLiked = App.favorites.isLiked(video.id);

    // Clear container
    container.textContent = '';

    // Title
    var title = document.createElement('h1');
    title.className = 'video-info__title';
    title.textContent = video.title || '';
    container.appendChild(title);

    // Meta row
    var meta = document.createElement('div');
    meta.className = 'video-info__meta';
    container.appendChild(meta);

    var catSpan = document.createElement('span');
    catSpan.className = 'video-info__category';
    catSpan.style.color = catColor;
    catSpan.textContent = catName || '';
    meta.appendChild(catSpan);

    var durationSpan = document.createElement('span');
    durationSpan.textContent = video.duration || '';
    meta.appendChild(durationSpan);

    var viewsSpan = document.createElement('span');
    viewsSpan.textContent = (video.views || 0).toLocaleString() + ' views';
    meta.appendChild(viewsSpan);

    if (video.location) {
      var locSpan = document.createElement('span');
      locSpan.textContent = video.location.name || '';
      meta.appendChild(locSpan);
    }

    // Description
    var desc = document.createElement('p');
    desc.className = 'video-info__description';
    desc.textContent = video.description || '';
    container.appendChild(desc);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'video-info__actions';
    container.appendChild(actions);

    var likeBtn = document.createElement('button');
    likeBtn.className = 'btn btn--like' + (isLiked ? ' is-active' : '');
    likeBtn.id = 'like-btn';
    likeBtn.setAttribute('data-id', video.id);
    likeBtn.textContent = (isLiked ? '👍 Liked' : '👍 Like');
    actions.appendChild(likeBtn);

    var favBtn = document.createElement('button');
    favBtn.className = 'btn btn--favorite' + (isFav ? ' is-active' : '');
    favBtn.id = 'fav-btn';
    favBtn.setAttribute('data-id', video.id);
    favBtn.textContent = (isFav ? '❤️' : '🤍') + ' Favorite';
    actions.appendChild(favBtn);

    var wlBtn = document.createElement('button');
    wlBtn.className = 'btn btn--watchlater' + (isWL ? ' is-active' : '');
    wlBtn.id = 'wl-btn';
    wlBtn.setAttribute('data-id', video.id);
    wlBtn.textContent = (isWL ? '⏰' : '⏱') + ' Watch Later';
    actions.appendChild(wlBtn);

    // Bind buttons
    if (likeBtn) {
      likeBtn.addEventListener('click', function() {
        var added = App.favorites.toggleLike(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '👍 Liked' : '👍 Like');
        App.ui.showToast(added ? 'Added to liked videos!' : 'Removed from liked videos', added ? 'success' : 'info');
      });
    }

    if (favBtn) {
      favBtn.addEventListener('click', function() {
        var added = App.favorites.toggleFavorite(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '❤️' : '🤍') + ' Favorite';
        App.ui.showToast(added ? 'Added to favorites!' : 'Removed from favorites', added ? 'success' : 'info');
      });
    }

    if (wlBtn) {
      wlBtn.addEventListener('click', function() {
        var added = App.favorites.toggleWatchLater(video.id);
        this.classList.toggle('is-active', added);
        this.textContent = (added ? '⏰' : '⏱') + ' Watch Later';
        App.ui.showToast(added ? 'Added to Watch Later!' : 'Removed from Watch Later', added ? 'success' : 'info');
      });
    }
  }

  return { render: render };
})();
