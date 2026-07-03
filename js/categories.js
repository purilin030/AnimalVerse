/* ============================================================
   Categories Page
   ============================================================ */
App.categories = (function() {
  'use strict';

  function init() {
    App.data.loadVideos().then(function(data) {
      renderCategories(data.categories);
    });
  }

  function renderCategories(categories) {
    var container = document.getElementById('categories-grid');
    if (!container || !categories) return;

    container.innerHTML = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];

      // Count videos in this category
      var count = App.data.filterVideos({ category: cat.id }).length;

      var card = document.createElement('a');
      card.href = 'gallery.html?category=' + encodeURIComponent(cat.id);
      card.className = 'category-card category-card--' + cat.id + ' category-card--large';
      card.innerHTML =
        '<span class="category-card__icon">' + (cat.icon || '🐾') + '</span>' +
        '<h2 class="category-card__name">' + cat.name + '</h2>' +
        '<p class="category-card__desc">' + (cat.description || '') + '</p>' +
        '<span class="category-card__count">' + count + ' video' + (count !== 1 ? 's' : '') + '</span>';
      container.appendChild(card);
    }
  }

  return {
    init: init
  };
})();
