# AnimalVerse — AI Coding Guidelines

> This file is written for AI coding assistants (e.g. Gemini, Copilot, Cursor).
> Read this before editing **any** file in this project to avoid introducing
> duplicate code, breaking conventions, or creating regressions.

---

## Architecture: IIFE Module Namespace

All JavaScript modules follow the **IIFE + `App.*` namespace** pattern.
Every module is an immediately-invoked function expression assigned to a property
of the global `App` object.

```javascript
// ✅ Correct pattern
App.myModule = (function() {
  'use strict';
  function init() { /* ... */ }
  return { init: init };
})();

// ❌ Never use bare globals or class-based patterns
class MyModule { }   // wrong
window.myThing = {}; // wrong
```

All modules must expose an `init()` function and be registered in `js/app.js`
under the appropriate `case` in the page switch.

---

## Single Source of Truth Files (Do Not Duplicate)

These files are the **canonical, authoritative** source for their data.
**Never copy their content into another file.**

| File | What it owns | Who uses it |
|------|-------------|-------------|
| `js/species-map.js` | `App.speciesMap` — common name → scientific name mapping | `js/data.js`, `js/animal-info.js` |
| `js/config.js` | `App.config` — API URLs, localStorage keys, region strings | Every module |
| `js/utils.js` | `App.utils` — `getDistance()`, `extractAnimalName()`, `shuffleArray()`, `guessRegion()`, `getVideoAspect()` | Any module needing these utilities |
| `data/videos.json` | All video metadata with GPS coordinates | `js/data.js` via `App.data.loadVideos()` |
| `data/animal-facts.json` | Curated local animal facts per species | `js/animal-info.js` via `_loadLocalFacts()` |
| `includes/header.html` | Shared header HTML | Loaded by `js/include.js` via `fetch()` |
| `includes/sidebar.html` | Shared sidebar HTML | Loaded by `js/include.js` via `fetch()` |
| `includes/footer.html` | Shared footer HTML | Loaded by `js/include.js` via `fetch()` |

> ⚠️ **`js/species-map.js`** was extracted from duplicate definitions in `data.js`
> and `animal-info.js`. If you ever need to add a new species mapping, add it
> **only** to `species-map.js`. Never define `_speciesMap` locally anywhere else.

---

## Script Loading Order (Per HTML Page)

Every HTML page must load scripts in this exact order.
`species-map.js` must come **after** `config.js` and **before** `data.js` / `animal-info.js`.

```html
<script defer src="js/include.js"></script>
<script defer src="js/config.js"></script>
<script defer src="js/species-map.js"></script>    <!-- must be before data.js and animal-info.js -->
<script defer src="js/utils.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/router.js"></script>
<script defer src="js/theme.js"></script>
<script defer src="js/favorites.js"></script>
<script defer src="js/animal-info.js"></script>    <!-- only on pages that need it -->
<script defer src="js/ui.js"></script>
<script defer src="js/navigation.js"></script>
<script defer src="js/[page-module].js"></script>  <!-- e.g. player.js, gallery.js -->
<script defer src="js/chatbot.js"></script>
<script defer src="js/app.js"></script>             <!-- always last -->
```

---

## Key Module Responsibilities

| Module | Responsibility | Do NOT put here |
|--------|---------------|-----------------|
| `config.js` | Site-wide constants only | Business logic |
| `species-map.js` | Animal name → scientific name map | Any functions |
| `utils.js` | Pure utility functions (no DOM, no API calls) | UI rendering |
| `data.js` | Load/cache `videos.json`, filter videos, GBIF API | DOM manipulation |
| `ui.js` | Reusable DOM creation helpers (`createVideoCard`, `showToast`, `renderVideoGrid`) | Page-specific logic |
| `animal-info.js` | Fetch Wikipedia / Wikidata / iNaturalist by animal name | Rendering (happens in `player.js`) |
| `favorites.js` | Read/write localStorage for favorites, watch later, likes | Any UI updates |
| `navigation.js` | Sidebar hover, hamburger, active highlight, header scroll | Page-specific JS |
| `player.js` | Playback page only — orchestrates all panels | Reusable components |
| `app.js` | Init entry point — calls `module.init()` per page | Any business logic |

---

## Reusable Utility Functions (Use These, Don't Reimplement)

```javascript
// Distance between two lat/lng points (km) — Haversine formula
App.utils.getDistance(lat1, lng1, lat2, lng2)

// Shuffle an array (Fisher-Yates, returns new copy)
App.utils.shuffleArray(arr)

// Guess world region from coordinates
App.utils.guessRegion(lat, lng)  // → 'Asia' | 'Africa' | 'Europe' | ...

// Deterministic aspect ratio class from video ID (for masonry layout)
App.utils.getVideoAspect(videoId)  // → { className, heightWeight }

// Pluralize a count label
App.utils.pluralize(count, 'video')  // → '3 videos'

// Extract a common animal name from a video title (strips boilerplate, matches species map)
App.utils.extractAnimalName(title)  // → 'lion' | 'bald eagle' | cleaned title | null

// Escape HTML to prevent XSS
App.ui.escapeHtml(str)

// Show a toast notification
App.ui.showToast(message, 'success' | 'info' | 'error')

// Create a standard video card DOM element
App.ui.createVideoCard(video)

// Render a masonry video grid (handles column distribution)
App.ui.renderVideoGrid(containerId, videosArray)

// Render an empty state placeholder
App.ui.renderEmptyState(container, { title, text, icon, actionLabel, actionHref })

// Image error fallback chain: GBIF → local → placeholder
App.ui.fallbackImg(imgElement)
```

---

## Data Loading Pattern

All data access goes through `App.data`. Never fetch `videos.json` directly from page scripts.

```javascript
// Load all videos (cached after first call)
App.data.loadVideos().then(function(data) {
  var videos = data.videos;
  var categories = data.categories;
});

// Filter with options
var results = App.data.filterVideos({
  category: 'mammals',  // or 'all'
  tag: 'wild',
  sort: 'newest',       // newest | oldest | az | popular
  query: 'lion',
  region: 'asia'
});

// Lookups
App.data.getVideoById(id);
App.data.getCategoryById(id);
App.data.getCategories();
```

---

## DOM Safety Rules

- **Always use `document.createElement`** for dynamic HTML construction. Do not use `innerHTML` for user-derived or API-derived data.
- **Always use `App.ui.escapeHtml()`** when inserting any string from external APIs (Wikipedia, iNaturalist, video titles, etc.) into the DOM via `innerHTML`.
- Exception: `switchTab()` in `player.js` currently uses `innerHTML` with `escapeHtml` — this is a known technical debt item, not a pattern to copy.

---

## localStorage Keys (Do Not Hardcode Strings)

Always use the constants from `App.config.localStorageKeys`:

```javascript
App.config.localStorageKeys.favorites   // 'animalverse_favorites'
App.config.localStorageKeys.watchLater  // 'animalverse_watchLater'
App.config.localStorageKeys.likes       // 'animalverse_likes'
App.config.localStorageKeys.theme       // 'animalverse_theme'
```

---

## Initialization Lifecycle

Pages with shared includes (header/sidebar) wait for the `includes-loaded` event
before calling `init()`. This is handled automatically by `app.js` — do not
duplicate this logic in page modules.

```javascript
// app.js handles this — don't copy into page modules
document.addEventListener('includes-loaded', initApp);
```

---

## Known Technical Debt (Do Not Work Around With More Hacks)

These are known issues. If assigned to fix them, fix them properly:

| Issue | Location | Notes |
|-------|----------|-------|
| `player.js` is 750+ lines with too many responsibilities | `js/player.js` | Should be split into sub-modules |
| `switchTab()` uses `innerHTML` instead of DOM API | `js/player.js` ~L408 | Should use `createElement` |
| Infinite scroll re-renders entire grid instead of appending | `js/gallery.js`, `js/ui.js` | Should use append mode |
| `random-vid.js` not registered under `App.*` namespace | `js/random-vid.js` | Should follow `App.randomVid = ...` pattern |
| `dashboard.js` duplicates user-dropdown logic from `navigation.js` | `js/dashboard.js` ~L201 | Should be consolidated |
| `loadVideos()` adds timestamp cache-buster on every cold load | `js/data.js` ~L309 | Fine for dev; remove for production |
