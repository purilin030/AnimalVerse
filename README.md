# AnimalVerse - Animal Video Streaming Platform

**FYP 1 | Wong Jiun Hong (2401292) | UTAR**

A static animal video streaming website built with HTML, CSS, and JavaScript. Hosted on AWS S3 & CloudFront (planned for FYP1).

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `home.html` | Hero, categories, featured vids, nearby section |
| Gallery | `gallery.html` | Browse all videos with category/tag/sort filters |
| Playback | `playback.html` | Video player + info + location map + related videos |
| Categories | `categories.html` | 5 biological classes overview |
| Animal Map | `map.html` | World map with animal origin markers (Leaflet.js) |
| Favorites | `favorites.html` | Favorites & Watch Later (localStorage) |
| Search | `search.html` | Client-side search via URL param `?q=` |
| About | `about.html` | Project info, tech stack, developer |
| Contact | `contact.html` | Static contact form (console.log) |

## Features (FYP1)

- 🎨 Safari探险风配色 + 深色/浅色切换 (localStorage持久)
- 🌍 世界地图 (Leaflet.js + OpenStreetMap)
- 📍 基于地理位置推荐 "Animals Near You"
- ❤️ Favorites & Watch Later (localStorage)
- 🔍 客户端全文搜索
- 📱 完全响应式 (Mobile/Tablet/Desktop)
- 🤖 AI Chatbot 图标 (FYP2占位)
- 📐 BEM CSS + CSS Variables 主题系统
- 🧩 IIFE 模块化 JS (App 命名空间)

## Tech Stack

- **HTML5** semantic markup
- **CSS3** (BEM, Grid, Flexbox, Custom Properties)
- **JavaScript** (Vanilla, IIFE modules, Fetch API)
- **Leaflet.js** + **OpenStreetMap** (map)
- **YouTube Iframe API** (video embeds)
- **localStorage** (favorites, theme, sidebar state)

## Getting Started

Open `home.html` in any modern browser. No build tools or server required.

## Project Structure

```
animal-verse/
├── home.html / gallery.html / playback.html / ...
├── data/videos.json        # 14 videos with GPS coords
├── css/
│   ├── base/               # Variables, reset, typography
│   ├── components/         # Header, sidebar, cards, player...
│   ├── layouts/            # Grid, app-layout, sections
│   ├── pages/              # Per-page styles
│   └── utilities/          # Spacing, display, animations
├── js/
│   ├── app.js              # Entry point
│   ├── config.js / theme.js / navigation.js
│   ├── data.js / ui.js / router.js
│   ├── home.js / gallery.js / player.js
│   ├── map.js / search.js / categories.js
│   ├── favorites.js / favorites-page.js
│   ├── contact.js / chatbot.js
│   └── utils.js
└── assets/                 # Images, videos (placeholders)
```

## FYP2 Roadmap

- Login/Auth module
- AWS Lambda + DynamoDB backend
- Amazon Lex chatbot
- Amazon Bedrock Gen AI
- User video uploads
