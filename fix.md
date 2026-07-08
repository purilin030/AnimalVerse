# AnimalVerse Code Review Fix Notes

This document summarizes the main issues found during the code review and the recommended fixes.

## 1. Local `fetch()` May Fail When Opening HTML Directly

### Problem

The README says the project can be opened directly by launching `home.html` in a browser.

However, `js/data.js` loads video data using:

```js
fetch(App.config.videosDataUrl + '?t=' + new Date().getTime())
```

When the website is opened through `file://`, many browsers block `fetch()` requests to local JSON files. If this happens, `loadVideos()` catches the error and returns an empty dataset:

```js
return { videos: [], categories: [] };
```

This can make pages such as Home, Gallery, Playback, Favorites, Search, and Map show empty or broken content.

### Impact

- Gallery may show `0 videos`.
- Home category cards may not render.
- Playback pages may show `Video not found`.
- Search and category filters may not work.
- The behavior may differ between local testing and hosted deployment.

### Recommended Fix

Use a local development server instead of opening the HTML file directly.

Example:

```bash
cd ..
python -m http.server 80
```

Then open:

```text
http://localhost/animal-verse/home.html
```

Also update the README from:

```text
Open `home.html` in any modern browser. No build tools or server required.
```

to:

```text
Run a local static server, then open `home.html` from localhost.
Example: `python -m http.server 80` from the parent folder, then visit `http://localhost/animal-verse/home.html`.
```

An alternative fix is to embed a fallback dataset in JavaScript, but using a local server is cleaner and closer to the final AWS S3 or CloudFront deployment.

## 2. Incorrect Video Categories in `videos.json`

### Problem

Some records in `data/videos.json` have categories that do not match the actual animal type.

Examples found:

```json
{
  "id": "video-axolotl-001",
  "title": "Axolotl in its Natural Habitat",
  "category": "mammals"
}
```

Axolotl should be categorized as `amphibians`, not `mammals`.

Other examples:

- `video-caecilian-001` is marked as `mammals`, but should be `amphibians`.
- `video-owl-001` is marked as `mammals`, but should be `birds`.

### Impact

The Gallery page filters videos based on `video.category`:

```js
results = results.filter(function(v) {
  return v.category === options.category;
});
```

If the data is wrong, users will see animals in the wrong category.

### Recommended Fix

Review `data/videos.json` and correct the category values.

Example:

```json
{
  "id": "video-axolotl-001",
  "category": "amphibians"
}
```

```json
{
  "id": "video-owl-001",
  "category": "birds"
}
```

Suggested valid categories:

```text
mammals
birds
reptiles
amphibians
aquatic
```

After fixing the data, retest:

- Gallery category filter
- Category page links
- Search results
- Related videos on playback page

## 3. Query Parameter Parser Is Too Fragile

### Problem

`js/router.js` manually parses URL query parameters:

```js
var pairs = query.split('&');
for (var i = 0; i < pairs.length; i++) {
  var parts = pairs[i].split('=');
  var key = decodeURIComponent(parts[0]);
  var value = parts.length > 1 ? decodeURIComponent(parts[1] || '') : '';
  params[key] = value;
}
```

This implementation has edge cases:

- `+` is not converted into a space.
- Values containing `=` may be parsed incorrectly.
- Empty or malformed query strings are harder to handle safely.

### Impact

Search and filter URLs may behave incorrectly.

Example:

```text
search.html?q=sea+turtle
```

May be interpreted as:

```text
sea+turtle
```

instead of:

```text
sea turtle
```

### Recommended Fix

Replace the manual parser with `URLSearchParams`.

Recommended implementation:

```js
function getQueryParams() {
  var params = {};
  var searchParams = new URLSearchParams(window.location.search);

  searchParams.forEach(function(value, key) {
    params[key] = value;
  });

  return params;
}
```

This is simpler, safer, and supported by modern browsers.

## 4. Documentation Encoding Looks Broken in Some Terminals

### Problem

Some README content contains emoji and Chinese text. In terminals or editors using the wrong encoding, the text may appear as corrupted characters.

### Impact

- The README may look broken during review.
- Project documentation may appear unprofessional if opened with the wrong encoding.
- It may confuse future maintainers.

### Recommended Fix

Keep all project text files saved as UTF-8.

Recommended actions:

- Ensure VS Code or the chosen editor uses UTF-8.
- Re-save `README.md` as UTF-8.
- Avoid mixing encodings between Windows tools and editors.

In VS Code:

```text
File > Save with Encoding > UTF-8
```

## Suggested Fix Priority

1. Fix the local server / `fetch()` issue first, because it affects core page loading.
2. Correct the wrong video categories in `data/videos.json`.
3. Replace the query parser with `URLSearchParams`.
4. Re-save documentation files as UTF-8.

## Final Testing Checklist

After applying fixes, test these pages through `localhost`:

```text
home.html
gallery.html
gallery.html?category=amphibians
gallery.html?category=birds
search.html?q=sea+turtle
playback.html?id=video-axolotl-001
favorites.html
liked_vid.html
map.html
```

Expected result:

- Videos load correctly.
- Category filters show correct animals.
- Search handles spaces correctly.
- Playback pages can find selected videos.
- No major console errors appear in DevTools.
