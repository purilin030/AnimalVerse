"""
AnimalVerse - Pexels/Pixabay Remaining Videos (Resumable, 720p)
===============================================================
Download 3 videos per remaining animal from Pexels (primary)
with Pixabay fallback. Based on the proven download logic.

Usage:
    python scripts/download_remaining_pexels.py
    python scripts/download_remaining_pexels.py --status
    python scripts/download_remaining_pexels.py --animal clownfish
    python scripts/download_remaining_pexels.py --batch-size 10
    python scripts/download_remaining_pexels.py --no-compress
"""

import os
import json
import time
import subprocess
import threading
import requests
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ---------------------------------------------------------------------------
#  Config
# ---------------------------------------------------------------------------
PEXELS_KEY  = 'oVvphPsPC87YaoaA6xcfGnBu6fqbU8oBdWuH2QNEnhyIGWzXKl9i4vef'
PIXABAY_KEY = '56625859-d8439ce3f14f92dc804edddce'

BASE_DIR       = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
PROGRESS_PATH  = Path(__file__).resolve().parent / 'remaining_pexels_progress.json'
CACHE_PATH     = Path(__file__).resolve().parent / 'remaining_pexels_cache.json'
CACHE_TTL      = 86400

# 34 个剩下没有视频的动物
REMAINING = [
    # Fish
    ('clownfish',        'Clownfish',        'Fish'),
    ('great-white-shark','Great White Shark', 'Fish'),
    ('manta-ray',        'Manta Ray',        'Fish'),
    ('piranha',          'Piranha',          'Fish'),
    ('seahorse',         'Seahorse',         'Fish'),
    ('shark',            'Shark',            'Fish'),
    # Invertebrates
    ('butterfly',        'Butterfly',        'Invertebrates'),
    ('coral',            'Coral',            'Invertebrates'),
    ('jellyfish',        'Jellyfish',        'Invertebrates'),
    ('krill',            'Krill',            'Invertebrates'),
    ('octopus',          'Octopus',          'Invertebrates'),
    ('squid',            'Squid',            'Invertebrates'),
    # Mammals
    ('blue-whale',       'Blue Whale',       'Mammals'),
    ('dolphin',          'Dolphin',          'Mammals'),
    ('howler-monkey',    'Howler Monkey',    'Mammals'),
    ('kitten',           'Kitten',           'Mammals'),
    ('leopard-seal',     'Leopard Seal',     'Mammals'),
    ('orca',             'Orca',             'Mammals'),
    ('platypus',         'Platypus',         'Mammals'),
    ('seal',             'Seal',             'Mammals'),
    ('whale',            'Whale',            'Mammals'),
    # Reptiles
    ('alligator',        'Alligator',        'Reptiles'),
    ('coral-snake',      'Coral Snake',      'Reptiles'),
    ('galapagos-tortoise','Galapagos Tortoise','Reptiles'),
    ('gecko',            'Gecko',            'Reptiles'),
    ('gila-monster',     'Gila Monster',     'Reptiles'),
    ('iguana',           'Iguana',           'Reptiles'),
    ('king-cobra',       'King Cobra',       'Reptiles'),
    ('leatherback-turtle','Leatherback Turtle','Reptiles'),
    ('monitor-lizard',   'Monitor Lizard',   'Reptiles'),
    ('python',           'Python',           'Reptiles'),
    ('rattlesnake',      'Rattlesnake',      'Reptiles'),
    ('sea-turtle',       'Sea Turtle',       'Reptiles'),
    ('tuatara',          'Tuatara',          'Reptiles'),
]

# ---------------------------------------------------------------------------
#  Rate-limited HTTP
# ---------------------------------------------------------------------------
SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'AnimalVerse/1.0 (educational FYP)'})

_rate_cfg = {
    'pexels':  {'lock': threading.Lock(), 'last': [0.0], 'interval': 1.0},
    'pixabay': {'lock': threading.Lock(), 'last': [0.0], 'interval': 2.0},
    'dl':      {'lock': threading.Lock(), 'last': [0.0], 'interval': 0.5},
}

def _throttled_get(src, url, **kwargs):
    cfg = _rate_cfg[src]
    for attempt in range(6):
        with cfg['lock']:
            gap = time.monotonic() - cfg['last'][0]
            if gap < cfg['interval']:
                time.sleep(cfg['interval'] - gap)
            cfg['last'][0] = time.monotonic()
            r = SESSION.get(url, **kwargs)
        if r.status_code == 429:
            wait = min(int(r.headers.get('Retry-After', 10)), 30)
            print(f"  [429/{src}] Rate limited, waiting {wait}s (attempt {attempt+1}/6)...")
            time.sleep(wait + 1)
            continue
        return r
    raise RuntimeError(f"[{src}] Too many retries")

# ---------------------------------------------------------------------------
#  Search cache
# ---------------------------------------------------------------------------
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

def _cached_search(src, query, searcher, count):
    key = f"{src}:{query}:{count}"
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

# ---------------------------------------------------------------------------
#  Pexels search
# ---------------------------------------------------------------------------
PEXELS_URL = 'https://api.pexels.com/videos/search'

def search_pexels(query, count=3):
    results = []
    queries = [query]
    words = query.split()
    if len(words) > 1:
        queries += [words[-1], words[0]]
    for q in queries:
        if len(results) >= count:
            break
        try:
            r = _throttled_get('pexels', PEXELS_URL,
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
                vid_id = vid.get('id', '')
                photographer = vid.get('user', {}).get('name', 'Pexels')
                page_url = vid.get('url', '') or f"https://www.pexels.com/video/{vid_id}/"
                results.append((
                    files[0]['link'],                     # url
                    f"{query} - {vid_id}",                # title
                    photographer,                          # uploader
                    'Pexels',                              # source
                    page_url,                              # page_url
                    f"Video by {photographer} on Pexels",  # credit
                ))
        except Exception as e:
            print(f"  [WARN/pexels] '{q}': {e}")
    return results

# ---------------------------------------------------------------------------
#  Pixabay search
# ---------------------------------------------------------------------------
PIXABAY_URL = 'https://pixabay.com/api/videos/'

def search_pixabay(query, count=3):
    results = []
    queries = [query]
    words = query.split()
    if len(words) > 1:
        queries += [words[-1], words[0]]
    for q in queries:
        if len(results) >= count:
            break
        try:
            r = _throttled_get('pixabay', PIXABAY_URL,
                               params={'key': PIXABAY_KEY, 'q': q,
                                       'per_page': min(count + 5, 20), 'video_type': 'film'},
                               timeout=20)
            r.raise_for_status()
            for hit in r.json().get('hits', []):
                if len(results) >= count:
                    break
                vids = hit.get('videos', {})
                for size in ('large', 'medium', 'small', 'tiny'):
                    url = vids.get(size, {}).get('url', '')
                    if url:
                        hit_id = hit.get('id', '')
                        user = hit.get('user', 'Pixabay')
                        page_url = hit.get('pageURL', '') or f"https://pixabay.com/videos/?id={hit_id}"
                        results.append((
                            url,
                            f"{query} - {hit_id}",
                            user,
                            'Pixabay',
                            page_url,
                            f"Video by {user} on Pixabay",
                        ))
                        break
        except Exception as e:
            print(f"  [WARN/pixabay] '{q}': {e}")
    return results

# ---------------------------------------------------------------------------
#  FFmpeg 720p
# ---------------------------------------------------------------------------
def _ffmpeg_ok():
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False

_HAS_FFMPEG = _ffmpeg_ok()

def _compress(in_path, out_path):
    try:
        subprocess.run([
            'ffmpeg', '-y',
            '-i', str(in_path),
            '-vf', 'scale=-2:720',
            '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
            '-c:a', 'aac', '-b:a', '96k',
            '-movflags', '+faststart',
            '-loglevel', 'error',
            str(out_path),
        ], check=True, timeout=300)
        return out_path.exists() and out_path.stat().st_size > 0
    except Exception as e:
        print(f"  [WARN] ffmpeg: {e}")
        return False

# ---------------------------------------------------------------------------
#  Progress
# ---------------------------------------------------------------------------
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

def _is_done(slug):
    with _PROG_L:
        return _PROG.get(slug, {}).get('status') == 'done'

def _mark_done(slug, n=0):
    with _PROG_L:
        _PROG[slug] = {'status': 'done', 'ts': time.time(), 'downloaded': n}
        _save_progress(_PROG)

# Live progress
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

# ---------------------------------------------------------------------------
#  Per-animal
# ---------------------------------------------------------------------------
def process_animal(slug, name, category, no_compress=False):
    if _is_done(slug):
        _incr_p(name, 'skip')
        return

    vid_dir = BASE_DIR / category / slug / 'videos'
    vid_dir.mkdir(parents=True, exist_ok=True)

    # Clean empty sources.json
    if not list(vid_dir.glob('*.mp4')):
        sf = vid_dir / 'sources.json'
        if sf.exists():
            sf.unlink(missing_ok=True)

    # Search Pexels first
    print(f"[{name}] Searching Pexels...")
    videos = _cached_search('pexels', name, search_pexels, 3)

    # Pixabay fallback
    need = 3 - len(videos)
    if need > 0:
        print(f"[{name}] Pexels: {len(videos)} found, trying Pixabay for {need} more...")
        videos += _cached_search('pixabay', name, search_pixabay, need)
    else:
        print(f"[{name}] Pexels: {len(videos)} found (enough)")

    if not videos:
        print(f"[{name}] x No videos found.")
        _mark_done(slug, 0)
        _incr_p(name, 'fail')
        return

    # Download (try more candidates than needed)
    source_info = []
    downloaded = 0
    for idx, (url, title, uploader, source, page_url, credit) in enumerate(videos):
        if downloaded >= 3:
            break

        print(f"[{name}] Downloading {idx+1}/{len(videos)} (saved {downloaded}/3) from {source}...")
        out_path = vid_dir / f"{slug}-{source.lower()}-{downloaded+1}.mp4"
        tmp_path = out_path.with_suffix('.tmp.mp4')

        ok = False
        try:
            r = _throttled_get('dl', url, stream=True, timeout=60)
            if r.status_code != 200:
                continue
            with open(tmp_path, 'wb') as f:
                for chunk in r.iter_content(2 * 1024 * 1024):
                    if chunk:
                        f.write(chunk)
            if tmp_path.stat().st_size >= 1024:
                ok = True
            else:
                tmp_path.unlink(missing_ok=True)
        except Exception:
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
            continue

        if not ok:
            continue

        # Compress to 720p
        if _HAS_FFMPEG and not no_compress:
            print(f"  └─ Compressing to 720p...")
            if _compress(tmp_path, out_path):
                tmp_path.unlink(missing_ok=True)
            else:
                tmp_path.rename(out_path)
        else:
            tmp_path.rename(out_path)

        source_info.append({
            'title': title, 'uploader': uploader,
            'source': source, 'url': url,
            'page_url': page_url, 'credit': credit,
        })
        downloaded += 1

    if source_info:
        with open(vid_dir / 'sources.json', 'w', encoding='utf-8') as f:
            json.dump(source_info, f, ensure_ascii=False, indent=4)
        print(f"[{name}] Done! ({downloaded}/3 videos)")
    else:
        print(f"[{name}] x All downloads failed.")

    status = 'done' if downloaded > 0 else 'fail'
    _mark_done(slug, downloaded)
    _incr_p(name, status)

# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=1)
    parser.add_argument('--batch-size', type=int, default=0,
                        help='Max per batch (0=all). Pause 1h between for Pexels reset.')
    parser.add_argument('--no-compress', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
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

    animals = REMAINING[:]
    if args.animal:
        animals = [a for a in animals if a[0] == args.animal]
        if not animals:
            print(f"'{args.animal}' not found.")
            return

    done_count = sum(1 for s, _, _ in animals if _is_done(s))
    pending = len(animals) - done_count
    cached = sum(1 for k in _CACHE if not k.startswith('__'))

    if args.status:
        print('=' * 50)
        print(' Pexels/Pixabay Remaining — Progress')
        print('=' * 50)
        print(f'  Total:  {len(animals)}')
        print(f'  Done:   {done_count}')
        print(f'  Left:   {pending}')
        print(f'  Cache:  {cached} queries')
        if pending:
            print('\n  Remaining:')
            for s, n, c in animals:
                if not _is_done(s):
                    print(f'    {n:25s} ({c})')
        return

    print('=' * 50)
    print(' Pexels/Pixabay Remaining Videos')
    print(f'  Animals: {len(animals)}  |  Done: {done_count}  |  Pending: {pending}')
    print(f'  Workers: {args.workers}')
    if args.batch_size:
        print(f'  Batches: {args.batch_size}/batch, ~{(pending+args.batch_size-1)//args.batch_size} batches')
    print(f'  720p:    {"ON" if _HAS_FFMPEG and not args.no_compress else "OFF"}')
    if args.dry_run:
        print('  *** DRY RUN ***')
    print('=' * 50)

    if args.dry_run:
        for s, n, c in animals:
            st = 'DONE' if _is_done(s) else 'TODO'
            print(f'  [{st:4}] {n:25s} ({c})')
        return

    pending_list = [(s, n, c) for s, n, c in animals if not _is_done(s)]
    if not pending_list:
        print("All done! Use --reset-progress to redo.")
        return

    _init_p(len(pending_list))
    start = time.time()

    def _run_batch(batch):
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            ex.map(lambda a: process_animal(*a, args.no_compress), batch)

    if args.batch_size:
        for i in range(0, len(pending_list), args.batch_size):
            batch = pending_list[i:i+args.batch_size]
            nb = (len(pending_list)+args.batch_size-1)//args.batch_size
            print(f'\n--- Batch {i//args.batch_size+1}/{nb} ({len(batch)} animals) ---')
            _run_batch(batch)
            if i+args.batch_size < len(pending_list):
                print('\nBatch done. Waiting 1h for rate reset (Ctrl+C to stop)...')
                try:
                    time.sleep(3600)
                except KeyboardInterrupt:
                    print('\n⏸ Paused! Re-run to continue.')
                    return
    else:
        _run_batch(pending_list)

    new_done = sum(1 for s, _, _ in pending_list if _is_done(s))
    print('=' * 50)
    print(f' Done! {new_done}/{len(pending_list)} in {time.time()-start:.0f}s.')
    print(' Run: python scripts/rebuild_videos_json.py')

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
