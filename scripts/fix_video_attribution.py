"""
AnimalVerse - Fix Video Attribution
====================================
Adds missing `page_url` and `credit` fields to existing videos/sources.json
for Pexels & Pixabay entries.

Usage:
    python scripts/fix_video_attribution.py
    python scripts/fix_video_attribution.py --dry-run
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'library'

def fix_sources(sources_path, dry_run=False):
    try:
        with open(sources_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        return 0, 0

    changed = 0
    for entry in data:
        source = entry.get('source', '')
        title = entry.get('title', '')
        url = entry.get('url', '')

        # Skip if already has proper attribution
        if entry.get('page_url') and entry.get('credit'):
            continue

        # Extract ID from title: "Lion - 35966359" or "Lion - abc123"
        match = re.search(r'[-\s]+(\d+)$', title)
        vid_id = match.group(1) if match else ''

        if source == 'Pexels':
            photographer = entry.get('uploader', 'Pexels')
            # Construct page URL from video ID in the download URL
            if not vid_id:
                # Try extracting from URL: /video-files/12345/
                m = re.search(r'/video-files/(\d+)/', url)
                if m:
                    vid_id = m.group(1)
            entry['page_url'] = f"https://www.pexels.com/video/{vid_id}/" if vid_id else url
            entry['credit'] = f"Video by {photographer} on Pexels"
            changed += 1

        elif source == 'Pixabay':
            user = entry.get('uploader', 'Pixabay')
            if vid_id:
                entry['page_url'] = f"https://pixabay.com/videos/?id={vid_id}"
            else:
                entry['page_url'] = url
            entry['credit'] = f"Video by {user} on Pixabay"
            changed += 1

        # Commons entries: skip (no attribution required)

    if changed and not dry_run:
        with open(sources_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    return changed, len(data)

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    sources_files = list(BASE_DIR.rglob('videos/sources.json'))
    total_fixed = 0
    total_entries = 0

    for sf in sources_files:
        fixed, n = fix_sources(sf, args.dry_run)
        if fixed:
            rel = sf.relative_to(BASE_DIR.parent.parent)
            print(f"  {rel}: {fixed}/{n} entries fixed")
        total_fixed += fixed
        total_entries += n

    print(f"\n{'DRY RUN: ' if args.dry_run else ''}"
          f"Fixed {total_fixed}/{total_entries} entries across {len(sources_files)} files.")
    if args.dry_run:
        print("Run without --dry-run to apply.")

if __name__ == '__main__':
    main()
