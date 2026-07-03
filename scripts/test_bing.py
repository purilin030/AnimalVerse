"""Quick test: can we get images from Bing with plain requests?"""
import requests
import re

r = requests.get(
    'https://www.bing.com/images/search?q=badger+animal',
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                      'AppleWebKit/537.36 (KHTML, like Gecko) '
                      'Chrome/120.0.0.0 Safari/537.36'
    },
    timeout=15,
)
print(f'Status: {r.status_code}')
print(f'URL: {r.url}')

# Extract image URLs from HTML
# Bing puts images in <img> with src or data-src
urls = re.findall(
    r'<img[^>]+src="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"',
    r.text,
    re.I,
)
print(f'Found {len(urls)} images via src:')
for u in urls[:5]:
    print(f'  {u[:120]}')

# Also check murl / mediaurl attributes
murls = re.findall(
    r'<img[^>]+murl="(https?://[^"]+\.(?:jpg|jpeg|png|webp))"',
    r.text,
    re.I,
)
print(f'Found {len(murls)} images via murl:')
for u in murls[:5]:
    print(f'  {u[:120]}')
