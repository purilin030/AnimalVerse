# AnimalVerse - Animal Video Streaming Platform

**FYP 1 | Wong Jiun Hong (2401292) | UTAR**

A static animal video streaming website built with HTML, CSS, and JavaScript. Hosted on AWS S3 and CloudFront for deployment.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `home.html` | Hero, categories, featured videos, nearby section |
| Gallery | `gallery.html` | Browse all videos with category, tag, and sort filters |
| Playback | `playback.html` | Video player, video info, location map, and related videos |
| Categories | `categories.html` | Biological class overview |
| Animal Map | `map.html` | World map with animal origin markers using Leaflet.js |
| Favorites | `favorites.html` | Favorites and Watch Later using localStorage |
| Search | `search.html` | Client-side search via URL parameter `?q=` |
| About | `about.html` | Project info, tech stack, and developer details |
| Contact | `contact.html` | Static contact form |

## Features

- Safari exploration-style color palette with dark/light theme switching
- World map integration using Leaflet.js and OpenStreetMap
- Location-based "Animals Near You" recommendations
- Favorites, likes, and Watch Later using localStorage
- Client-side full-text search
- Responsive layout for mobile, tablet, and desktop
- AI Chatbot placeholder for FYP2
- BEM CSS and CSS Variables theme system
- IIFE JavaScript modules under the `App` namespace

## Tech Stack

- **HTML5** semantic markup
- **CSS3** with BEM, Grid, Flexbox, and Custom Properties
- **JavaScript** with Vanilla JS, IIFE modules, and Fetch API
- **Leaflet.js** with OpenStreetMap
- **YouTube Iframe API** for video embeds
- **localStorage** for favorites, likes, theme, and sidebar state

## Getting Started

Run a local static server, then open `home.html` from localhost. This avoids browser `file://` restrictions when loading `data/videos.json`.

From the parent folder of `animal-verse`:

```bash
python -m http.server 80
```

Then open:

```text
http://localhost/animal-verse/home.html
```

If port `80` is already in use or requires administrator permission, use another port:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/animal-verse/home.html
```

## Project Structure

```text
animal-verse/
|-- home.html / gallery.html / playback.html / ...
|-- data/videos.json        # Video metadata with GPS coordinates
|-- css/
|   |-- base/               # Variables, reset, typography
|   |-- components/         # Header, sidebar, cards, player...
|   |-- layouts/            # Grid, app-layout, sections
|   |-- pages/              # Per-page styles
|   `-- utilities/          # Spacing, display, animations
|-- js/
|   |-- app.js              # Entry point
|   |-- config.js / theme.js / navigation.js
|   |-- data.js / ui.js / router.js
|   |-- home.js / gallery.js / player.js
|   |-- map.js / search.js / categories.js
|   |-- favorites.js / favorites-page.js
|   |-- contact.js / chatbot.js
|   `-- utils.js
`-- assets/                 # Images and videos
```

## FYP2 Roadmap

- Login/Auth module
- AWS Lambda and DynamoDB backend
- Amazon Lex chatbot
- Amazon Bedrock Gen AI
- User video uploads
