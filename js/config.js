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
    likes: 'animalverse_likes',
    sidebarCollapsed: 'animalverse_sidebarCollapsed',
    theme: 'animalverse_theme',
    youtubeMode: 'animalverse_youtube_mode'
  },
  youtube: {
    embedBase: 'https://www.youtube.com/embed/',
    params: '?autoplay=1&rel=0&modestbranding=1',
    // YouTube Data API v3 key — 留空则使用静态备用视频列表
    // 申请地址: https://console.cloud.google.com/apis/library/youtube.googleapis.com
    // 免费额度: 每天 10,000 配额 (每次搜索消耗 100)
    apiKey: 'AIzaSyCEY2BAF85-K4j1g9P080N-um1vQYZKTuc'
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
