#!/usr/bin/env python3
"""
AnimalVerse - Dynamic Video Metadata Rebuilder
==============================================
Scans the assets/images/library/ directory, dynamically detects all animal folders
containing videos/ and photos/, queries taxonomic classes and GPS coordinates via
the GBIF API, and outputs a complete data/videos.json file.
"""

import os
import json
import urllib.request
import urllib.parse
import time
import random
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
LIBRARY_DIR = BASE_DIR / 'assets' / 'images' / 'library'
VIDEOS_JSON_PATH = BASE_DIR / 'data' / 'videos.json'
CACHE_PATH = Path(__file__).resolve().parent / 'gbif_cache.json'

# Load / Save cache
gbif_cache = {}
if CACHE_PATH.exists():
    try:
        with open(CACHE_PATH, 'r', encoding='utf-8') as f:
            gbif_cache = json.load(f)
        print(f"Loaded {len(gbif_cache)} cached animal entries.")
    except Exception as e:
        print(f"Warning: Failed to load cache: {e}")

def save_cache():
    try:
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(gbif_cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: Failed to save cache: {e}")

# Species mapping fallback / lookup (if GBIF name match is fuzzy)
species_map = {
    'lion': 'Panthera leo',
    'elephant': 'Loxodonta africana',
    'parrot': 'Psittaciformes',
    'eagle': 'Aquila chrysaetos',
    'penguin': 'Aptenodytes forsteri',
    'flamingo': 'Phoenicopterus roseus',
    'polar-bear': 'Ursus maritimus',
    'dolphin': 'Tursiops truncatus',
    'sea-turtle': 'Chelonia mydas',
    'turtle': 'Chelonia mydas',
    'chameleon': 'Furcifer pardalis',
    'octopus': 'Enteroctopus dofleini',
    'tree-frog': 'Hylidae',
    'frog': 'Anura',
    'great-white-shark': 'Carcharodon carcharias',
    'shark': 'Carcharodon carcharias',
    'kitten': 'Felis catus',
    'cat': 'Felis catus',
    'bald-eagle': 'Haliaeetus leucocephalus',
    'lioness': 'Panthera leo',
    'macaw': 'Ara macao',
    'toucan': 'Ramphastos toco',
    'tiger': 'Panthera tigris',
    'red-panda': 'Ailurus fulgens',
    'peacock': 'Pavo cristatus',
    'komodo-dragon': 'Varanus komodoensis',
    'giant-panda': 'Ailuropoda melanoleuca',
    'snow-leopard': 'Panthera uncia',
    'asian-elephant': 'Elephas maximus',
    'sun-bear': 'Helarctos malayanus',
    'giraffe': 'Giraffa camelopardalis',
    'cheetah': 'Acinonyx jubatus',
    'zebra': 'Equus quagga',
    'hippopotamus': 'Hippopotamus amphibius',
    'rhinoceros': 'Ceratotherium simum',
    'gorilla': 'Gorilla gorilla',
    'chimpanzee': 'Pan troglodytes',
    'brown-bear': 'Ursus arctos',
    'red-fox': 'Vulpes vulpes',
    'wild-boar': 'Sus scrofa',
    'european-bison': 'Bison bonasus',
    'lynx': 'Lynx lynx',
    'reindeer': 'Rangifer tarandus',
    'badger': 'Meles meles',
    'grizzly-bear': 'Ursus arctos horribilis',
    'moose': 'Alces alces',
    'coyote': 'Canis latrans',
    'bison': 'Bison bison',
    'raccoon': 'Procyon lotor',
    'beaver': 'Castor canadensis',
    'mountain-lion': 'Puma concolor',
    'elk': 'Cervus canadensis',
    'jaguar': 'Panthera onca',
    'sloth': 'Bradypus tridactylus',
    'anaconda': 'Eunectes murinus',
    'capybara': 'Hydrochoerus hydrochaeris',
    'llama': 'Lama glama',
    'piranha': 'Serrasalmus',
    'vampire-bat': 'Desmodus rotundus',
    'howler-monkey': 'Alouatta',
    'kangaroo': 'Macropus',
    'koala': 'Phascolarctos cinereus',
    'platypus': 'Ornithorhynchus anatinus',
    'wombat': 'Vombatus ursinus',
    'tasmanian-devil': 'Sarcophilus harrisii',
    'dingo': 'Canis lupus dingo',
    'emu': 'Dromaius novaehollandiae',
    'kookaburra': 'Dacelo novaeguineae',
    'wallaby': 'Macropus agilis',
    'seal': 'Pinnipedia',
    'blue-whale': 'Balaenoptera musculus',
    'orca': 'Orcinus orca',
    'albatross': 'Diomedeidae',
    'leopard-seal': 'Hydrurga leptonyx',
    'krill': 'Euphausiacea',
    'snow-petrel': 'Pagodroma nivea',
    'manta-ray': 'Manta birostris',
    'clownfish': 'Amphiprioninae',
    'jellyfish': 'Scyphozoa',
    'seahorse': 'Hippocampus',
    'coral': 'Anthozoa',
    'sambar-deer': 'Rusa unicolor',
    'orangutan': 'Pongo pygmaeus',
    'wolf': 'Canis lupus',
    'otter': 'Lutrinae',
    'crocodile': 'Crocodylidae',
    'squid': 'Teuthida',
    'arctic-tern': 'Sterna paradisaea'
}

# Subdirectory to Region mapping fallback
region_fallback = {
    'Africa': ['lion', 'elephant', 'giraffe', 'cheetah', 'zebra', 'hippopotamus', 'rhinoceros', 'gorilla', 'chimpanzee', 'flamingo', 'lioness'],
    'Asia': ['tiger', 'orangutan', 'red-panda', 'peacock', 'komodo-dragon', 'giant-panda', 'snow-leopard', 'asian-elephant', 'sun-bear', 'sambar-deer'],
    'Europe': ['brown-bear', 'wolf', 'red-fox', 'eagle', 'wild-boar', 'european-bison', 'lynx', 'reindeer', 'badger', 'otter'],
    'North America': ['bald-eagle', 'grizzly-bear', 'moose', 'coyote', 'bison', 'raccoon', 'beaver', 'mountain-lion', 'elk'],
    'South America': ['jaguar', 'sloth', 'toucan', 'anaconda', 'capybara', 'llama', 'macaw', 'piranha', 'vampire-bat', 'howler-monkey'],
    'Australia': ['kangaroo', 'koala', 'platypus', 'wombat', 'tasmanian-devil', 'dingo', 'emu', 'kookaburra', 'wallaby'],
    'Antarctica': ['penguin', 'seal', 'blue-whale', 'orca', 'albatross', 'leopard-seal', 'krill', 'snow-petrel', 'squid', 'arctic-tern'],
    'Ocean': ['dolphin', 'shark', 'octopus', 'sea-turtle', 'manta-ray', 'clownfish', 'jellyfish', 'seahorse', 'coral']
}

def get_region_from_slug(slug):
    slug_lower = slug.lower()
    for reg, slugs in region_fallback.items():
        if slug_lower in slugs:
            return reg
    return 'Ocean' # default fallback

def get_category_from_class(classname, ordername, slug):
    c = (classname or '').lower()
    o = (ordername or '').lower()
    s = slug.lower()

    # Aquatic keywords override everything
    aquatic_keywords = {'whale', 'dolphin', 'seal', 'shark', 'fish', 'octopus', 'squid', 'jellyfish', 'coral', 'clownfish', 'manta-ray', 'seahorse', 'krill', 'piranha', 'platypus', 'sea-turtle'}
    for kw in aquatic_keywords:
        if kw in s:
            return 'aquatic'

    # GBIF class-based classification
    if c == 'mammalia':
        return 'mammals'
    elif c == 'aves':
        return 'birds'
    elif c == 'reptilia':
        return 'reptiles'
    elif c == 'amphibia':
        return 'amphibians'
    elif c in ('actinopterygii', 'elasmobranchii', 'cephalopoda', 'anthozoa', 'scyphozoa', 'bivalvia'):
        return 'aquatic'

    # Slug-based fallback when GBIF data is missing or unreliable
    reptile_keywords = {'anaconda', 'chameleon', 'crocodile', 'komodo', 'lizard', 'snake', 'turtle', 'tortoise', 'gecko', 'iguana', 'python', 'boa', 'viper'}
    for kw in reptile_keywords:
        if kw in s:
            return 'reptiles'

    amphibian_keywords = {'frog', 'toad', 'salamander', 'newt'}
    for kw in amphibian_keywords:
        if kw in s:
            return 'amphibians'

    bird_keywords = {'eagle', 'hawk', 'owl', 'parrot', 'penguin', 'flamingo', 'peacock', 'toucan', 'macaw', 'kookaburra', 'albatross', 'tern', 'petrel', 'emu'}
    for kw in bird_keywords:
        if kw in s:
            return 'birds'

    return 'mammals'  # default fallback

def get_mp4_duration_str(filepath):
    try:
        with open(filepath, 'rb') as f:
            data = f.read(102400)  # Read first 100KB to find mvhd
            idx = data.find(b'mvhd')
            if idx != -1:
                version = data[idx + 4]
                if version == 0:
                    time_scale = int.from_bytes(data[idx + 16:idx + 20], 'big')
                    duration = int.from_bytes(data[idx + 20:idx + 24], 'big')
                else:
                    time_scale = int.from_bytes(data[idx + 28:idx + 32], 'big')
                    duration = int.from_bytes(data[idx + 32:idx + 40], 'big')
                
                if time_scale > 0 and duration > 0:
                    seconds = duration / time_scale
                    total_seconds = int(seconds)
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    seconds = total_seconds % 60
                    
                    if hours > 0:
                        return f"{hours}:{minutes:02d}:{seconds:02d}"
                    else:
                        return f"{minutes}:{seconds:02d}"
    except Exception as e:
        pass
    return "0:10"  # fallback

def query_gbif(slug):
    # Check cache first
    if slug in gbif_cache:
        return gbif_cache[slug]
        
    common_name = slug.replace('-', ' ').title()
    sci_name = species_map.get(slug, common_name)
    
    metadata = {
        'category': 'mammals',
        'location': {
            'name': 'Unknown Location',
            'lat': 0.0,
            'lng': 0.0,
            'region': get_region_from_slug(slug)
        }
    }
    
    try:
        # Step 1: Species Match
        url = f"https://api.gbif.org/v1/species/match?name={urllib.parse.quote(sci_name)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            
        species_key = data.get('speciesKey')
        classname = data.get('class', '')
        ordername = data.get('order', '')
        
        metadata['category'] = get_category_from_class(classname, ordername, slug)
        
        # Step 2: Occurrence Search for Coordinates and Location
        if species_key:
            url_occ = f"https://api.gbif.org/v1/occurrence/search?speciesKey={species_key}&hasCoordinate=true&limit=5"
            req_occ = urllib.request.Request(url_occ, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_occ, timeout=10) as r_occ:
                occ_data = json.loads(r_occ.read().decode('utf-8'))
                
            results = occ_data.get('results', [])
            if results:
                # Find a result with locality/country information if possible
                occ = results[0]
                for o in results:
                    if o.get('locality') or o.get('country'):
                        occ = o
                        break
                        
                lat = occ.get('decimalLatitude', 0.0)
                lng = occ.get('decimalLongitude', 0.0)
                country = occ.get('country', '')
                locality = occ.get('locality', '')
                
                loc_parts = []
                if locality:
                    loc_parts.append(locality.strip())
                if country:
                    loc_parts.append(country.strip())
                    
                loc_name = ", ".join(loc_parts) if loc_parts else f"{common_name} Habitat"
                
                metadata['location'] = {
                    'name': loc_name,
                    'lat': lat,
                    'lng': lng,
                    'region': get_region_from_slug(slug)
                }
        
        # Cache results
        gbif_cache[slug] = metadata
        save_cache()
        time.sleep(0.2) # Polite API spacing
        
    except Exception as e:
        print(f"  ⚠ GBIF lookup failed for {slug}: {e}")
        # Build a safe default
        metadata['category'] = get_category_from_class('', '', slug)
        metadata['location'] = {
            'name': f"{common_name} Habitat",
            'lat': 0.0,
            'lng': 0.0,
            'region': get_region_from_slug(slug)
        }
        
    return metadata

def rebuild():
    if not LIBRARY_DIR.exists():
        print(f"Error: Library directory not found at {LIBRARY_DIR}")
        return
        
    print(f"Scanning library folders in: {LIBRARY_DIR}")
    
    videos = []

    # Scan category subdirectories (Mammals, Birds, Reptiles, Amphibians, Fish, Invertebrates)
    folders = []
    for cat_dir in sorted(LIBRARY_DIR.iterdir()):
        if cat_dir.is_dir():
            for animal_dir in sorted(cat_dir.iterdir()):
                if animal_dir.is_dir() and (animal_dir / 'videos').exists():
                    folders.append(animal_dir)
    
    video_counter = 1
    
    for folder in folders:
        slug = folder.name
        videos_dir = folder / 'videos'
        photos_dir = folder / 'photos'
        
        if not videos_dir.exists():
            continue
            
        # Get list of .mp4 files
        mp4_files = sorted([f for f in videos_dir.iterdir() if f.suffix.lower() == '.mp4'])
        if not mp4_files:
            continue
            
        print(f"Processing: {slug} ({len(mp4_files)} videos)")
        
        # Query GBIF for metadata
        meta = query_gbif(slug)
        
        # Find matching photos
        photos = []
        if photos_dir.exists():
            photos = sorted([f for f in photos_dir.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')])
            if not photos:
                print(f"  ⚠ [{slug}] No matching photos in photos_dir. Files: {[f.name for f in list(photos_dir.iterdir())[:3]]}")
        else:
            print(f"  ⚠ [{slug}] photos_dir does not exist: {photos_dir}")
                
        # Generate video entries
        for idx, mp4_file in enumerate(mp4_files):
            video_id = f"video-{slug}-{idx+1:03d}"
            common_name = slug.replace('-', ' ').title()
            
            # Formulate title and description
            title = f"{common_name} in its Natural Habitat" if idx == 0 else f"Fascinating Behavior of {common_name}"
            desc = (f"Observe the majestic {common_name} documented in this high-definition footage. "
                    f"This clip showcases the unique behaviors and traits of this species in the wild.")
            
            relative_video_url = str(mp4_file.relative_to(BASE_DIR)).replace('\\', '/')
            
            # Select a random photo as the cover/poster for each video
            poster_file = "placeholder.jpg"
            if photos:
                selected_photo = random.choice(photos)
                poster_file = str(selected_photo.relative_to(BASE_DIR)).replace('\\', '/')
            
            # Set a random view count and a date added to make it realistic
            views = 100 + (hash(video_id) % 4900)
            date_added = f"2025-0{(hash(video_id) % 9) + 1}-{(hash(video_id) % 20) + 1:02d}"
            
            video_entry = {
                "id": video_id,
                "title": title,
                "description": desc,
                "category": meta['category'],
                "tags": ["wild", "documentary"],
                "source": "self",
                "videoUrl": relative_video_url,
                "posterUrl": poster_file,
                "thumbnail": poster_file,
                "duration": get_mp4_duration_str(mp4_file),
                "dateAdded": date_added,
                "featured": (hash(video_id) % 7 == 0), # pseudo-random feature selection
                "views": views,
                "location": meta['location']
            }
            
            videos.append(video_entry)
            video_counter += 1

    # Keep categories matching existing layout
    categories = [
        {
            "id": "mammals",
            "name": "Mammals",
            "icon": "🦁",
            "description": "Warm-blooded animals with fur or hair",
            "color": "#C4A35A"
        },
        {
            "id": "birds",
            "name": "Birds",
            "icon": "🐦",
            "description": "Feathered, winged vertebrates",
            "color": "#D4764A"
        },
        {
            "id": "reptiles",
            "name": "Reptiles",
            "icon": "🦎",
            "description": "Scaly, cold-blooded vertebrates",
            "color": "#6B8E23"
        },
        {
            "id": "amphibians",
            "name": "Amphibians",
            "icon": "🐸",
            "description": "Dual-life, moist-skinned creatures",
            "color": "#5B9BD5"
        },
        {
            "id": "aquatic",
            "name": "Aquatic",
            "icon": "🐟",
            "description": "Life in water environments",
            "color": "#4A90D9"
        }
    ]
    
    # Save output json
    output_data = {
        "videos": videos,
        "categories": categories
    }
    
    # Ensure directory exists
    VIDEOS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VIDEOS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
        
    print(f"\n[OK] Rebuild complete! Saved {len(videos)} videos to {VIDEOS_JSON_PATH}")

if __name__ == '__main__':
    rebuild()
