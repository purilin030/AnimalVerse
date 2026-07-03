"""
AnimalVerse - Parallel Media Downloader
========================================
Downloads photos & videos for ALL animals in the project,
running multiple animals in parallel for speed.

Usage:
    python scripts/download_media_parallel.py [--photos N] [--videos N] [--workers W]

Examples:
    python scripts/download_media_parallel.py              # 10 photos + 2 videos per animal
    python scripts/download_media_parallel.py --photos 5    # 5 photos only
    python scripts/download_media_parallel.py --videos 0    # skip videos, photos only
    python scripts/download_media_parallel.py --workers 2   # 2 animals at a time
"""

import os, sys, json, time, shutil, argparse, subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from time import time as _now

# ── ALL ANIMALS ───────────────────────────────────────────────────
ALL_ANIMALS = sorted(set([
    'Lion', 'Elephant', 'Tiger', 'Eagle', 'Wolf', 'Giraffe',
    'Penguin', 'Dolphin', 'Koala', 'Panda', 'Fox', 'Rabbit',
    'Monkey', 'Parrot', 'Bear', 'Frog', 'Owl', 'Horse',
    'Butterfly', 'Turtle', 'Whale', 'Peacock', 'Hedgehog', 'Kangaroo',
    'Polar Bear', 'Dolphin', 'Sea Turtle', 'Turtle', 'Chameleon',
    'Octopus', 'Tree Frog', 'Frog', 'Great White Shark', 'Shark',
    'Kitten', 'Cat', 'Bald Eagle', 'Lioness', 'Macaw', 'Toucan',
    'Tiger', 'Red Panda', 'Peacock', 'Komodo Dragon', 'Giant Panda',
    'Snow Leopard', 'Asian Elephant', 'Sun Bear', 'Giraffe',
    'Cheetah', 'Zebra', 'Hippopotamus', 'Rhinoceros', 'Gorilla',
    'Chimpanzee', 'Brown Bear', 'Red Fox', 'Wild Boar',
    'European Bison', 'Lynx', 'Reindeer', 'Badger', 'Grizzly Bear',
    'Moose', 'Coyote', 'Bison', 'Raccoon', 'Beaver', 'Mountain Lion',
    'Elk', 'Jaguar', 'Sloth', 'Anaconda', 'Capybara', 'Llama',
    'Piranha', 'Vampire Bat', 'Howler Monkey', 'Kangaroo', 'Koala',
    'Platypus', 'Wombat', 'Tasmanian Devil', 'Dingo', 'Emu',
    'Kookaburra', 'Wallaby', 'Seal', 'Blue Whale', 'Orca',
    'Albatross', 'Leopard Seal', 'Snow Petrel', 'Manta Ray',
    'Clownfish', 'Jellyfish', 'Seahorse', 'Coral', 'Sambar Deer',
    'Orangutan', 'Wolf', 'Otter', 'Crocodile', 'Squid', 'Arctic Tern',
    'Krill', 'Flamingo', 'Parrot', 'Eagle',
]))

# ── Scientific name mapping ─────────────────────────────────────
SCIENTIFIC_NAMES = {
    'albatross': 'Diomedeidae', 'anaconda': 'Eunectes murinus',
    'arctic-tern': 'Sterna paradisaea', 'asian-elephant': 'Elephas maximus',
    'badger': 'Meles meles', 'bald-eagle': 'Haliaeetus leucocephalus',
    'bison': 'Bison bison', 'blue-whale': 'Balaenoptera musculus',
    'brown-bear': 'Ursus arctos', 'chimpanzee': 'Pan troglodytes',
    'clownfish': 'Amphiprioninae', 'coral': 'Anthozoa',
    'crocodile': 'Crocodylidae', 'dingo': 'Canis lupus dingo',
    'dolphin': 'Tursiops truncatus', 'european-bison': 'Bison bonasus',
    'fox': 'Vulpes vulpes', 'giant-panda': 'Ailuropoda melanoleuca',
    'great-white-shark': 'Carcharodon carcharias',
    'grizzly-bear': 'Ursus arctos horribilis',
    'horse': 'Equus ferus caballus', 'howler-monkey': 'Alouatta',
    'kitten': 'Felis catus', 'koala': 'Phascolarctos cinereus',
    'kookaburra': 'Dacelo novaeguineae', 'lioness': 'Panthera leo',
    'llama': 'Lama glama', 'lynx': 'Lynx lynx', 'macaw': 'Ara macao',
    'manta-ray': 'Manta birostris', 'mountain-lion': 'Puma concolor',
    'piranha': 'Serrasalmus', 'polar-bear': 'Ursus maritimus',
    'red-fox': 'Vulpes vulpes', 'red-panda': 'Ailurus fulgens',
    'rhinoceros': 'Ceratotherium simum', 'sambar-deer': 'Rusa unicolor',
    'sea-turtle': 'Chelonia mydas', 'snow-leopard': 'Panthera uncia',
    'snow-petrel': 'Pagodroma nivea', 'sun-bear': 'Helarctos malayanus',
    'tasmanian-devil': 'Sarcophilus harrisii', 'toucan': 'Ramphastos toco',
    'tree-frog': 'Hylidae', 'vampire-bat': 'Desmodus rotundus',
    'wallaby': 'Macropus agilis', 'wild-boar': 'Sus scrofa',
    'wolf': 'Canis lupus',
}
PROBLEM_ANIMALS = set(SCIENTIFIC_NAMES.keys())

# ── Paths ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'

# ── Thread-safe printing + API rate limiter ───────────────────────
_print_lock = Lock()
_api_lock = Lock()
_last_api_call = 0.0

def p(*args, **kwargs):
    with _print_lock:
        print(*args, **kwargs)

def _rate_limited_call(url, params, timeout=15, retries=4):
    """Make an API call with rate limiting (2s between calls)."""
    import requests as req
    global _last_api_call
    for attempt in range(retries):
        with _api_lock:
            elapsed = _now() - _last_api_call
            if elapsed < 2.0:
                time.sleep(2.0 - elapsed)
            _last_api_call = _now()
        try:
            r = req.get(url, params=params, headers={'User-Agent': 'AnimalVerse/1.0'}, timeout=timeout)
            if r.status_code == 200 and len(r.text) > 10:
                return r.json()
            elif r.status_code == 429:
                p('       Rate limited (429), waiting 15s...')
                time.sleep(15)
            else:
                time.sleep(3)
        except Exception:
            time.sleep(3)
    return {}


# ══════════════════════════════════════════════════════════════════
#  Photo Download - Wikipedia + Wikimedia Commons
# ══════════════════════════════════════════════════════════════════

VALID_EXT = {'.jpg', '.jpeg', '.png', '.webp'}
WIKI_API = 'https://en.wikipedia.org/w/api.php'
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'


def _build_terms(animal, slug):
    terms = []
    sci = SCIENTIFIC_NAMES.get(slug)
    if sci:
        terms.append(sci)
    terms.append(animal)
    return terms


def _wiki_imgs(term, need):
    """Get up to *need* thumbnail URLs from Wikipedia (one API call)."""
    data = _rate_limited_call(WIKI_API, {
        'action': 'query', 'generator': 'search', 'gsrsearch': term,
        'gsrlimit': 30, 'prop': 'pageimages', 'pithumbsize': 600,
        'format': 'json',
    })
    pages = data.get('query', {}).get('pages', {}).values() if 'query' in data else []
    urls = []
    for pg in pages:
        src = pg.get('thumbnail', {}).get('source', '')
        if src and any(src.lower().endswith(e) for e in VALID_EXT):
            urls.append(src)
            if len(urls) >= need:
                break
    return urls


def _commons_imgs(term, need):
    """Get up to *need* full-res URLs from Wikimedia Commons."""
    data = _rate_limited_call(COMMONS_API, {
        'action': 'query', 'list': 'search',
        'srsearch': f'{term} -icon -logo', 'srnamespace': 6,
        'format': 'json', 'srlimit': need + 3,
    })
    results = data.get('query', {}).get('search', [])
    if not results:
        return []

    urls = []
    for res in results:
        title = res.get('title', '')
        if not title: continue
        low = title.lower()
        if any(k in low for k in ('icon', 'logo', 'map', 'flag', 'distribution')):
            continue
        ext = title.rsplit('.', 1)[-1].lower() if '.' in title else ''
        if ext in ('gif', 'svg', 'ogg', 'pdf', 'djvu'): continue

        d2 = _rate_limited_call(COMMONS_API, {
            'action': 'query', 'titles': title,
            'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json',
        })
        for p2 in d2.get('query', {}).get('pages', {}).values():
            if 'imageinfo' in p2 and p2['imageinfo']:
                u = p2['imageinfo'][0].get('url', '')
                if u and any(u.lower().endswith(e) for e in VALID_EXT):
                    urls.append(u)
        if len(urls) >= need:
            break
    return urls


def download_photos(animal, count=10):
    """Download *count* photos for *animal* from Wikipedia + Commons."""
    import requests as req
    slug = animal.lower().replace(' ', '-')
    animal_dir = BASE_DIR / slug / 'photos'
    animal_dir.mkdir(parents=True, exist_ok=True)

    terms = _build_terms(animal, slug)
    p(f'  [{animal}] Getting {count} photos (Wikipedia + Commons)')
    p(f'     Search: {terms[0]}')

    all_urls, seen = [], set()
    for term in terms:
        if len(all_urls) >= count + 5: break
        urls = _wiki_imgs(term, count + 5)
        for u in urls:
            if u not in seen: seen.add(u); all_urls.append(u)
        p(f'     Wikipedia ({term}): {len(urls)} images')

        if len(all_urls) >= count + 5: break

        need = count + 5 - len(all_urls)
        if need > 0:
            urls = _commons_imgs(term, min(need, 5))
            for u in urls:
                if u not in seen: seen.add(u); all_urls.append(u)
            p(f'     Commons ({term}): {len(urls)} images')

    if not all_urls:
        p(f'  [{animal}] No images found')
        return

    p(f'     Found {len(all_urls)} images, downloading...')
    downloaded = 0
    for url in all_urls:
        if downloaded >= count: break
        for _ in range(2):
            try:
                r = req.get(url, timeout=20, headers={'User-Agent': 'AnimalVerse/1.0'})
                if r.status_code == 200 and len(r.content) > 3000:
                    ext = Path(url.split('?')[0]).suffix.lower() or '.jpg'
                    if ext not in VALID_EXT: ext = '.jpg'
                    with open(animal_dir / f'{slug}-photo-{downloaded+1}{ext}', 'wb') as f:
                        f.write(r.content)
                    downloaded += 1
                    break
            except Exception:
                time.sleep(1)
    p(f'  [{animal}] Downloaded {downloaded} photos')


# ══════════════════════════════════════════════════════════════════
#  Video Download - yt-dlp
# ══════════════════════════════════════════════════════════════════

def download_videos(animal, count=2):
    slug = animal.lower().replace(' ', '-')
    animal_dir = BASE_DIR / slug / 'videos'
    animal_dir.mkdir(parents=True, exist_ok=True)

    p(f'  [{animal}] Searching YouTube for {count} videos...')
    result = subprocess.run([
        'yt-dlp', '--flat-playlist', '--dump-json',
        f'ytsearch{count+2}:{animal} wildlife documentary',
    ], capture_output=True, text=True, timeout=60)

    if result.returncode != 0 or not result.stdout.strip():
        p(f'  [{animal}] No video results')
        return

    urls = []
    for line in result.stdout.strip().split('\n')[:count]:
        try:
            urls.append(f'https://youtube.com/watch?v={json.loads(line)["id"]}')
        except Exception:
            continue

    for idx, url in enumerate(urls):
        out = str(animal_dir / f'{slug}-video-{idx+1}.mp4')
        p(f'  [{animal}] Downloading video {idx+1}/{count}...')
        subprocess.run([
            'yt-dlp', '-f', 'best[height<=1080]', '--max-filesize', '100M',
            '--socket-timeout', '30', '--retries', '10', '--no-part',
            '--merge-output-format', 'mp4', '-o', out, url,
        ], capture_output=True, text=True, timeout=300)
        time.sleep(0.5)


def process_animal(animal, pc, vc):
    p(f'\n{"-"*50}\n>  Starting: {animal}\n{"-"*50}')
    if pc > 0: download_photos(animal, pc)
    if vc > 0: download_videos(animal, vc)
    p(f'Done: {animal}')
    return animal


# ══════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='AnimalVerse Parallel Media Downloader')
    parser.add_argument('--photos', type=int, default=10)
    parser.add_argument('--videos', type=int, default=2)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--animals', nargs='*')
    args = parser.parse_args()

    animals = args.animals or ALL_ANIMALS
    print(f'\n{"="*60}')
    print(f'AnimalVerse Media Downloader  (Wikipedia + Commons)')
    print(f'{"="*60}')
    print(f'  Animals: {len(animals)} | Photos: {args.photos} | Videos: {args.videos}')
    print(f'  Workers: {args.workers} | Target: {BASE_DIR}')
    print(f'{"="*60}\n')

    start = time.time()
    ok = 0
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        fs = {ex.submit(process_animal, a, args.photos, args.videos): a for a in animals}
        for f in as_completed(fs):
            try:
                f.result(); ok += 1
            except Exception as e:
                p(f'X [{fs[f]}] Failed: {e}')

    print(f'\n{"="*60}')
    print(f'Done! {ok}/{len(animals)} animals in {time.time()-start:.0f}s')
    print(f'  {BASE_DIR}')
    print(f'{"="*60}')


if __name__ == '__main__':
    main()
