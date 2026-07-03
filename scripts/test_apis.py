"""Test Wikipedia + Commons APIs for reliable animal images."""
import requests
import json

HEADERS = {'User-Agent': 'AnimalVerse/1.0 (project)'}

# ── Test 1: Wikipedia page image for Badger ──
print('=== Wikipedia (Badger) ===')
r = requests.get('https://en.wikipedia.org/w/api.php', params={
    'action': 'query',
    'titles': 'Badger',
    'prop': 'pageimages',
    'pithumbsize': 800,
    'format': 'json',
}, headers=HEADERS, timeout=10)
pages = r.json()['query']['pages']
for pid, info in pages.items():
    if 'thumbnail' in info:
        print(f'  Thumbnail: {info["thumbnail"]["source"]}')
    elif 'missing' in info:
        print(f'  No Wikipedia article for "Badger"')

# ── Test 2: Commons search by scientific name ──
print()
print('=== Commons (Meles meles) ===')
api = 'https://commons.wikimedia.org/w/api.php'
r = requests.get(api, params={
    'action': 'query',
    'list': 'search',
    'srsearch': '"Meles meles" wildlife -icon -logo -map',
    'srnamespace': 6,
    'format': 'json',
    'srlimit': 10,
}, headers=HEADERS, timeout=10)
results = r.json().get('query', {}).get('search', [])
print(f'  Found {len(results)} files:')
for res in results[:5]:
    title = res['title']
    # Get image URL
    r2 = requests.get(api, params={
        'action': 'query',
        'titles': title,
        'prop': 'imageinfo',
        'iiprop': 'url',
        'format': 'json',
    }, headers=HEADERS, timeout=10)
    for p in r2.json()['query']['pages'].values():
        if 'imageinfo' in p:
            url = p['imageinfo'][0]['url']
            print(f'  ✔ {title}')
            print(f'    {url}')

# ── Test 3: Commons by common name (Asian Elephant - the problem child) ──
print()
print('=== Commons (Asian Elephant via scientific name "Elephas maximus") ===')
r = requests.get(api, params={
    'action': 'query',
    'list': 'search',
    'srsearch': '"Elephas maximus" -icon -logo -map',
    'srnamespace': 6,
    'format': 'json',
    'srlimit': 5,
}, headers=HEADERS, timeout=10)
results = r.json().get('query', {}).get('search', [])
print(f'  Found {len(results)} files:')
for res in results[:3]:
    title = res['title']
    r2 = requests.get(api, params={
        'action': 'query',
        'titles': title,
        'prop': 'imageinfo',
        'iiprop': 'url',
        'format': 'json',
    }, headers=HEADERS, timeout=10)
    for p in r2.json()['query']['pages'].values():
        if 'imageinfo' in p:
            url = p['imageinfo'][0]['url']
            print(f'  ✔ {title}')
            print(f'    {url}')
