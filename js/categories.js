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
      card.className = 'category-card category-card--' + cat.id;

      // Inner container
      var inner = document.createElement('div');
      inner.className = 'category-card__inner';
      card.appendChild(inner);

      // Media / Viewport container
      var media = document.createElement('div');
      media.className = 'category-card__media';
      inner.appendChild(media);

      // Info row
      var info = document.createElement('div');
      info.className = 'category-card__info';
      inner.appendChild(info);

      // Text column
      var textCol = document.createElement('div');
      textCol.className = 'category-card__text';
      info.appendChild(textCol);

      var name = document.createElement('h2');
      name.className = 'category-card__name';
      name.textContent = cat.name || '';
      textCol.appendChild(name);

      var countEl = document.createElement('span');
      countEl.className = 'category-card__count';
      countEl.textContent = App.utils.pluralize(count, 'video');
      textCol.appendChild(countEl);

      // SVG Arrow icon
      var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('class', 'category-card__arrow');
      arrowSvg.setAttribute('viewBox', '0 0 24 24');
      arrowSvg.setAttribute('fill', 'none');
      arrowSvg.setAttribute('stroke', 'currentColor');
      arrowSvg.setAttribute('stroke-width', '2');
      arrowSvg.setAttribute('stroke-linecap', 'round');
      arrowSvg.setAttribute('stroke-linejoin', 'round');

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '5');
      line.setAttribute('y1', '12');
      line.setAttribute('x2', '19');
      line.setAttribute('y2', '12');
      arrowSvg.appendChild(line);

      var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '12 5 19 12 12 19');
      arrowSvg.appendChild(polyline);

      info.appendChild(arrowSvg);

      // Glowing spot div
      var glow = document.createElement('div');
      glow.className = 'category-card__glow';
      card.appendChild(glow);

      container.appendChild(card);
    }
  }

  return {
    init: init
  };
})();
