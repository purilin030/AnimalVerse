"""
AnimalVerse - Reptiles & Amphibians Downloader
===============================================
Downloads photos (iNaturalist) and videos (yt-dlp) for new
Reptiles and Amphibians species to fill gaps in the library.

Current status:
  Reptiles (6):    anaconda, chameleon, crocodile, komodo-dragon, sea-turtle, turtle
  Amphibians (2):  frog, tree-frog

This script adds MORE species to balance the collection.

Usage:
    python scripts/download_reptiles_amphibians.py                    # download all new species
    python scripts/download_reptiles_amphibians.py --photos 5         # 5 photos per animal
    python scripts/download_reptiles_amphibians.py --videos 2         # 2 videos per animal
    python scripts/download_reptiles_amphibians.py --photos-only      # skip video downloads
    python scripts/download_reptiles_amphibians.py --videos-only      # skip photo downloads
    python scripts/download_reptiles_amphibians.py --list              # just list what would be added
    python scripts/download_reptiles_amphibians.py --species iguana    # download specific species only

Requirements:
    pip install pyinaturalist requests
    yt-dlp (for video downloads)
"""

import os
import sys
import json
import time
import argparse
import subprocess
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# ══════════════════════════════════════════════════════════════════
#  NEW SPECIES TO ADD
# ══════════════════════════════════════════════════════════════════

# Reptiles already in library (won't re-download)
EXISTING_REPTILES = {'anaconda', 'chameleon', 'crocodile', 'komodo-dragon', 'sea-turtle', 'turtle'}

# Amphibians already in library
EXISTING_AMPHIBIANS = {'frog', 'tree-frog'}

# ── New Reptiles to add ─────────────────────────────────────────
NEW_REPTILES = {
    'iguana':               {'sci': 'Iguana iguana',              'region': 'South America', 'query': 'iguana wildlife'},
    'king-cobra':           {'sci': 'Ophiophagus hannah',         'region': 'Asia',          'query': 'king cobra snake wildlife'},
    'rattlesnake':          {'sci': 'Crotalus atrox',             'region': 'North America', 'query': 'rattlesnake wildlife'},
    'gecko':                {'sci': 'Gekko gecko',                'region': 'Asia',          'query': 'gecko lizard wildlife'},
    'alligator':            {'sci': 'Alligator mississippiensis', 'region': 'North America', 'query': 'alligator wildlife'},
    'gila-monster':         {'sci': 'Heloderma suspectum',        'region': 'North America', 'query': 'gila monster lizard'},
    'python':               {'sci': 'Python bivittatus',          'region': 'Asia',          'query': 'burmese python snake wildlife'},
    'galapagos-tortoise':   {'sci': 'Chelonoidis niger',          'region': 'South America', 'query': 'galapagos giant tortoise'},
    'monitor-lizard':       {'sci': 'Varanus salvator',           'region': 'Asia',          'query': 'monitor lizard wildlife'},
    'coral-snake':          {'sci': 'Micrurus fulvius',           'region': 'North America', 'query': 'coral snake wildlife'},
    'tuatara':              {'sci': 'Sphenodon punctatus',        'region': 'Australia',     'query': 'tuatara reptile new zealand'},
    'leatherback-turtle':   {'sci': 'Dermochelys coriacea',       'region': 'Ocean',         'query': 'leatherback sea turtle'},
}

# ── New Amphibians to add ───────────────────────────────────────
NEW_AMPHIBIANS = {
    'salamander':           {'sci': 'Salamandra salamandra',      'region': 'Europe',        'query': 'fire salamander wildlife'},
    'axolotl':              {'sci': 'Ambystoma mexicanum',        'region': 'North America', 'query': 'axolotl aquatic'},
    'poison-dart-frog':     {'sci': 'Dendrobates tinctorius',     'region': 'South America', 'query': 'poison dart frog wildlife'},
    'newt':                 {'sci': 'Triturus cristatus',         'region': 'Europe',        'query': 'great crested newt'},
    'toad':                 {'sci': 'Bufo bufo',                  'region': 'Europe',        'query': 'common toad wildlife'},
    'caecilian':            {'sci': 'Gymnophiona',                'region': 'South America', 'query': 'caecilian amphibian'},
    'glass-frog':           {'sci': 'Centrolenidae',              'region': 'South America', 'query': 'glass frog transparent'},
    'bullfrog':             {'sci': 'Lithobates catesbeianus',    'region': 'North America', 'query': 'american bullfrog wildlife'},
    'hellbender':           {'sci': 'Cryptobranchus alleganiensis','region': 'North America', 'query': 'hellbender salamander'},
    'red-eyed-tree-frog':   {'sci': 'Agalychnis callidryas',     'region': 'South America', 'query': 'red eyed tree frog'},
}

# ── Paths ───────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
VALID_EXT = {'.jpg', '.jpeg', '.png', '.webp'}

# ── Thread-safe utilities ───────────────────────────────────────
_print_lock = Lock()
_api_lock = Lock()
_last_api_time = 0.0

def p(*args, **kwargs):
    """Thread-safe print with Windows encoding safety."""
    with _print_lock:
        try:
            print(*args, **kwargs, flush=True)
        except UnicodeEncodeError:
            text = ' '.join(str(a) for a in args)
            safe = text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(
                sys.stdout.encoding or 'utf-8', errors='replace'
            )
            print(safe, **{k: v for k, v in kwargs.items() if k != 'end'}, flush=True)

def _rate_limit(min_interval=1.0):
    """Ensure minimum interval between API calls."""
    global _last_api_time
    with _api_lock:
        elapsed = time.time() - _last_api_time
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        _last_api_time = time.time()


# ══════════════════════════════════════════════════════════════════
#  PHOTOS: iNaturalist (research-grade, accurate)
# ══════════════════════════════════════════════════════════════════

def _resolve_taxon_id(search_term):
    """Look up iNaturalist taxon ID by scientific or common name."""
    _rate_limit(1.0)
    try:
        r = requests.get('https://api.inaturalist.org/v1/taxa', params={
            'q': search_term, 'per_page': 5, 'is_active': 'true',
        }, headers={'User-Agent': 'AnimalVerse/2.0'}, timeout=15)

        if r.status_code != 200:
            return None, None

        results = r.json().get('results', [])
        if not results:
            return None, None

        # Prefer exact scientific name match
        for taxon in results:
            if taxon.get('name', '').lower() == search_term.lower():
                return taxon['id'], taxon.get('preferred_common_name', taxon['name'])

        best = results[0]
        return best['id'], best.get('preferred_common_name', best['name'])

    except Exception as e:
        p(f'      [!] Taxon lookup failed: {e}')
        return None, None


def download_photos(slug, sci_name, output_dir, count=10, img_size='medium'):
    """Download research-grade photos from iNaturalist."""
    # Resolve taxon
    taxon_id = None
    for term in [sci_name, slug.replace('-', ' ')]:
        taxon_id, matched_name = _resolve_taxon_id(term)
        if taxon_id:
            p(f'      Taxon: {term} -> ID {taxon_id} ({matched_name})')
            break

    if not taxon_id:
        p(f'      [!] Could not find taxon for {slug}')
        return 0

    # Fetch observations
    _rate_limit(1.0)
    try:
        r = requests.get('https://api.inaturalist.org/v1/observations', params={
            'taxon_id': taxon_id,
            'quality_grade': 'research',
            'photos': 'true',
            'per_page': min(count * 3, 200),
            'order_by': 'votes',
            'order': 'desc',
            'photo_licensed': 'true',
        }, headers={'User-Agent': 'AnimalVerse/2.0'}, timeout=20)

        if r.status_code != 200:
            p(f'      [!] API error {r.status_code}')
            return 0

        results = r.json().get('results', [])
        p(f'      Found {len(results)} research-grade observations')

    except Exception as e:
        p(f'      [!] API request failed: {e}')
        return 0

    if not results:
        return 0

    # Download
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    seen = set()

    for obs in results:
        if downloaded >= count:
            break

        photos = obs.get('photos', [])
        if not photos:
            continue

        photo_url = photos[0].get('url', '')
        if not photo_url:
            continue

        for size_token in ('square', 'small', 'medium', 'large', 'original'):
            if size_token in photo_url:
                photo_url = photo_url.replace(size_token, img_size)
                break

        if photo_url in seen:
            continue
        seen.add(photo_url)

        for attempt in range(3):
            try:
                _rate_limit(0.5)
                resp = requests.get(photo_url, timeout=25,
                                    headers={'User-Agent': 'AnimalVerse/2.0'})
                if resp.status_code == 200 and len(resp.content) > 5000:
                    ct = resp.headers.get('Content-Type', '')
                    ext = '.png' if 'png' in ct else '.webp' if 'webp' in ct else '.jpg'
                    filepath = output_dir / f'{slug}-photo-{downloaded + 1}{ext}'
                    with open(filepath, 'wb') as f:
                        f.write(resp.content)
                    downloaded += 1
                    p(f'      [OK] [{downloaded}/{count}] {filepath.name} ({len(resp.content) // 1024}KB)')
                    break
                else:
                    if attempt < 2:
                        time.sleep(2)
            except Exception:
                if attempt < 2:
                    time.sleep(2)

    return downloaded


# ══════════════════════════════════════════════════════════════════
#  VIDEOS: yt-dlp (YouTube search & download)
# ══════════════════════════════════════════════════════════════════

def download_videos(slug, query, output_dir, count=2):
    """Download short video clips via yt-dlp YouTube search."""
    output_dir.mkdir(parents=True, exist_ok=True)

    p(f'      Searching YouTube: "{query}"')

    # Search
    try:
        result = subprocess.run([
            'yt-dlp', '--flat-playlist', '--dump-json',
            f'ytsearch{count + 2}:{query}',
        ], capture_output=True, text=True, timeout=60)

        if result.returncode != 0 or not result.stdout.strip():
            p(f'      [!] No video results')
            return 0

        urls = []
        for line in result.stdout.strip().split('\n')[:count]:
            try:
                data = json.loads(line)
                urls.append(f'https://youtube.com/watch?v={data["id"]}')
            except (json.JSONDecodeError, KeyError):
                continue

        if not urls:
            p(f'      [!] Could not extract video URLs')
            return 0

    except FileNotFoundError:
        p(f'      [!] yt-dlp not found. Install with: pip install yt-dlp')
        return 0
    except subprocess.TimeoutExpired:
        p(f'      [!] YouTube search timed out')
        return 0

    # Download each video
    downloaded = 0
    for idx, url in enumerate(urls):
        out_path = str(output_dir / f'{slug}-video-{idx + 1}.mp4')
        p(f'      Downloading video {idx + 1}/{count} from {url}')
        try:
            dl = subprocess.run([
                'yt-dlp',
                '-f', 'best[height<=1080]',
                '--max-filesize', '100M',
                '--socket-timeout', '30',
                '--retries', '10',
                '--no-part',
                '--merge-output-format', 'mp4',
                '-o', out_path,
                url,
            ], capture_output=True, text=True, timeout=300)
            if dl.returncode == 0:
                downloaded += 1
                p(f'      [OK] {slug}-video-{idx + 1}.mp4')
            else:
                p(f'      [!] Video download failed: {dl.stderr[:100]}')
        except subprocess.TimeoutExpired:
            p(f'      [!] Video download timed out')
        time.sleep(1)

    return downloaded


# ══════════════════════════════════════════════════════════════════
#  MAIN PROCESSING
# ══════════════════════════════════════════════════════════════════

def process_species(slug, info, category_dir, photo_count, video_count,
                    photos_only, videos_only, img_size):
    """Download photos + videos for one species."""
    category = category_dir.name  # "Reptiles" or "Amphibians"
    animal_dir = category_dir / slug
    photos_dir = animal_dir / 'photos'
    videos_dir = animal_dir / 'videos'

    display_name = slug.replace('-', ' ').title()
    p(f'\n  {"=" * 50}')
    p(f'  {display_name} ({category})')
    p(f'  Scientific: {info["sci"]}')
    p(f'  Region: {info["region"]}')
    p(f'  {"=" * 50}')

    photo_result = 0
    video_result = 0

    # Photos
    if not videos_only:
        p(f'    [Photos] iNaturalist (research-grade)')
        photo_result = download_photos(slug, info['sci'], photos_dir, photo_count, img_size)
        p(f'    [Photos] Downloaded: {photo_result}/{photo_count}')

    # Videos
    if not photos_only:
        p(f'    [Videos] YouTube via yt-dlp')
        video_result = download_videos(slug, info['query'], videos_dir, video_count)
        p(f'    [Videos] Downloaded: {video_result}/{video_count}')

    return slug, display_name, photo_result, video_result


def main():
    parser = argparse.ArgumentParser(
        description='AnimalVerse - Download Reptiles & Amphibians',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--photos', type=int, default=10,
                        help='Photos per species (default: 10)')
    parser.add_argument('--videos', type=int, default=2,
                        help='Videos per species (default: 2)')
    parser.add_argument('--workers', type=int, default=1,
                        help='Parallel workers (default: 1, recommended for videos)')
    parser.add_argument('--size', default='medium',
                        choices=['square', 'small', 'medium', 'large', 'original'],
                        help='Photo size (default: medium)')
    parser.add_argument('--photos-only', action='store_true',
                        help='Download photos only, skip videos')
    parser.add_argument('--videos-only', action='store_true',
                        help='Download videos only, skip photos')
    parser.add_argument('--list', action='store_true',
                        help='List all species that would be added, without downloading')
    parser.add_argument('--species', nargs='*',
                        help='Download specific species only (by slug)')
    parser.add_argument('--include-existing', action='store_true',
                        help='Also re-download for existing species')
    args = parser.parse_args()

    reptiles_dir = BASE_DIR / 'Reptiles'
    amphibians_dir = BASE_DIR / 'Amphibians'

    # Build task list
    tasks = []

    # Filter species if specified
    if args.species:
        species_filter = set(s.lower() for s in args.species)
    else:
        species_filter = None

    # New Reptiles
    for slug, info in sorted(NEW_REPTILES.items()):
        if species_filter and slug not in species_filter:
            continue
        tasks.append((slug, info, reptiles_dir))

    # New Amphibians
    for slug, info in sorted(NEW_AMPHIBIANS.items()):
        if species_filter and slug not in species_filter:
            continue
        tasks.append((slug, info, amphibians_dir))

    # Optionally include existing species for re-download
    if args.include_existing:
        existing_reptile_info = {
            'anaconda':       {'sci': 'Eunectes murinus',            'region': 'South America', 'query': 'anaconda snake wildlife'},
            'chameleon':      {'sci': 'Furcifer pardalis',           'region': 'Africa',        'query': 'chameleon wildlife'},
            'crocodile':      {'sci': 'Crocodylidae',                'region': 'Africa',        'query': 'crocodile wildlife'},
            'komodo-dragon':  {'sci': 'Varanus komodoensis',         'region': 'Asia',          'query': 'komodo dragon wildlife'},
            'sea-turtle':     {'sci': 'Chelonia mydas',              'region': 'Ocean',         'query': 'sea turtle wildlife'},
            'turtle':         {'sci': 'Chelonia mydas',              'region': 'Ocean',         'query': 'turtle wildlife'},
        }
        existing_amphibian_info = {
            'frog':           {'sci': 'Anura',                       'region': 'Global',        'query': 'frog wildlife'},
            'tree-frog':      {'sci': 'Hylidae',                     'region': 'South America', 'query': 'tree frog wildlife'},
        }
        for slug, info in sorted(existing_reptile_info.items()):
            if species_filter and slug not in species_filter:
                continue
            tasks.append((slug, info, reptiles_dir))
        for slug, info in sorted(existing_amphibian_info.items()):
            if species_filter and slug not in species_filter:
                continue
            tasks.append((slug, info, amphibians_dir))

    if not tasks:
        p('No species to download.')
        sys.exit(0)

    # ── List mode ────────────────────────────────────────────────
    if args.list:
        print(f'\n{"=" * 60}')
        print(f'  Species to add ({len(tasks)} total)')
        print(f'{"=" * 60}')

        reptile_tasks = [(s, i) for s, i, d in tasks if d.name == 'Reptiles']
        amphibian_tasks = [(s, i) for s, i, d in tasks if d.name == 'Amphibians']

        if reptile_tasks:
            print(f'\n  Reptiles ({len(reptile_tasks)}):')
            for slug, info in reptile_tasks:
                name = slug.replace('-', ' ').title()
                existing = '  [EXISTS]' if slug in EXISTING_REPTILES else ''
                print(f'    - {name:<25} ({info["sci"]:<35}) [{info["region"]}]{existing}')

        if amphibian_tasks:
            print(f'\n  Amphibians ({len(amphibian_tasks)}):')
            for slug, info in amphibian_tasks:
                name = slug.replace('-', ' ').title()
                existing = '  [EXISTS]' if slug in EXISTING_AMPHIBIANS else ''
                print(f'    - {name:<25} ({info["sci"]:<35}) [{info["region"]}]{existing}')

        print(f'\n  After adding:')
        total_r = len(EXISTING_REPTILES) + len([s for s, _, d in tasks if d.name == 'Reptiles' and s not in EXISTING_REPTILES])
        total_a = len(EXISTING_AMPHIBIANS) + len([s for s, _, d in tasks if d.name == 'Amphibians' and s not in EXISTING_AMPHIBIANS])
        print(f'    Reptiles:   {len(EXISTING_REPTILES)} -> {total_r}')
        print(f'    Amphibians: {len(EXISTING_AMPHIBIANS)} -> {total_a}')
        print(f'{"=" * 60}\n')
        return

    # ── Download mode ────────────────────────────────────────────
    print(f'\n{"=" * 60}')
    print(f'  AnimalVerse - Reptiles & Amphibians Downloader')
    print(f'{"=" * 60}')
    print(f'  Species:   {len(tasks)}')
    print(f'  Photos:    {args.photos} per species ({args.size})')
    print(f'  Videos:    {args.videos} per species')
    print(f'  Workers:   {args.workers}')
    print(f'  Mode:      {"photos only" if args.photos_only else "videos only" if args.videos_only else "photos + videos"}')
    print(f'  Output:    {BASE_DIR}')
    print(f'{"=" * 60}')

    start_time = time.time()
    results = []

    if args.workers <= 1:
        for slug, info, category_dir in tasks:
            result = process_species(
                slug, info, category_dir, args.photos, args.videos,
                args.photos_only, args.videos_only, args.size
            )
            results.append(result)
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_species, slug, info, category_dir,
                    args.photos, args.videos,
                    args.photos_only, args.videos_only, args.size
                ): slug
                for slug, info, category_dir in tasks
            }
            for future in as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as e:
                    p(f'  [X] {futures[future]} failed: {e}')

    # ── Summary ──────────────────────────────────────────────────
    elapsed = time.time() - start_time
    total_photos = sum(r[2] for r in results)
    total_videos = sum(r[3] for r in results)
    successful = [r for r in results if r[2] > 0 or r[3] > 0]
    failed = [r for r in results if r[2] == 0 and r[3] == 0]

    print(f'\n{"=" * 60}')
    print(f'  DOWNLOAD COMPLETE')
    print(f'{"=" * 60}')
    print(f'  Time:       {elapsed:.1f}s')
    print(f'  Photos:     {total_photos} total')
    print(f'  Videos:     {total_videos} total')
    print(f'  Successful: {len(successful)}/{len(results)} species')
    if failed:
        print(f'  Failed:     {len(failed)} species')
        for slug, name, _, _ in failed:
            print(f'    - {name} ({slug})')

    # Count final totals
    reptiles_final = set()
    amphibians_final = set()
    for d in (BASE_DIR / 'Reptiles').iterdir() if (BASE_DIR / 'Reptiles').exists() else []:
        if d.is_dir():
            reptiles_final.add(d.name)
    for d in (BASE_DIR / 'Amphibians').iterdir() if (BASE_DIR / 'Amphibians').exists() else []:
        if d.is_dir():
            amphibians_final.add(d.name)

    print(f'\n  Library totals:')
    print(f'    Reptiles:   {len(reptiles_final)} species')
    print(f'    Amphibians: {len(amphibians_final)} species')

    print(f'\n  [TIP] Run rebuild_videos_json.py to update videos.json:')
    print(f'    python scripts/rebuild_videos_json.py')
    print(f'{"=" * 60}\n')


if __name__ == '__main__':
    main()
