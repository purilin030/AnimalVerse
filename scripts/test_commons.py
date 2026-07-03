"""Test Commons API response."""
import requests
api = 'https://commons.wikimedia.org/w/api.php'
params = {
    'action': 'query',
    'list': 'search',
    'srsearch': 'Lion -icon -logo',
    'srnamespace': 6,
    'format': 'json',
    'srlimit': 3,
}
r = requests.get(api, params=params, headers={'User-Agent': 'AnimalVerse/1.0 (media-downloader)'}, timeout=10)
print('Status:', r.status_code)
print('Headers:', dict(r.headers))
print('Text[:300]:', r.text[:300])
