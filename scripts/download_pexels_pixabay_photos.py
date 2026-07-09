"""
AnimalVerse - Pexels + Pixabay Photo Downloader (Parallel, Resumable)
=====================================================================
Downloads up to 10 photos per animal (5 Pexels + 5 Pixabay fallback).
Clears existing photos before downloading.

Rate-limit aware + persistent search cache (24h, per Pixabay TOS).
Progress tracking — Ctrl+C anytime, re-run to continue where you left off.

Usage:
    python scripts/download_pexels_pixabay_photos.py
    python scripts/download_pexels_pixabay_photos.py --workers 1
    python scripts/download_pexels_pixabay_photos.py --dry-run
    python scripts/download_pexels_pixabay_photos.py --animal lion
    python scripts/download_pexels_pixabay_photos.py --status
    python scripts/download_pexels_pixabay_photos.py --reset-progress
"""

import os
import json
import time
import threading
import requests
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# =========================================================================
#                           API Keys & Config
# =========================================================================
PEXELS_KEY  = 'oVvphPsPC87YaoaA6xcfGnBu6fqbU8oBdWuH2QNEnhyIGWzXKl9i4vef'
PIXABAY_KEY = '56625859-d8439ce3f14f92dc804edddce'

BASE_DIR       = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
CACHE_PATH     = Path(__file__).resolve().parent / 'photo_search_cache.json'
CACHE_TTL      = 86400  # 24小时，Pixabay 要求缓存至少 24h
PROGRESS_PATH  = Path(__file__).resolve().parent / 'photo_download_progress.json'

# 每类来源的间隔配置
RATE_CFG = {
    'pexels':  {'min_interval': 1.0,   'max_per_minute': 50},
    'pixabay': {'min_interval': 2.0,   'max_per_minute': 25},
    'dl':      {'min_interval': 0.15,  'max_per_minute': 300},
}

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'AnimalVerse/1.0 (educational FYP)'})

# =========================================================================
#                     Per-source adaptive throttling
# =========================================================================
class RateLimiter:
    """Per-source rate limiter that respects 429 Retry-After."""

    def __init__(self, src):
        cfg = RATE_CFG[src]
        self._lock      = threading.Lock()
        self._last_time = [0.0]
        self._min_int   = cfg['min_interval']
        self._src       = src

    def wait(self, resp_headers=None):
        with self._lock:
            if resp_headers and int(resp_headers.get('X-RateLimit-Remaining', 1)) == 0:
                reset_in = int(resp_headers.get('X-RateLimit-Reset', 60))
                print(f"  [rate/{self._src}] 0 remaining, pausing {reset_in}s...")
                time.sleep(reset_in + 2)
            now = time.monotonic()
            gap = now - self._last_time[0]
            if gap < self._min_int:
                time.sleep(self._min_int - gap)
            self._last_time[0] = time.monotonic()

# =========================================================================
#                     Search cache (persistent, 24h TTL)
# =========================================================================
def _load_cache():
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_cache(cache):
    try:
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  [WARN] Failed to save search cache: {e}")

_SEARCH_CACHE = _load_cache()
_CACHE_LOCK   = threading.Lock()

def _cached_search(source, query, searcher, count):
    key = f"{source}:{query}:{count}"
    now = time.time()
    with _CACHE_LOCK:
        if key in _SEARCH_CACHE:
            entry = _SEARCH_CACHE[key]
            if now - entry['ts'] < CACHE_TTL:
                return entry['results']
            else:
                del _SEARCH_CACHE[key]
    results = searcher(query, count)
    with _CACHE_LOCK:
        _SEARCH_CACHE[key] = {'ts': now, 'results': results}
        _save_cache(_SEARCH_CACHE)
    return results

# =========================================================================
#                  Progress tracking (for pause/resume)
# =========================================================================
def _load_progress():
    if PROGRESS_PATH.exists():
        try:
            with open(PROGRESS_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_progress(progress):
    try:
        with open(PROGRESS_PATH, 'w', encoding='utf-8') as f:
            json.dump(progress, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  [WARN] Failed to save progress: {e}")

_PROGRESS      = _load_progress()
_PROGRESS_LOCK = threading.Lock()

def _is_done(slug, category):
    key = f"{slug}:{category}"
    with _PROGRESS_LOCK:
        entry = _PROGRESS.get(key, {})
        return entry.get('status') == 'done'

def _mark_done(slug, category, total=0):
    key = f"{slug}:{category}"
    with _PROGRESS_LOCK:
        _PROGRESS[key] = {'status': 'done', 'ts': time.time(), 'downloaded': total}
        _save_progress(_PROGRESS)

# =========================================================================
#                Live progress tracking (thread-safe)
# =========================================================================
_PROG = {
    'lock': threading.Lock(),
    'total': 0,
    'done': 0,
    'skipped': 0,
    'failed': 0,
    'start': 0.0,
}

def _init_progress(total):
    with _PROG['lock']:
        _PROG['total'] = total
        _PROG['done'] = 0
        _PROG['skipped'] = 0
        _PROG['failed'] = 0
        _PROG['start'] = time.time()

def _incr_progress(name, status):
    """Call after each animal finishes. Prints a live status line."""
    with _PROG['lock']:
        if status == 'done':
            _PROG['done'] += 1
        elif status == 'skipped':
            _PROG['skipped'] += 1
        else:
            _PROG['failed'] += 1

        done   = _PROG['done']
        skip   = _PROG['skipped']
        fail   = _PROG['failed']
        total  = _PROG['total']
        sofar  = done + skip + fail
        elap   = time.time() - _PROG['start']
        pct    = sofar / total * 100 if total else 0

        if sofar > 0 and elap > 0:
            rate = sofar / elap
            eta  = (total - sofar) / rate
            eta_s = f" | ETA: {eta:.0f}s" if eta > 0 else ""
        else:
            eta_s = ""

        status_icon = {'done': '✓', 'skipped': '⏭', 'failed': '✗'}.get(status, '?')
        print(f"  └─ [{sofar}/{total}] {pct:.0f}% | {status_icon} {name} | "
              f"{done} ok, {skip} skip, {fail} fail | "
              f"{elap:.0f}s elapsed{eta_s}")

# =========================================================================
#                         Animal discovery
# =========================================================================
def discover_animals():
    animals = []
    for cat_dir in sorted(BASE_DIR.iterdir()):
        if not cat_dir.is_dir():
            continue
        category = cat_dir.name
        for animal_dir in sorted(cat_dir.iterdir()):
            if animal_dir.is_dir():
                slug = animal_dir.name
                name = slug.replace('-', ' ').title()
                animals.append((slug, name, category))
    return animals

# =========================================================================
#                        Pexels image search
# =========================================================================
PEXELS_URL   = 'https://api.pexels.com/v1/search'
_rate_pexels = RateLimiter('pexels')

def search_pexels(query, count=5):
    results = []
    queries = [query]
    words = query.split()
    if len(words) > 1:
        queries.append(words[-1])
    if len(words) > 1:
        queries.append(words[0])
    for q in queries:
        if len(results) >= count:
            break
        try:
            _rate_pexels.wait()
            r = SESSION.get(PEXELS_URL,
                            params={'query': q, 'per_page': count + 5},
                            headers={'Authorization': PEXELS_KEY},
                            timeout=20)
            r.raise_for_status()
            remain = r.headers.get('X-RateLimit-Remaining', '?')
            if remain != '?' and int(remain) <= 10:
                print(f"  [rate/pexels] Only {remain} requests remaining in this window")
            _rate_pexels.wait(r.headers)
            for photo in r.json().get('photos', []):
                if len(results) >= count:
                    break
                url = photo.get('src', {}).get('original', '')
                if not url:
                    continue
                ext          = os.path.splitext(url.split('?')[0])[1] or '.jpg'
                photographer = photo.get('photographer', 'Pexels')
                page_url     = photo.get('url', '')
                credit       = f"Photo by {photographer} on Pexels"
                results.append((url, ext, query, credit, page_url, 'Pexels'))
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                print("  [429/pexels] Hit rate limit, will back off...")
            else:
                print(f"  [WARN/pexels] '{q}': {e}")
        except Exception as e:
            print(f"  [WARN/pexels] '{q}': {e}")
    return results

# =========================================================================
#                       Pixabay image search
# =========================================================================
PIXABAY_URL   = 'https://pixabay.com/api/'
_rate_pixabay = RateLimiter('pixabay')

def search_pixabay(query, count=5):
    results = []
    queries = [query]
    words = query.split()
    if len(words) > 1:
        queries.append(words[-1])
    if len(words) > 1:
        queries.append(words[0])
    for q in queries:
        if len(results) >= count:
            break
        try:
            _rate_pixabay.wait()
            r = SESSION.get(PIXABAY_URL,
                            params={'key': PIXABAY_KEY, 'q': q,
                                    'per_page': min(count + 5, 50),
                                    'image_type': 'photo', 'safesearch': 'true'},
                            timeout=20)
            r.raise_for_status()
            _rate_pixabay.wait(r.headers)
            for hit in r.json().get('hits', []):
                if len(results) >= count:
                    break
                url = hit.get('largeImageURL', '') or hit.get('webformatURL', '')
                if not url:
                    continue
                ext      = os.path.splitext(url.split('?')[0])[1] or '.jpg'
                user     = hit.get('user', 'Pixabay')
                page_url = hit.get('pageURL', '') or f"https://pixabay.com/photos/?id={hit.get('id', '')}"
                credit   = f"Image by {user} on Pixabay"
                results.append((url, ext, query, credit, page_url, 'Pixabay'))
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                print("  [429/pixabay] Hit rate limit, will back off...")
            else:
                print(f"  [WARN/pixabay] '{q}': {e}")
        except Exception as e:
            print(f"  [WARN/pixabay] '{q}': {e}")
    return results

# =========================================================================
#                       Download photo file
# =========================================================================
_rate_dl = RateLimiter('dl')

def download_photo(url, out_path):
    try:
        _rate_dl.wait()
        r = SESSION.get(url, stream=True, timeout=60)
        _rate_dl.wait(r.headers)
        if r.status_code == 200:
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(2 * 1024 * 1024):
                    if chunk:
                        f.write(chunk)
            return True
    except Exception as e:
        print(f"  [WARN/dl] {out_path.name}: {e}")
    return False

# =========================================================================
#                       Per-animal processor
# =========================================================================
def process_animal(slug, name, category):
    # ---- Check progress: skip if already done ----
    if _is_done(slug, category):
        _incr_progress(name, 'skipped')
        return

    photos_dir = BASE_DIR / category / slug / 'photos'
    photos_dir.mkdir(parents=True, exist_ok=True)

    # ---- 1. Delete existing photos ----
    deleted = 0
    for f in list(photos_dir.iterdir()):
        if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
            f.unlink()
            deleted += 1
    if deleted:
        print(f"[{name}] Deleted {deleted} existing photo(s)")

    # ---- 2. Search Pexels ----
    print(f"[{name}] Searching Pexels...")
    pexels = _cached_search('pexels', name, search_pexels, 5)

    # ---- 3. Search Pixabay if needed ----
    pixabay = []
    need = 5 - len(pexels)
    if need > 0:
        print(f"[{name}] Pexels: {len(pexels)} found, trying Pixabay for {need} more...")
        pixabay = _cached_search('pixabay', name, search_pixabay, need)
    else:
        print(f"[{name}] Pexels: {len(pexels)} found (enough)")

    all_photos = (pexels + pixabay)[:10]

    if not all_photos:
        print(f"[{name}] x No photos found on either source.")
        _mark_done(slug, category, 0)
        _incr_progress(name, 'failed')
        return

    # ---- 4. Download ----
    source_info = []
    downloaded  = 0
    for idx, (url, ext, title, credit, page_url, source) in enumerate(all_photos):
        out_path = photos_dir / f"{slug}-{source.lower()}-{idx + 1}{ext}"
        print(f"[{name}] Downloading {idx+1}/{len(all_photos)} ({source})...")
        if download_photo(url, out_path):
            downloaded += 1
            source_info.append({
                'title':    title,
                'credit':   credit,
                'source':   source,
                'url':      url,
                'page_url': page_url,
            })

    # ---- 5. Save sources.json + mark progress ----
    if source_info:
        with open(photos_dir / 'sources.json', 'w', encoding='utf-8') as f:
            json.dump(source_info, f, ensure_ascii=False, indent=4)
        _incr_progress(name, 'done')
    else:
        print(f"[{name}] x All downloads failed.")
        _incr_progress(name, 'failed')

    _mark_done(slug, category, downloaded)

# =========================================================================
#                               Main
# =========================================================================
def main():
    parser = argparse.ArgumentParser(
        description='Pexels + Pixabay Photo Downloader (resumable)')
    parser.add_argument('--workers',        type=int, default=1,
                        help='Parallel workers (default 1)')
    parser.add_argument('--batch-size',     type=int, default=0,
                        help='Max animals per batch (0 = all). Pause 1h between batches.')
    parser.add_argument('--dry-run',        action='store_true',
                        help='Only list what would be done')
    parser.add_argument('--animal',         type=str, default=None,
                        help='Process a single animal slug (e.g. "lion")')
    parser.add_argument('--reset-progress', action='store_true',
                        help='Clear all progress tracking (restart from scratch)')
    parser.add_argument('--status',         action='store_true',
                        help='Show progress summary without downloading')
    args = parser.parse_args()

    # ---- Reset progress if requested ----
    if args.reset_progress:
        if PROGRESS_PATH.exists():
            PROGRESS_PATH.unlink()
            print("Progress reset. Next run will start from the beginning.")
        else:
            print("No progress file found — nothing to reset.")
        return

    animals = discover_animals()
    if args.animal:
        animals = [a for a in animals if a[0] == args.animal]
        if not animals:
            print(f"Error: animal '{args.animal}' not found in library")
            return

    # ---- Calculate progress ----
    done_count = sum(1 for slug, _, cat in animals if _is_done(slug, cat))
    pending    = len(animals) - done_count
    cached     = sum(1 for k in _SEARCH_CACHE if not k.startswith('__'))

    # ---- Status-only mode ----
    if args.status:
        print('=' * 60)
        print(' Photo Download Progress')
        print('=' * 60)
        print(f"  Total animals:    {len(animals)}")
        print(f"  Completed:        {done_count}")
        print(f"  Remaining:        {pending}")
        print(f"  Search cache:     {cached} queries cached")
        print()
        if pending > 0:
            print("  Remaining animals:")
            for slug, name, cat in animals:
                if not _is_done(slug, cat):
                    print(f"    - {name:35s} ({cat})")
        return

    # ---- Print summary ----
    print('=' * 60)
    print(' AnimalVerse - Pexels + Pixabay Photo Downloader')
    print(f' Total animals: {len(animals)}')
    print(f' Already done:  {done_count}  |  Pending: {pending}')
    print(f' Workers:       {args.workers}')
    print(f' Search cache:  {cached} queries cached')
    print(f' Strategy:      5 Pexels + fallback Pixabay = up to 10/animal')
    if args.batch_size:
        batches = (pending + args.batch_size - 1) // args.batch_size
        print(f' Batches:       {args.batch_size}/batch, ~{batches} batch(es) needed')
    if args.dry_run:
        print(' *** DRY RUN — no files will be changed ***')
    print('=' * 60)

    if args.dry_run:
        for slug, name, cat in animals:
            status = 'DONE' if _is_done(slug, cat) else 'PENDING'
            photos_dir = BASE_DIR / cat / slug / 'photos'
            existing = []
            if photos_dir.exists():
                existing = [f.name for f in photos_dir.iterdir()
                           if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.gif')]
            print(f"  [{status:7}] {name:35s} ({cat}) — delete {len(existing)} photos, download 10 new")
        print(f"\nDry-run complete: {len(animals)} animals ({done_count} done, {pending} pending).")
        return

    # ---- Filter to pending only ----
    pending_animals = [(s, n, c) for s, n, c in animals if not _is_done(s, n, c)]
    if not pending_animals:
        print("All animals are already downloaded! Use --reset-progress to redo.")
        return

    print(f"\nProcessing {len(pending_animals)} pending animals...")

    # ---- Init live progress ----
    _init_progress(len(pending_animals))

    # ---- Execute ----
    start = time.time()
    if args.batch_size:
        for i in range(0, len(pending_animals), args.batch_size):
            batch = pending_animals[i:i + args.batch_size]
            total_batches = (len(pending_animals) + args.batch_size - 1) // args.batch_size
            print(f'\n--- Batch {i // args.batch_size + 1}/{total_batches} ({len(batch)} animals) ---')
            with ThreadPoolExecutor(max_workers=args.workers) as ex:
                ex.map(lambda a: process_animal(*a), batch)
            if i + args.batch_size < len(pending_animals):
                wait = 3600  # 1 hour
                print(f'\nBatch done. Waiting {wait}s for rate-limit reset (Ctrl+C to stop, resume later)...')
                try:
                    time.sleep(wait)
                except KeyboardInterrupt:
                    with _PROG['lock']:
                        sofar = _PROG['done'] + _PROG['skipped'] + _PROG['failed']
                        elap  = time.time() - _PROG['start']
                    print()
                    print('=' * 50)
                    print('  ⏸  PAUSED — progress saved')
                    print(f'  Completed: {_PROG["done"]}  |  Skipped: {_PROG["skipped"]}')
                    print(f'  Failed:    {_PROG["failed"]}  |  Total:   {_PROG["total"]}')
                    if sofar > 0:
                        print(f'  Progress:  {sofar}/{_PROG["total"]} ({sofar/_PROG["total"]*100:.0f}%)')
                        print(f'  Elapsed:   {elap:.0f}s')
                    print()
                    print('  Re-run to continue where you left off.')
                    print('=' * 50)
                    return
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            ex.map(lambda a: process_animal(*a), pending_animals)

    # ---- Done ----
    elapsed = time.time() - start
    newly_done = sum(1 for slug, _, cat in pending_animals if _is_done(slug, cat))
    print('=' * 60)
    print(f"Finished! {newly_done}/{len(pending_animals)} done in {elapsed:.0f}s.")
    print(f"Total completed: {done_count + newly_done}/{len(animals)}")
    print()
    print("IMPORTANT — Attribution requirements:")
    print("  Pexels:  Display 'Photos provided by Pexels' in your app +")
    print("           individual 'Photo by <photographer> on Pexels' credits")
    print("           saved in each animal's photos/sources.json")
    print("  Pixabay: Display 'Images by <user> on Pixabay' credits")
    print("           also saved in photos/sources.json")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        with _PROG['lock']:
            sofar = _PROG['done'] + _PROG['skipped'] + _PROG['failed']
            elap  = time.time() - _PROG['start']
        print()
        print('=' * 50)
        print('  ⏸  PAUSED — progress saved')
        print(f'  Completed: {_PROG["done"]}  |  Skipped: {_PROG["skipped"]}')
        print(f'  Failed:    {_PROG["failed"]}  |  Total:   {_PROG["total"]}')
        if sofar > 0:
            print(f'  Progress:  {sofar}/{_PROG["total"]} ({sofar/_PROG["total"]*100:.0f}%)')
            print(f'  Elapsed:   {elap:.0f}s')
        print()
        print('  Re-run to continue where you left off.')
        print('=' * 50)
