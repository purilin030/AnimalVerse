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

    container.textContent = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];

      // Count videos in this category
      var count = App.data.filterVideos({ category: cat.id }).length;

      var card = document.createElement('a');
      card.href = 'gallery.html?category=' + encodeURIComponent(cat.id);
      card.className = 'category-card category-card--' + cat.id + ' category-card--large';

      // Icon
      var icon = document.createElement('span');
      icon.className = 'category-card__icon';
      icon.textContent = cat.icon || '🐾';
      card.appendChild(icon);

      // Name
      var name = document.createElement('h2');
      name.className = 'category-card__name';
      name.textContent = cat.name || '';
      card.appendChild(name);

      // Description
      var desc = document.createElement('p');
      desc.className = 'category-card__desc';
      desc.textContent = cat.description || '';
      card.appendChild(desc);

      // Count
      var countEl = document.createElement('span');
      countEl.className = 'category-card__count';
      countEl.textContent = App.utils.pluralize(count, 'video');
      card.appendChild(countEl);

      container.appendChild(card);
    }
  }

  return {
    init: init
  };
})();
