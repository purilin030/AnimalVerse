/* ============================================================
   App Configuration
   ============================================================ */
var App = window.App || {};

App.config = {
  siteName: 'AnimalVerse',
  videosDataUrl: 'data/videos.json',
  defaultCategory: 'all',
  localStorageKeys: {
    favorites: 'animalverse_favorites',
    watchLater: 'animalverse_watchLater',
    sidebarCollapsed: 'animalverse_sidebarCollapsed',
    theme: 'animalverse_theme'
  },
  youtube: {
    embedBase: 'https://www.youtube.com/embed/',
    params: '?autoplay=1&rel=0&modestbranding=1'
  },
  regions: {
    'Africa': ['africa', 'savannah', 'serengeti', 'kenya', 'tanzania', 'south africa', 'madagascar'],
    'Asia': ['asia', 'india', 'china', 'malaysia', 'borneo', 'indonesia', 'japan', 'thailand'],
    'North America': ['north america', 'usa', 'canada', 'america', 'alaska', 'yellowstone'],
    'South America': ['south america', 'amazon', 'brazil', 'peru', 'costa rica', 'andes'],
    'Europe': ['europe', 'alps', 'scandinavia', 'uk', 'germany', 'france'],
    'Australia': ['australia', 'oceania', 'new zealand', 'tasmania', 'outback'],
    'Antarctica': ['antarctica', 'south pole', 'arctic', 'polar'],
    'Ocean': ['ocean', 'sea', 'marine', 'pacific', 'atlantic', 'indian ocean', 'coral reef']
  }
};
