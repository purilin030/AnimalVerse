"""
AnimalVerse - Pexels + Pixabay Video Downloader
================================================
Downloads up to 3 videos per animal.
Strategy: Pexels first -> Pixabay fallback -> skip if still empty.

Usage:
    python scripts/download_pexels_pixabay.py
    python scripts/download_pexels_pixabay.py --skip-existing
    python scripts/download_pexels_pixabay.py --workers 3
"""

import os
import json
import time
import threading
import requests
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# --- API Keys ---
PEXELS_KEY  = 'oVvphPsPC87YaoaA6xcfGnBu6fqbU8oBdWuH2QNEnhyIGWzXKl9i4vef'
PIXABAY_KEY = '56625859-d8439ce3f14f92dc804edddce'

# --- Animals ---
ANIMALS = sorted(set([
    'Lion', 'Elephant', 'Tiger', 'Eagle', 'Wolf', 'Giraffe',
    'Penguin', 'Dolphin', 'Koala', 'Panda', 'Fox', 'Rabbit',
    'Monkey', 'Parrot', 'Bear', 'Frog', 'Owl', 'Horse',
    'Butterfly', 'Turtle', 'Whale', 'Peacock', 'Hedgehog', 'Kangaroo',
    'Polar Bear', 'Sea Turtle', 'Chameleon',
    'Octopus', 'Tree Frog', 'Great White Shark', 'Shark',
    'Cat', 'Bald Eagle', 'Lioness', 'Macaw', 'Toucan',
    'Red Panda', 'Komodo Dragon', 'Giant Panda',
    'Snow Leopard', 'Asian Elephant', 'Sun Bear',
    'Cheetah', 'Zebra', 'Hippopotamus', 'Rhinoceros', 'Gorilla',
    'Chimpanzee', 'Brown Bear', 'Red Fox', 'Wild Boar',
    'European Bison', 'Lynx', 'Reindeer', 'Badger', 'Grizzly Bear',
    'Moose', 'Coyote', 'Bison', 'Raccoon', 'Beaver', 'Mountain Lion',
    'Elk', 'Jaguar', 'Sloth', 'Anaconda', 'Capybara', 'Llama',
    'Piranha', 'Vampire Bat', 'Howler Monkey',
    'Platypus', 'Wombat', 'Tasmanian Devil', 'Dingo', 'Emu',
    'Kookaburra', 'Wallaby', 'Seal', 'Blue Whale', 'Orca',
    'Albatross', 'Leopard Seal', 'Snow Petrel', 'Manta Ray',
    'Clownfish', 'Jellyfish', 'Seahorse', 'Coral', 'Sambar Deer',
    'Orangutan', 'Otter', 'Crocodile', 'Squid', 'Arctic Tern',
    'Krill', 'Flamingo',
]))

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'

# --- Category classifier ---
def get_category(animal):
    s = animal.lower()
    aquatic    = {'whale', 'dolphin', 'seal', 'shark', 'fish', 'octopus', 'squid',
                  'jellyfish', 'coral', 'clownfish', 'manta ray', 'seahorse',
                  'krill', 'piranha', 'platypus', 'sea turtle', 'orca'}
    reptiles   = {'anaconda', 'chameleon', 'crocodile', 'komodo', 'lizard',
                  'snake', 'turtle', 'tortoise', 'gecko', 'iguana', 'python'}
    amphibians = {'frog', 'toad', 'salamander', 'newt'}
    birds      = {'eagle', 'hawk', 'owl', 'parrot', 'penguin', 'flamingo',
                  'peacock', 'toucan', 'macaw', 'kookaburra', 'albatross',
                  'tern', 'petrel', 'emu', 'bald eagle'}
    if any(k in s for k in aquatic):    return 'Aquatic'
    if any(k in s for k in reptiles):   return 'Reptiles'
    if any(k in s for k in amphibians): return 'Amphibians'
    if any(k in s for k in birds):      return 'Birds'
    return 'Mammals'

# --- HTTP session with per-source rate limiting ---
SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'AnimalVerse/1.0 (educational FYP)'})

_rate = {
    'pexels':  {'lock': threading.Lock(), 'last': [0.0], 'interval': 0.4},
    'pixabay': {'lock': threading.Lock(), 'last': [0.0], 'interval': 0.4},
    'dl':      {'lock': threading.Lock(), 'last': [0.0], 'interval': 0.1},
}

def throttled_get(src, url, **kwargs):
    cfg = _rate[src]
    for attempt in range(6):
        with cfg['lock']:
            gap = time.monotonic() - cfg['last'][0]
            if gap < cfg['interval']:
                time.sleep(cfg['interval'] - gap)
            cfg['last'][0] = time.monotonic()
            r = SESSION.get(url, **kwargs)
        if r.status_code == 429:
            wait = int(r.headers.get('Retry-After', 10))
            print(f"  [429/{src}] Rate limited, waiting {wait}s (attempt {attempt+1}/6)...")
            time.sleep(wait + 1)
            continue
        return r
    raise RuntimeError(f"[{src}] Too many retries for {url}")

# --- Pexels ---
PEXELS_URL = 'https://api.pexels.com/videos/search'

def search_pexels(animal, count=3):
    results = []
    queries = [animal]
    words = animal.split()
    if len(words) > 1:
        queries += [words[-1], words[0]]

    for q in queries:
        if results:
            break
        try:
            r = throttled_get('pexels', PEXELS_URL,
                              params={'query': q, 'per_page': count + 5, 'size': 'medium'},
                              headers={'Authorization': PEXELS_KEY},
                              timeout=20)
            r.raise_for_status()
            for vid in r.json().get('videos', []):
                if len(results) >= count:
                    break
                files = sorted(
                    [f for f in vid.get('video_files', []) if f.get('file_type') == 'video/mp4'],
                    key=lambda f: f.get('width', 0), reverse=True
                )
                if not files:
                    continue
                results.append((
                    files[0]['link'],
                    f"{animal} - {vid.get('id', '')}",
                    vid.get('user', {}).get('name', 'Pexels'),
                    'Pexels'
                ))
        except Exception as e:
            print(f"  [WARN/pexels] '{q}': {e}")
    return results

# --- Pixabay ---
PIXABAY_URL = 'https://pixabay.com/api/videos/'

def search_pixabay(animal, count=3):
    results = []
    queries = [animal]
    words = animal.split()
    if len(words) > 1:
        queries += [words[-1], words[0]]

    for q in queries:
        if results:
            break
        try:
            r = throttled_get('pixabay', PIXABAY_URL,
                              params={'key': PIXABAY_KEY, 'q': q,
                                      'per_page': min(count + 5, 20),
                                      'video_type': 'film'},
                              timeout=20)
            r.raise_for_status()
            for hit in r.json().get('hits', []):
                if len(results) >= count:
                    break
                vids = hit.get('videos', {})
                for size in ('large', 'medium', 'small', 'tiny'):
                    url = vids.get(size, {}).get('url', '')
                    if url:
                        results.append((
                            url,
                            f"{animal} - {hit.get('id', '')}",
                            hit.get('user', 'Pixabay'),
                            'Pixabay'
                        ))
                        break
        except Exception as e:
            print(f"  [WARN/pixabay] '{q}': {e}")
    return results

# --- Download ---
def download_video(url, out_path):
    try:
        r = throttled_get('dl', url, stream=True, timeout=60)
        if r.status_code == 200:
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=2 * 1024 * 1024):
                    if chunk:
                        f.write(chunk)
            return True
    except Exception as e:
        print(f"  [WARN/dl] {out_path.name}: {e}")
    return False

# --- Per-animal processor ---
def process_animal(animal, skip_existing=False):
    slug     = animal.lower().replace(' ', '-')
    category = get_category(animal)
    vid_dir  = BASE_DIR / category / slug / 'videos'
    vid_dir.mkdir(parents=True, exist_ok=True)

    if skip_existing:
        existing = (list(vid_dir.glob('*.mp4')) +
                    list(vid_dir.glob('*.webm')) +
                    list(vid_dir.glob('*.ogv')))
        if len(existing) >= 3:
            print(f"[{animal}] Skipped (already {len(existing)} videos)")
            return

    print(f"[{animal}] Searching Pexels...")
    videos = search_pexels(animal, count=3)

    if len(videos) < 3:
        need = 3 - len(videos)
        print(f"[{animal}] Pexels: {len(videos)} found, trying Pixabay for {need} more...")
        videos += search_pixabay(animal, count=need)

    if not videos:
        print(f"[{animal}] x No video found on either source.")
        return

    source_info = []
    downloaded  = 0
    for idx, (url, title, uploader, source) in enumerate(videos[:3]):
        out_path = vid_dir / f"{slug}-{source.lower()}-{idx + 1}.mp4"
        print(f"[{animal}] Downloading {idx+1}/{len(videos[:3])} from {source}...")
        if download_video(url, out_path):
            downloaded += 1
            source_info.append({'title': title, 'uploader': uploader,
                                 'source': source, 'url': url})

    if source_info:
        with open(vid_dir / 'sources.json', 'w', encoding='utf-8') as f:
            json.dump(source_info, f, ensure_ascii=False, indent=4)
        print(f"[{animal}] Done! ({downloaded} video(s))")
    else:
        print(f"[{animal}] x All downloads failed.")

# --- Main ---
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=2,
                        help='Parallel workers (default 2)')
    parser.add_argument('--skip-existing', action='store_true',
                        help='Skip animals that already have >=3 videos')
    args = parser.parse_args()

    print('=' * 60)
    print(f' AnimalVerse - Pexels + Pixabay Video Downloader')
    print(f' Animals: {len(ANIMALS)}  |  Workers: {args.workers}')
    print('=' * 60)

    start = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        ex.map(lambda a: process_animal(a, args.skip_existing), ANIMALS)

    print('=' * 60)
    print(f"Done in {time.time() - start:.0f}s!")
    print("Remember to run 'python animal-verse/scripts/rebuild_videos_json.py' afterwards.")

if __name__ == '__main__':
    main()
