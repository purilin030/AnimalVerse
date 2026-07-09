"""
AnimalVerse - Wikimedia Commons Video Downloader (Parallel)
==========================================================
Downloads 3 videos per animal from Wikimedia Commons to be used as
the local alternative video, saving YouTube for the live integration.

Usage:
    python scripts/download_commons_videos.py --workers 3
"""

import os
import json
import time
import threading
import requests
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Animals to download 3 videos for
ANIMALS = sorted(set([
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

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

def get_category(animal):
    s = animal.lower().replace('-', ' ')
    aquatic = {'whale', 'dolphin', 'seal', 'shark', 'fish', 'octopus', 'squid', 'jellyfish', 'coral', 'clownfish', 'manta ray', 'seahorse', 'krill', 'piranha', 'platypus', 'sea turtle'}
    reptiles = {'anaconda', 'chameleon', 'crocodile', 'komodo', 'lizard', 'snake', 'turtle', 'tortoise', 'gecko', 'iguana', 'python'}
    amphibians = {'frog', 'toad', 'salamander', 'newt'}
    birds = {'eagle', 'hawk', 'owl', 'parrot', 'penguin', 'flamingo', 'peacock', 'toucan', 'macaw', 'kookaburra', 'albatross', 'tern', 'petrel', 'emu'}
    
    if any(k in s for k in aquatic): return 'Aquatic'
    if any(k in s for k in reptiles): return 'Reptiles'
    if any(k in s for k in amphibians): return 'Amphibians'
    if any(k in s for k in birds): return 'Birds'
    return 'Mammals'

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'AnimalVerse/1.0 (educational FYP project)'})

# 全局请求锁 + 固定间隔，防止多线程并发触发 Wikimedia 429 限流
_REQUEST_LOCK = threading.Lock()
_REQUEST_INTERVAL = 1.2   # 每次请求之间至少间隔 1.2 秒
_last_request_time = [0.0]

def api_get(params, retries=6):
    """Wikimedia API GET，带全局限速 + 指数退避重试。"""
    for attempt in range(retries):
        # --- 全局限速：串行化所有线程的请求 ---
        with _REQUEST_LOCK:
            now = time.monotonic()
            elapsed = now - _last_request_time[0]
            if elapsed < _REQUEST_INTERVAL:
                time.sleep(_REQUEST_INTERVAL - elapsed)
            _last_request_time[0] = time.monotonic()
            r = SESSION.get(COMMONS_API, params=params, timeout=25)

        # 专门处理 429，读取 Retry-After 后等待
        if r.status_code == 429:
            wait = int(r.headers.get('Retry-After', 10))
            print(f"  [429] Rate limited, waiting {wait}s before retry {attempt+1}/{retries}...")
            time.sleep(wait + 1)
            continue

        try:
            r.raise_for_status()
            data = r.json()
            # Wikimedia maxlag 错误
            if 'error' in data and data['error'].get('code') == 'maxlag':
                wait = int(r.headers.get('Retry-After', 5))
                time.sleep(wait)
                continue
            return data
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s ...
            else:
                raise
    return {}

def search_videos(query, count):
    """Search Commons for video files matching query."""
    data = api_get({
        'action': 'query',
        'list': 'search',
        'srsearch': f'{query} filetype:video',
        'srnamespace': 6,
        'format': 'json',
        'srlimit': count + 5,
    })
    return data.get('query', {}).get('search', [])

def get_video_urls(animal, count=3):
    # 尝试多种搜索策略，从精确到宽泛
    search_queries = [animal]
    # 备用搜索词：取最后一个单词（如 "Snow Petrel" -> "Petrel"）
    words = animal.split()
    if len(words) > 1:
        search_queries.append(words[-1])
    # 再尝试第一个单词
    if len(words) > 1:
        search_queries.append(words[0])

    urls_found = []
    for query in search_queries:
        if urls_found:
            break
        try:
            results = search_videos(query, count)
        except Exception as e:
            print(f"  [WARN] Search failed for '{query}': {e}")
            continue

        for res in results:
            if len(urls_found) >= count:
                break
            title = res.get('title', '')
            if not title:
                continue
            try:
                d2 = api_get({
                    'action': 'query', 'titles': title,
                    'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json',
                })
            except Exception as e:
                print(f"  [WARN] imageinfo failed for '{title}': {e}")
                continue

            for p2 in d2.get('query', {}).get('pages', {}).values():
                if 'imageinfo' in p2 and p2['imageinfo']:
                    u = p2['imageinfo'][0].get('url', '')
                    if u and (u.lower().endswith('.mp4') or u.lower().endswith('.webm') or u.lower().endswith('.ogv')):
                        urls_found.append((u, title))
                        break

    return urls_found

def process_animal(animal):
    slug = animal.lower().replace(' ', '-')
    category = get_category(animal)
    animal_dir = BASE_DIR / category / slug / 'videos'
    animal_dir.mkdir(parents=True, exist_ok=True)
    sources_path = animal_dir / 'sources.json'

    # 加载已有的 sources.json，避免覆盖旧记录
    source_info = []
    if sources_path.exists():
        try:
            with open(sources_path, 'r', encoding='utf-8') as f:
                source_info = json.load(f)
            print(f"[{animal}] Loaded existing {len(source_info)} source entries")
        except Exception as e:
            print(f"  [WARN] Failed to load existing sources.json: {e}")

    base_index = len(source_info)  # 已有多少条记录，新文件就从 +1 开始编号

    print(f"[{animal}] Searching...")
    videos = get_video_urls(animal, count=3)

    if videos:
        for idx, (url, title) in enumerate(videos):
            file_idx = base_index + idx + 1
            ext = '.mp4' if url.lower().endswith('.mp4') else ('.webm' if url.lower().endswith('.webm') else '.ogv')
            out_path = animal_dir / f"{slug}-commons-{file_idx}{ext}"

            source_info.append({
                "title": title.replace("File:", ""),
                "uploader": "Wikimedia Commons",
                "url": url
            })

            print(f"[{animal}] Downloading video {idx+1}/3...")
            try:
                r = requests.get(url, stream=True, timeout=30)
                if r.status_code == 200:
                    with open(out_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=1024*1024):
                            if chunk:
                                f.write(chunk)
            except Exception:
                pass

        with open(sources_path, 'w', encoding='utf-8') as f:
            json.dump(source_info, f, ensure_ascii=False, indent=4)
        print(f"[{animal}] Done! Total sources: {len(source_info)}")
    else:
        print(f"[{animal}] No video found.")

def main():
    parser = argparse.ArgumentParser()
    # workers=1 最安全（顺序下载），全局限速锁已保证多线程也不会超速
    # 若需要更快可设为 2，但建议不超过 3
    parser.add_argument('--workers', type=int, default=1)
    args = parser.parse_args()

    print("="*60)
    print(f" AnimalVerse - Wikimedia Commons Video Downloader (Parallel: {args.workers})")
    print("="*60)
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        ex.map(process_animal, ANIMALS)
        
    print("="*60)
    print(f"Done in {time.time()-start_time:.0f} seconds!")
    print("Remember to run 'python animal-verse/scripts/rebuild_videos_json.py' afterwards.")

if __name__ == '__main__':
    main()
