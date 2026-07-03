"""
清理 "文不对图" 动物的照片文件夹
跑这个脚本会删除列表中所有动物的 photos/ 目录，之后再重新下载
"""

import shutil
from pathlib import Path

PROBLEM_SLUGS = [
    'albatross', 'anaconda', 'arctic-tern', 'asian-elephant', 'badger',
    'bald-eagle', 'bison', 'blue-whale', 'brown-bear', 'chimpanzee',
    'clownfish', 'coral', 'crocodile', 'dingo', 'dolphin',
    'european-bison', 'fox', 'giant-panda', 'great-white-shark',
    'grizzly-bear', 'horse', 'howler-monkey', 'kitten', 'koala',
    'kookaburra', 'lioness', 'llama', 'lynx', 'macaw', 'manta-ray',
    'mountain-lion', 'piranha', 'polar-bear', 'red-fox', 'red-panda',
    'rhinoceros', 'sambar-deer', 'sea-turtle', 'snow-leopard',
    'snow-petrel', 'sun-bear', 'tasmanian-devil', 'toucan', 'tree-frog',
    'vampire-bat', 'wallaby', 'wild-boar', 'wolf',
]

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'

def main():
    deleted = 0
    for slug in PROBLEM_SLUGS:
        photos_dir = BASE_DIR / slug / 'photos'
        if photos_dir.exists():
            shutil.rmtree(photos_dir)
            print(f'[DELETED] {slug}/photos/')
            deleted += 1

    print(f'\nDone! Cleaned {deleted} animal photo folders.')

if __name__ == '__main__':
    main()
