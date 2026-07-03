"""
AnimalVerse - Media Downloader
==============================
Downloads 2 photos and 2 videos for each animal
into assets/images/library/<animal-name>/

Requirements:
    pip install bing-image-downloader yt-dlp
"""

import os
import sys
import time
import shutil
import subprocess
from pathlib import Path

# ── 24 animals from random-vid.js ─────────────────────────────────
ANIMALS = [
    'Lion', 'Elephant', 'Tiger', 'Eagle', 'Wolf', 'Giraffe',
    'Penguin', 'Dolphin', 'Koala', 'Panda', 'Fox', 'Rabbit',
    'Monkey', 'Parrot', 'Bear', 'Frog', 'Owl', 'Horse',
    'Butterfly', 'Turtle', 'Whale', 'Peacock', 'Hedgehog', 'Kangaroo',
]

# ── Paths ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'

# ── Helpers ───────────────────────────────────────────────────────

def ensure_dir(path):
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def run(cmd, desc=''):
    """Run a shell command and print progress."""
    print(f'  → {desc or " ".join(cmd)}')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'    ⚠ Stderr: {result.stderr.strip()[:200]}')
    return result


def slug(name):
    """Convert animal name to a filesystem-friendly slug."""
    return name.lower().replace(' ', '-')


# ══════════════════════════════════════════════════════════════════
#  PHOTOS — via bing-image-downloader
# ══════════════════════════════════════════════════════════════════

def download_photos(animal):
    """Download 2 photos for *animal* using bing-image-downloader."""
    from bing_image_downloader import downloader

    animal_dir = ensure_dir(BASE_DIR / slug(animal) / 'photos')
    query = f'{animal} animal wildlife high quality'

    print(f'\n{"="*60}')
    print(f'📷  [{animal}] Downloading 2 photos…')
    print(f'{"="*60}')

    # bing-image-downloader downloads into  <output_dir>/<query>/
    # We'll grab the files and move them to the correct folder.
    downloader.download(
        query,
        limit=10,
        output_dir=str(animal_dir),
        adult_filter_off=True,
        force_replace=False,
        timeout=30,
    )

    # Move files from the subfolder up to photos/
    subdir = animal_dir / query
    if subdir.exists():
        for i, f in enumerate(sorted(subdir.iterdir())):
            if f.is_file():
                ext = f.suffix or '.jpg'
                dest = animal_dir / f'{slug(animal)}-photo-{i+1}{ext}'
                shutil.move(str(f), str(dest))
                print(f'    ✔ {dest.name}')
        # Clean up empty subfolder
        shutil.rmtree(subdir, ignore_errors=True)
    else:
        print(f'    ⚠ No images downloaded for {animal}')


# ══════════════════════════════════════════════════════════════════
#  VIDEOS — via yt-dlp (YouTube search & download)
# ══════════════════════════════════════════════════════════════════

def download_videos(animal):
    """Download 2 short video clips for *animal* using yt-dlp."""
    animal_dir = ensure_dir(BASE_DIR / slug(animal) / 'videos')
    query = f'{animal} wildlife documentary'

    print(f'\n{"="*60}')
    print(f'🎬  [{animal}] Downloading 2 videos…')
    print(f'{"="*60}')

    # Search for videos, get the first 2 results
    search_cmd = [
        'yt-dlp',
        '--flat-playlist',
        '--dump-json',
        f'ytsearch4:{query}',
    ]
    result = run(search_cmd, f'Searching YouTube for "{query}"')

    if result.returncode != 0 or not result.stdout.strip():
        print(f'    ⚠ No video results for {animal}')
        return

    # Parse JSON lines to get video URLs
    lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
    import json
    urls = []
    for line in lines[:2]:  # first 2 results
        try:
            data = json.loads(line)
            urls.append(f'https://youtube.com/watch?v={data["id"]}')
        except json.JSONDecodeError:
            continue

    if not urls:
        print(f'    ⚠ Could not extract video URLs for {animal}')
        return

    # Download each video
    for idx, url in enumerate(urls):
        output_template = str(animal_dir / f'{slug(animal)}-video-{idx+1}.mp4')
        dl_cmd = [
            'yt-dlp',
            '-f', 'best[height<=1080]',                   # best ≤1080p (single stream)
            '--max-filesize', '100M',                     # cap at 100 MB
            '--socket-timeout', '30',
            '--retries', '10',
            '--no-part',                                  # don't use .part temp files
            '--merge-output-format', 'mp4',               # force .mp4 output
            '-o', output_template,
            url,
        ]
        run(dl_cmd, f'Downloading video {idx+1}/2 from {url}')
        time.sleep(1)  # be polite between downloads


# ══════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════

def main():
    print(f'AnimalVerse Media Downloader')
    print(f'Target: {BASE_DIR}')
    print(f'Total animals: {len(ANIMALS)}')
    print(f'Expected output: {len(ANIMALS)} folders × (2 photos + 2 videos)')

    start = time.time()
    success = 0

    for animal in ANIMALS:
        try:
            download_photos(animal)
            download_videos(animal)
            success += 1
        except Exception as e:
            print(f'    ❌ Error processing {animal}: {e}')

        # Brief pause between animals
        time.sleep(0.5)

    elapsed = time.time() - start
    print(f'\n{"="*60}')
    print(f'✅ Done! Processed {success}/{len(ANIMALS)} animals in {elapsed:.1f}s')
    print(f'📁 Files saved under: {BASE_DIR}')
    print(f'{"="*60}')


if __name__ == '__main__':
    main()
