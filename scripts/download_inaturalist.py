"""
AnimalVerse - iNaturalist Photo Downloader
==========================================
Downloads verified wildlife photos from iNaturalist (primary)
with Wikimedia Commons as fallback.

Why iNaturalist?
  - Research-grade observations are community-verified (species ID is correct)
  - Searching by scientific name eliminates "anaconda → person" type errors
  - Free, no API key required
  - High-quality wildlife photography

Usage:
    python scripts/download_inaturalist.py                         # all animals, 10 photos each
    python scripts/download_inaturalist.py --count 5               # 5 photos per animal
    python scripts/download_inaturalist.py --animals Anaconda Fox  # specific animals only
    python scripts/download_inaturalist.py --workers 4             # 4 parallel workers
    python scripts/download_inaturalist.py --skip-existing         # skip animals that already have enough photos
    python scripts/download_inaturalist.py --size large            # image size: square/small/medium/large/original
    python scripts/download_inaturalist.py --fallback              # enable Wikimedia Commons fallback
    python scripts/download_inaturalist.py --dry-run               # show what would be downloaded without downloading

Requirements:
    pip install pyinaturalist requests
"""

import os
import sys
import json
import time
import argparse
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# ══════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════

# All animals in the project (sorted, deduplicated)
ALL_ANIMALS = sorted(set([
    'Lion', 'Elephant', 'Tiger', 'Eagle', 'Wolf', 'Giraffe',
    'Penguin', 'Dolphin', 'Koala', 'Panda', 'Fox', 'Rabbit',
    'Monkey', 'Parrot', 'Bear', 'Frog', 'Owl', 'Horse',
    'Butterfly', 'Turtle', 'Whale', 'Peacock', 'Hedgehog', 'Kangaroo',
    'Polar Bear', 'Sea Turtle', 'Chameleon',
    'Octopus', 'Tree Frog', 'Great White Shark', 'Shark',
    'Kitten', 'Cat', 'Bald Eagle', 'Lioness', 'Macaw', 'Toucan',
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

# ── Complete scientific name mapping ────────────────────────────
# Using scientific names ensures accurate species-specific results.
# For example: "Anaconda" → "Eunectes murinus" won't return person photos.
SCIENTIFIC_NAMES = {
    'albatross': 'Diomedeidae',
    'anaconda': 'Eunectes murinus',
    'arctic-tern': 'Sterna paradisaea',
    'asian-elephant': 'Elephas maximus',
    'badger': 'Meles meles',
    'bald-eagle': 'Haliaeetus leucocephalus',
    'bear': 'Ursidae',
    'beaver': 'Castor canadensis',
    'bison': 'Bison bison',
    'blue-whale': 'Balaenoptera musculus',
    'brown-bear': 'Ursus arctos',
    'butterfly': 'Lepidoptera',
    'capybara': 'Hydrochoerus hydrochaeris',
    'cat': 'Felis catus',
    'chameleon': 'Furcifer pardalis',
    'cheetah': 'Acinonyx jubatus',
    'chimpanzee': 'Pan troglodytes',
    'clownfish': 'Amphiprioninae',
    'coral': 'Anthozoa',
    'coyote': 'Canis latrans',
    'crocodile': 'Crocodylidae',
    'dingo': 'Canis lupus dingo',
    'dolphin': 'Tursiops truncatus',
    'eagle': 'Aquila chrysaetos',
    'elephant': 'Loxodonta africana',
    'elk': 'Cervus canadensis',
    'emu': 'Dromaius novaehollandiae',
    'european-bison': 'Bison bonasus',
    'flamingo': 'Phoenicopterus roseus',
    'fox': 'Vulpes vulpes',
    'frog': 'Anura',
    'giant-panda': 'Ailuropoda melanoleuca',
    'giraffe': 'Giraffa camelopardalis',
    'gorilla': 'Gorilla gorilla',
    'great-white-shark': 'Carcharodon carcharias',
    'grizzly-bear': 'Ursus arctos horribilis',
    'hedgehog': 'Erinaceus europaeus',
    'hippopotamus': 'Hippopotamus amphibius',
    'horse': 'Equus ferus caballus',
    'howler-monkey': 'Alouatta',
    'jaguar': 'Panthera onca',
    'jellyfish': 'Scyphozoa',
    'kangaroo': 'Macropus',
    'kitten': 'Felis catus',
    'koala': 'Phascolarctos cinereus',
    'komodo-dragon': 'Varanus komodoensis',
    'kookaburra': 'Dacelo novaeguineae',
    'krill': 'Euphausiacea',
    'leopard-seal': 'Hydrurga leptonyx',
    'lion': 'Panthera leo',
    'lioness': 'Panthera leo',
    'llama': 'Lama glama',
    'lynx': 'Lynx lynx',
    'macaw': 'Ara macao',
    'manta-ray': 'Manta birostris',
    'monkey': 'Cercopithecidae',
    'moose': 'Alces alces',
    'mountain-lion': 'Puma concolor',
    'octopus': 'Enteroctopus dofleini',
    'orangutan': 'Pongo pygmaeus',
    'orca': 'Orcinus orca',
    'otter': 'Lutrinae',
    'owl': 'Strigiformes',
    'panda': 'Ailuropoda melanoleuca',
    'parrot': 'Psittaciformes',
    'peacock': 'Pavo cristatus',
    'penguin': 'Aptenodytes forsteri',
    'piranha': 'Serrasalmus',
    'platypus': 'Ornithorhynchus anatinus',
    'polar-bear': 'Ursus maritimus',
    'rabbit': 'Oryctolagus cuniculus',
    'raccoon': 'Procyon lotor',
    'red-fox': 'Vulpes vulpes',
    'red-panda': 'Ailurus fulgens',
    'reindeer': 'Rangifer tarandus',
    'rhinoceros': 'Ceratotherium simum',
    'sambar-deer': 'Rusa unicolor',
    'sea-turtle': 'Chelonia mydas',
    'seahorse': 'Hippocampus',
    'seal': 'Pinnipedia',
    'shark': 'Carcharodon carcharias',
    'sloth': 'Bradypus tridactylus',
    'snow-leopard': 'Panthera uncia',
    'snow-petrel': 'Pagodroma nivea',
    'squid': 'Teuthida',
    'sun-bear': 'Helarctos malayanus',
    'tasmanian-devil': 'Sarcophilus harrisii',
    'tiger': 'Panthera tigris',
    'toucan': 'Ramphastos toco',
    'tree-frog': 'Hylidae',
    'turtle': 'Chelonia mydas',
    'vampire-bat': 'Desmodus rotundus',
    'wallaby': 'Macropus agilis',
    'whale': 'Balaenoptera musculus',
    'wild-boar': 'Sus scrofa',
    'wolf': 'Canis lupus',
    'wombat': 'Vombatus ursinus',
    'zebra': 'Equus quagga',
}

# ── Paths ───────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
VALID_EXT = {'.jpg', '.jpeg', '.png', '.webp'}

# ── Thread-safe printing ────────────────────────────────────────
_print_lock = Lock()
_api_lock = Lock()
_last_api_time = 0.0
_stats = {'downloaded': 0, 'skipped': 0, 'failed': 0, 'fallback': 0}
_stats_lock = Lock()

def p(*args, **kwargs):
    """Thread-safe print with Windows encoding safety."""
    with _print_lock:
        try:
            print(*args, **kwargs, flush=True)
        except UnicodeEncodeError:
            # Fallback: encode with replacement for Windows terminals (cp950 etc.)
            text = ' '.join(str(a) for a in args)
            safe = text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(
                sys.stdout.encoding or 'utf-8', errors='replace'
            )
            print(safe, **{k: v for k, v in kwargs.items() if k != 'end'}, flush=True)

def slug(name):
    """Convert animal name to filesystem-friendly slug."""
    return name.lower().replace(' ', '-')


# ══════════════════════════════════════════════════════════════════
#  SOURCE 1: iNaturalist (primary — most accurate)
# ══════════════════════════════════════════════════════════════════

def _rate_limit(min_interval=1.0):
    """Ensure minimum interval between API calls (thread-safe)."""
    global _last_api_time
    with _api_lock:
        elapsed = time.time() - _last_api_time
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        _last_api_time = time.time()


def _resolve_taxon_id(search_term):
    """
    Look up iNaturalist taxon ID by scientific or common name.
    Returns (taxon_id, taxon_name) or (None, None).
    """
    _rate_limit(1.0)
    try:
        url = 'https://api.inaturalist.org/v1/taxa'
        params = {
            'q': search_term,
            'per_page': 5,
            'is_active': 'true',
        }
        r = requests.get(url, params=params,
                         headers={'User-Agent': 'AnimalVerse/2.0'},
                         timeout=15)
        if r.status_code != 200:
            return None, None

        data = r.json()
        results = data.get('results', [])
        if not results:
            return None, None

        # Pick the best match — prefer exact scientific name match
        for taxon in results:
            name = taxon.get('name', '').lower()
            if name == search_term.lower():
                return taxon['id'], taxon.get('preferred_common_name', taxon['name'])

        # Otherwise just use the first result
        best = results[0]
        return best['id'], best.get('preferred_common_name', best['name'])

    except Exception as e:
        p(f'    ⚠ Taxon lookup failed for "{search_term}": {e}')
        return None, None


def download_from_inaturalist(animal, output_dir, count=10, img_size='medium', dry_run=False):
    """
    Download research-grade photos from iNaturalist.

    Args:
        animal: Common name (e.g. "Anaconda")
        output_dir: Path to save photos
        count: Number of photos to download
        img_size: One of 'square', 'small', 'medium', 'large', 'original'
        dry_run: If True, only show what would be downloaded

    Returns:
        Number of photos downloaded
    """
    animal_slug = slug(animal)
    sci_name = SCIENTIFIC_NAMES.get(animal_slug)

    # Step 1: Resolve taxon ID (scientific name first, then common name)
    taxon_id = None
    search_terms = []
    if sci_name:
        search_terms.append(sci_name)
    search_terms.append(animal)

    for term in search_terms:
        taxon_id, matched_name = _resolve_taxon_id(term)
        if taxon_id:
            p(f'    🔬 Taxon found: {term} → ID {taxon_id} ({matched_name})')
            break

    if not taxon_id:
        p(f'    ⚠ Could not find taxon for {animal}')
        return 0

    # Step 2: Fetch research-grade observations with photos
    _rate_limit(1.0)
    try:
        url = 'https://api.inaturalist.org/v1/observations'
        params = {
            'taxon_id': taxon_id,
            'quality_grade': 'research',
            'photos': 'true',
            'per_page': min(count * 3, 200),  # fetch extra in case some fail
            'order_by': 'votes',
            'order': 'desc',
            'photo_licensed': 'true',  # only photos with open licenses
        }
        r = requests.get(url, params=params,
                         headers={'User-Agent': 'AnimalVerse/2.0'},
                         timeout=20)
        if r.status_code != 200:
            p(f'    ⚠ API error {r.status_code} for {animal}')
            return 0

        data = r.json()
        results = data.get('results', [])
        p(f'    📋 Found {len(results)} research-grade observations')

    except Exception as e:
        p(f'    ⚠ API request failed for {animal}: {e}')
        return 0

    if not results:
        return 0

    # Step 3: Download photos
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    seen_urls = set()

    for obs in results:
        if downloaded >= count:
            break

        photos = obs.get('photos', [])
        if not photos:
            continue

        # Use the first (best) photo from each observation
        photo = photos[0]
        photo_url = photo.get('url', '')
        if not photo_url:
            continue

        # Convert to requested size
        # iNaturalist URL format: .../photos/XXXXX/square.jpeg
        # Replace 'square' with desired size
        for size_token in ('square', 'small', 'medium', 'large', 'original'):
            if size_token in photo_url:
                photo_url = photo_url.replace(size_token, img_size)
                break

        if photo_url in seen_urls:
            continue
        seen_urls.add(photo_url)

        if dry_run:
            p(f'    [DRY] Would download: {photo_url[:80]}...')
            downloaded += 1
            continue

        # Actually download the image
        for attempt in range(3):
            try:
                _rate_limit(0.5)
                resp = requests.get(photo_url, timeout=25,
                                    headers={'User-Agent': 'AnimalVerse/2.0'})
                if resp.status_code == 200 and len(resp.content) > 5000:
                    # Determine extension from content-type or URL
                    content_type = resp.headers.get('Content-Type', '')
                    if 'png' in content_type:
                        ext = '.png'
                    elif 'webp' in content_type:
                        ext = '.webp'
                    else:
                        ext = '.jpg'

                    filepath = output_dir / f'{animal_slug}-photo-{downloaded + 1}{ext}'
                    with open(filepath, 'wb') as f:
                        f.write(resp.content)
                    downloaded += 1
                    p(f'    ✔ [{downloaded}/{count}] {filepath.name} '
                      f'({len(resp.content) // 1024}KB)')
                    break
                else:
                    if attempt < 2:
                        time.sleep(2)
            except Exception as e:
                if attempt < 2:
                    time.sleep(2)
                else:
                    p(f'    ⚠ Download failed: {e}')

    return downloaded


# ══════════════════════════════════════════════════════════════════
#  SOURCE 2: Wikimedia Commons (fallback)
# ══════════════════════════════════════════════════════════════════

COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

def download_from_commons(animal, output_dir, count=10, start_index=0, dry_run=False):
    """
    Fallback: Download photos from Wikimedia Commons.
    Uses scientific name when available for better accuracy.

    Args:
        animal: Common name
        output_dir: Path to save photos
        count: Number of photos needed
        start_index: Starting index for file naming (to avoid overwriting iNat photos)
        dry_run: If True, only show what would be downloaded

    Returns:
        Number of photos downloaded
    """
    animal_slug = slug(animal)
    sci_name = SCIENTIFIC_NAMES.get(animal_slug)
    search_term = sci_name if sci_name else animal

    p(f'    🔄 Fallback: Wikimedia Commons (search: "{search_term}")')

    # Step 1: Search Commons for files
    _rate_limit(2.0)
    try:
        r = requests.get(COMMONS_API, params={
            'action': 'query',
            'list': 'search',
            'srsearch': f'{search_term} -icon -logo -map -flag -distribution -diagram',
            'srnamespace': 6,  # File namespace
            'format': 'json',
            'srlimit': count + 10,
        }, headers={'User-Agent': 'AnimalVerse/2.0'}, timeout=15)

        if r.status_code != 200:
            p(f'    ⚠ Commons API error {r.status_code}')
            return 0

        results = r.json().get('query', {}).get('search', [])
        p(f'    📋 Commons: {len(results)} files found')

    except Exception as e:
        p(f'    ⚠ Commons search failed: {e}')
        return 0

    if not results:
        return 0

    # Step 2: Get image URLs and download
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0

    for res in results:
        if downloaded >= count:
            break

        title = res.get('title', '')
        if not title:
            continue

        # Skip non-photo files
        low = title.lower()
        if any(k in low for k in ('icon', 'logo', 'map', 'flag', 'distribution',
                                   'diagram', 'range', 'stamp', 'coat')):
            continue
        ext_check = title.rsplit('.', 1)[-1].lower() if '.' in title else ''
        if ext_check in ('gif', 'svg', 'ogg', 'pdf', 'djvu', 'tiff', 'tif'):
            continue

        # Get the actual file URL
        _rate_limit(2.0)
        try:
            r2 = requests.get(COMMONS_API, params={
                'action': 'query',
                'titles': title,
                'prop': 'imageinfo',
                'iiprop': 'url|size|mime',
                'format': 'json',
            }, headers={'User-Agent': 'AnimalVerse/2.0'}, timeout=15)

            pages = r2.json().get('query', {}).get('pages', {})
            file_url = None
            for page in pages.values():
                if 'imageinfo' in page and page['imageinfo']:
                    info = page['imageinfo'][0]
                    mime = info.get('mime', '')
                    if mime.startswith('image/') and mime not in ('image/svg+xml', 'image/gif'):
                        file_url = info.get('url', '')
                        break

            if not file_url:
                continue

        except Exception:
            continue

        if dry_run:
            p(f'    [DRY] Would download from Commons: {file_url[:80]}...')
            downloaded += 1
            continue

        # Download the file
        for attempt in range(2):
            try:
                _rate_limit(1.0)
                resp = requests.get(file_url, timeout=25,
                                    headers={'User-Agent': 'AnimalVerse/2.0'})
                if resp.status_code == 200 and len(resp.content) > 3000:
                    ext = Path(file_url.split('?')[0]).suffix.lower() or '.jpg'
                    if ext not in VALID_EXT:
                        ext = '.jpg'
                    idx = start_index + downloaded + 1
                    filepath = output_dir / f'{animal_slug}-photo-{idx}{ext}'
                    with open(filepath, 'wb') as f:
                        f.write(resp.content)
                    downloaded += 1
                    p(f'    ✔ [Commons {downloaded}] {filepath.name} '
                      f'({len(resp.content) // 1024}KB)')
                    break
            except Exception:
                if attempt == 0:
                    time.sleep(2)

    return downloaded


# ══════════════════════════════════════════════════════════════════
#  MAIN PROCESSING
# ══════════════════════════════════════════════════════════════════

def count_existing_photos(animal_dir):
    """Count existing valid photo files in a directory."""
    if not animal_dir.exists():
        return 0
    return sum(1 for f in animal_dir.iterdir()
               if f.is_file() and f.suffix.lower() in VALID_EXT)


def process_animal(animal, count, img_size, skip_existing, use_fallback, dry_run):
    """Process a single animal: download photos from iNaturalist + optional fallback."""
    animal_slug = slug(animal)
    photos_dir = BASE_DIR / animal_slug / 'photos'

    p(f'\n{"─" * 55}')
    p(f'▶  {animal} ({animal_slug})')
    p(f'{"─" * 55}')

    # Check existing photos
    existing = count_existing_photos(photos_dir)
    if skip_existing and existing >= count:
        p(f'    ⏭ Already has {existing} photos (need {count}), skipping')
        with _stats_lock:
            _stats['skipped'] += 1
        return animal, 'skipped', existing

    needed = count - existing if skip_existing else count
    if skip_existing and existing > 0:
        p(f'    📂 Has {existing} photos, need {needed} more')

    # Source 1: iNaturalist
    p(f'  📸 Source: iNaturalist (research-grade)')
    inat_count = download_from_inaturalist(animal, photos_dir, needed, img_size, dry_run)

    # Source 2: Wikimedia Commons (fallback if not enough)
    commons_count = 0
    still_needed = needed - inat_count
    if use_fallback and still_needed > 0:
        p(f'    ⚡ iNaturalist gave {inat_count}/{needed}, trying Commons...')
        commons_count = download_from_commons(
            animal, photos_dir, still_needed,
            start_index=existing + inat_count, dry_run=dry_run
        )
        with _stats_lock:
            _stats['fallback'] += 1

    total = inat_count + commons_count
    if total > 0:
        with _stats_lock:
            _stats['downloaded'] += total
        status = 'ok'
    else:
        with _stats_lock:
            _stats['failed'] += 1
        status = 'failed'

    p(f'  ✅ {animal}: {total} new photos '
      f'(iNat: {inat_count}, Commons: {commons_count})')
    return animal, status, total


def main():
    parser = argparse.ArgumentParser(
        description='AnimalVerse iNaturalist Photo Downloader',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_inaturalist.py                          # all animals, 10 photos
  python download_inaturalist.py --count 5 --size large   # 5 large photos
  python download_inaturalist.py --animals Anaconda Fox   # specific animals
  python download_inaturalist.py --skip-existing           # don't re-download
  python download_inaturalist.py --fallback               # use Commons if iNat is insufficient
  python download_inaturalist.py --dry-run                # preview without downloading
        """)
    parser.add_argument('--count', type=int, default=10,
                        help='Number of photos per animal (default: 10)')
    parser.add_argument('--workers', type=int, default=2,
                        help='Parallel workers (default: 2, max recommended: 3)')
    parser.add_argument('--animals', nargs='*',
                        help='Specific animals to download (default: all)')
    parser.add_argument('--size', default='medium',
                        choices=['square', 'small', 'medium', 'large', 'original'],
                        help='Image size (default: medium)')
    parser.add_argument('--skip-existing', action='store_true',
                        help='Skip animals that already have enough photos')
    parser.add_argument('--fallback', action='store_true',
                        help='Use Wikimedia Commons as fallback when iNaturalist is insufficient')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be downloaded without actually downloading')
    args = parser.parse_args()

    # Determine which animals to process
    if args.animals:
        # Match user input to ALL_ANIMALS (case-insensitive)
        animal_lookup = {a.lower(): a for a in ALL_ANIMALS}
        animals = []
        for name in args.animals:
            matched = animal_lookup.get(name.lower())
            if matched:
                animals.append(matched)
            else:
                # Try partial match
                matches = [a for a in ALL_ANIMALS if name.lower() in a.lower()]
                if matches:
                    animals.extend(matches)
                    p(f'ℹ️  "{name}" matched: {", ".join(matches)}')
                else:
                    p(f'⚠  Unknown animal: "{name}" (skipped)')
        if not animals:
            p('❌ No valid animals specified.')
            sys.exit(1)
    else:
        animals = ALL_ANIMALS

    # Header
    print(f'\n{"═" * 60}')
    print(f'  AnimalVerse iNaturalist Photo Downloader')
    print(f'{"═" * 60}')
    print(f'  Animals:       {len(animals)}')
    print(f'  Photos each:   {args.count}')
    print(f'  Image size:    {args.size}')
    print(f'  Workers:       {args.workers}')
    print(f'  Skip existing: {"Yes" if args.skip_existing else "No"}')
    print(f'  Fallback:      {"Wikimedia Commons" if args.fallback else "None"}')
    print(f'  Dry run:       {"Yes" if args.dry_run else "No"}')
    print(f'  Output:        {BASE_DIR}')
    print(f'{"═" * 60}\n')

    start_time = time.time()
    results = []

    if args.workers <= 1:
        # Sequential mode
        for animal in animals:
            result = process_animal(
                animal, args.count, args.size,
                args.skip_existing, args.fallback, args.dry_run
            )
            results.append(result)
    else:
        # Parallel mode
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_animal,
                    animal, args.count, args.size,
                    args.skip_existing, args.fallback, args.dry_run
                ): animal
                for animal in animals
            }
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    animal_name = futures[future]
                    p(f'❌ [{animal_name}] Unexpected error: {e}')
                    with _stats_lock:
                        _stats['failed'] += 1

    # Summary
    elapsed = time.time() - start_time
    ok_animals = [r for r in results if r[1] == 'ok']
    failed_animals = [r for r in results if r[1] == 'failed']
    skipped_animals = [r for r in results if r[1] == 'skipped']

    print(f'\n{"═" * 60}')
    print(f'  DOWNLOAD COMPLETE')
    print(f'{"═" * 60}')
    print(f'  Time:          {elapsed:.1f}s')
    print(f'  Total photos:  {_stats["downloaded"]}')
    print(f'  Successful:    {len(ok_animals)} animals')
    print(f'  Skipped:       {len(skipped_animals)} animals')
    print(f'  Failed:        {len(failed_animals)} animals')
    if _stats['fallback'] > 0:
        print(f'  Used fallback: {_stats["fallback"]} animals')
    print(f'  Output:        {BASE_DIR}')

    if failed_animals:
        print(f'\n  ⚠ Failed animals:')
        for name, _, _ in failed_animals:
            print(f'    - {name}')

    print(f'{"═" * 60}\n')


if __name__ == '__main__':
    main()
