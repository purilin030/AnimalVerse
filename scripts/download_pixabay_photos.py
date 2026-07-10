"""
AnimalVerse - Download Pixabay Photos Only
==========================================
Adds 5 Pixabay photos to each animal without touching existing Pexels photos.
Pixabay rate: 100 req/60s, no batch waiting needed.

Usage:
    python scripts/download_pixabay_photos.py
    python scripts/download_pixabay_photos.py --status
    python scripts/download_pixabay_photos.py --animal lion
"""

import os
import json
import time
import threading
import requests
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

PIXABAY_KEY = '56625859-d8439ce3f14f92dc804edddce'
BASE_DIR    = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
PROGRESS_PATH = Path(__file__).resolve().parent / 'pixabay_photos_progress.json'
CACHE_PATH    = Path(__file__).resolve().parent / 'pixabay_cache.json'
CACHE_TTL     = 86400

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'AnimalVerse/1.0 (educational FYP)'})

# Pixabay: 100 req/min, so 0.6s interval is safe
_rate = {'lock': threading.Lock(), 'last': [0.0], 'interval': 0.6}

def throttled_get(url, **kwargs):
    cfg = _rate
    for attempt in range(6):
        with cfg['lock']:
            gap = time.monotonic() - cfg['last'][0]
            if gap < cfg['interval']:
                time.sleep(cfg['interval'] - gap)
            cfg['last'][0] = time.monotonic()
            r = SESSION.get(url, **kwargs)
        if r.status_code == 429:
            wait = min(int(r.headers.get('Retry-After', 10)), 30)
            print(f"  [429] Rate limited, waiting {wait}s...")
            time.sleep(wait)
            continue
        return r
    raise RuntimeError("Too many retries")

# Search cache
def _load_cache():
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_cache(c):
    try:
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(c, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

_CACHE   = _load_cache()
_CACHE_L = threading.Lock()

def cached_search(query, searcher, count):
    key = f"pixabay:{query}:{count}"
    now = time.time()
    with _CACHE_L:
        if key in _CACHE:
            entry = _CACHE[key]
            if now - entry['ts'] < CACHE_TTL:
                return entry['results']
            else:
                del _CACHE[key]
    results = searcher(query, count)
    with _CACHE_L:
        _CACHE[key] = {'ts': now, 'results': results}
        _save_cache(_CACHE)
    return results

# Pixabay image search
def search_pixabay(query, count=5):
    results = []
    queries = [query]
    words = query.split()
    if len(words) > 1:
        queries += [words[-1], words[0]]
    for q in queries:
        if len(results) >= count:
            break
        try:
            r = throttled_get('https://pixabay.com/api/',
                              params={'key': PIXABAY_KEY, 'q': q,
                                      'per_page': min(count + 5, 50),
                                      'image_type': 'photo', 'safesearch': 'true'},
                              timeout=20)
            r.raise_for_status()
            for hit in r.json().get('hits', []):
                if len(results) >= count:
                    break
                url = hit.get('largeImageURL', '') or hit.get('webformatURL', '')
                if not url:
                    continue
                ext = os.path.splitext(url.split('?')[0])[1] or '.jpg'
                hit_id = hit.get('id', '')
                user = hit.get('user', 'Pixabay')
                page_url = hit.get('pageURL', '') or f"https://pixabay.com/photos/?id={hit_id}"
                results.append((url, ext, f"{query} - {hit_id}", user, page_url))
        except Exception as e:
            print(f"  [WARN] '{q}': {e}")
    return results

# Progress
def _load_progress():
    if PROGRESS_PATH.exists():
        try:
            with open(PROGRESS_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_progress(p):
    try:
        with open(PROGRESS_PATH, 'w', encoding='utf-8') as f:
            json.dump(p, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

_PROG     = _load_progress()
_PROG_L   = threading.Lock()

def _is_done(slug, cat):
    with _PROG_L:
        return _PROG.get(f"{slug}:{cat}", {}).get('status') == 'done'

def _mark_done(slug, cat, n=0):
    with _PROG_L:
        _PROG[f"{slug}:{cat}"] = {'status': 'done', 'ts': time.time(), 'downloaded': n}
        _save_progress(_PROG)

def discover_animals():
    animals = []
    for cat_dir in sorted(BASE_DIR.iterdir()):
        if not cat_dir.is_dir():
            continue
        cat = cat_dir.name
        for animal_dir in sorted(cat_dir.iterdir()):
            if animal_dir.is_dir():
                slug = animal_dir.name
                name = slug.replace('-', ' ').title()
                animals.append((slug, name, cat))
    return animals

_P = {'lock': threading.Lock(), 'total': 0, 'done': 0, 'skip': 0, 'fail': 0, 'start': 0.0}

def _init_p(total):
    with _P['lock']:
        _P.update(total=total, done=0, skip=0, fail=0, start=time.time())

def _incr_p(name, status):
    with _P['lock']:
        if status == 'done': _P['done'] += 1
        elif status == 'skip': _P['skip'] += 1
        else: _P['fail'] += 1
        d, s, f = _P['done'], _P['skip'], _P['fail']
        n = d + s + f; t = _P['total']; e = time.time() - _P['start']
        pct = n / t * 100 if t else 0
        eta = f' | ETA: {(t-n)/(n/e):.0f}s' if n > 0 and e > 0 else ''
        icon = {'done': '✓', 'skip': '⏭', 'fail': '✗'}[status]
        print(f"  └─ [{n}/{t}] {pct:.0f}% | {icon} {name} | "
              f"{d} ok, {s} skip, {f} fail | {e:.0f}s elapsed{eta}")

# Per-animal
def process_animal(slug, name, cat):
    key = f"{slug}:{cat}"
    if _is_done(slug, cat):
        _incr_p(name, 'skip')
        return

    photos_dir = BASE_DIR / cat / slug / 'photos'
    if not photos_dir.exists():
        print(f"[{name}] No photos directory, skipping")
        _mark_done(slug, cat, 0)
        _incr_p(name, 'fail')
        return

    # Count existing Pexels photos
    existing = sorted([f for f in photos_dir.iterdir()
                       if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.gif')])
    print(f"[{name}] Existing: {len(existing)} photos")

    # Search Pixabay
    print(f"[{name}] Searching Pixabay...")
    photos = cached_search(name, search_pixabay, 5)

    if not photos:
        print(f"[{name}] x No Pixabay photos found.")
        _mark_done(slug, cat, 0)
        _incr_p(name, 'fail')
        return

    # Download Pixabay photos (numbered after existing files)
    base_idx = len([f for f in existing if 'pexels' in f.name])
    downloaded = 0
    source_entries = []

    for idx, (url, ext, title, user, page_url) in enumerate(photos):
        file_idx = base_idx + idx + 1
        out_path = photos_dir / f"{slug}-pixabay-{file_idx}{ext}"
        print(f"[{name}] Downloading Pixabay {idx+1}/{len(photos)}...")
        try:
            r = SESSION.get(url, stream=True, timeout=60)
            if r.status_code != 200:
                continue
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(2 * 1024 * 1024):
                    if chunk:
                        f.write(chunk)
            if out_path.stat().st_size < 1024:
                out_path.unlink(missing_ok=True)
                continue
        except Exception:
            if out_path.exists():
                out_path.unlink(missing_ok=True)
            continue

        source_entries.append({
            'title': title, 'uploader': user,
            'source': 'Pixabay', 'url': url,
            'page_url': page_url,
            'credit': f"Image by {user} on Pixabay",
        })
        downloaded += 1

    # Merge with existing sources.json
    sources_path = photos_dir / 'sources.json'
    all_sources = []
    if sources_path.exists():
        try:
            with open(sources_path, 'r', encoding='utf-8') as f:
                all_sources = json.load(f)
        except Exception:
            pass

    # Only add entries that aren't already there (by URL)
    existing_urls = {e.get('url') for e in all_sources}
    for e in source_entries:
        if e['url'] not in existing_urls:
            all_sources.append(e)

    if all_sources:
        with open(sources_path, 'w', encoding='utf-8') as f:
            json.dump(all_sources, f, indent=2, ensure_ascii=False)

    print(f"[{name}] Done! (+{downloaded} Pixabay photos, total {len(all_sources)} sources)")
    _mark_done(slug, cat, downloaded)
    _incr_p(name, 'done' if downloaded > 0 else 'fail')

# Main
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--animal', type=str, default=None)
    parser.add_argument('--reset-progress', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()

    if args.reset_progress:
        if PROGRESS_PATH.exists():
            PROGRESS_PATH.unlink()
            print("Progress reset.")
        else:
            print("Nothing to reset.")
        return

    animals = discover_animals()
    if args.animal:
        animals = [a for a in animals if a[0] == args.animal]
        if not animals:
            print(f"'{args.animal}' not found.")
            return

    done_count = sum(1 for s, _, c in animals if _is_done(s, c))
    pending = len(animals) - done_count
    cached = sum(1 for k in _CACHE if not k.startswith('__'))

    if args.status:
        print(f"Total: {len(animals)}  |  Done: {done_count}  |  Pending: {pending}")
        print(f"Cache: {cached} queries")
        if pending:
            print("\nPending:")
            for s, n, c in animals:
                if not _is_done(s, c):
                    print(f"  {n:25s} ({c})")
        return

    print('=' * 50)
    print(' Pixabay Photo Downloader (5/animal)')
    print(f'  Animals: {len(animals)}  |  Done: {done_count}  |  Pending: {pending}')
    print(f'  Workers: {args.workers}')
    print(f'  Pixabay rate: 100 req/min (no batch wait)')
    print('=' * 50)

    pending_list = [(s, n, c) for s, n, c in animals if not _is_done(s, c)]
    if not pending_list:
        print("All done!")
        return

    _init_p(len(pending_list))
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        ex.map(lambda a: process_animal(*a), pending_list)

    new_done = sum(1 for s, _, c in pending_list if _is_done(s, c))
    print('=' * 50)
    print(f" Done! {new_done}/{len(pending_list)} in {time.time()-start:.0f}s.")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        with _P['lock']:
            n = _P['done'] + _P['skip'] + _P['fail']
        print('\n' + '=' * 40)
        print('  ⏸  PAUSED')
        print(f'  Done: {_P["done"]}  Skip: {_P["skip"]}  Fail: {_P["fail"]}')
        if n:
            print(f'  Progress: {n}/{_P["total"]} ({n/_P["total"]*100:.0f}%)')
        print('  Re-run to continue.')
        print('=' * 40)
