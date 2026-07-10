"""
AnimalVerse - Convert all JPG/JPEG to WebP
===========================================
批量将所有 JPG 转换为 WebP（质量 70），大幅减小图片体积。
原始 JPG 会自动删除，节省空间。

Usage:
    python scripts/convert_to_webp.py
    python scripts/convert_to_webp.py --dry-run
    python scripts/convert_to_webp.py --quality 60
"""

import os
import sys
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images'

def convert_jpg_to_webp(jpg_path, quality=70, dry_run=False):
    """Convert a JPG to WebP. Returns (old_size, new_size) or None if skipped."""
    webp_path = jpg_path.with_suffix('.webp')

    # Skip if WebP already exists and is newer (already converted)
    if webp_path.exists() and webp_path.stat().st_mtime >= jpg_path.stat().st_mtime:
        return None

    old_size = jpg_path.stat().st_size

    if dry_run:
        return (old_size, None)

    try:
        with Image.open(jpg_path) as img:
            # Convert RGBA/CMYK/P etc to RGB for WebP
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            elif img.mode == 'CMYK':
                img = img.convert('RGB')

            img.save(webp_path, 'WEBP', quality=quality, method=6)

        if webp_path.exists() and webp_path.stat().st_size > 0:
            new_size = webp_path.stat().st_size
            jpg_path.unlink()  # Delete original JPG
            return (old_size, new_size)
        else:
            print(f"  [WARN] WebP creation failed for {jpg_path.name}")
            return None
    except Exception as e:
        print(f"  [ERROR] {jpg_path.name}: {e}")
        return None


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Convert JPG/JPEG to WebP')
    parser.add_argument('--quality', type=int, default=70,
                        help='WebP quality 1-100 (default 70)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be converted without doing it')
    args = parser.parse_args()

    # Find all JPG/JPEG files
    jpg_files = list(BASE_DIR.rglob('*.jpg')) + list(BASE_DIR.rglob('*.jpeg'))
    jpg_files = [f for f in jpg_files if 'tmp' not in f.parts]  # Skip temp files

    if not jpg_files:
        print("No JPG/JPEG files found.")
        return

    total_old = 0
    total_new = 0
    converted = 0
    skipped = 0

    print(f"Found {len(jpg_files)} JPG files to process (quality={args.quality})")
    if args.dry_run:
        print(" *** DRY RUN — no files will be changed ***")
    print()

    for jpg in sorted(jpg_files):
        rel = jpg.relative_to(BASE_DIR.parent.parent)
        result = convert_jpg_to_webp(jpg, args.quality, args.dry_run)

        if result is None:
            webp = jpg.with_suffix('.webp')
            if webp.exists():
                skipped += 1
                continue
            else:
                print(f"  [SKIP] {rel}")
                continue

        old_size, new_size = result
        total_old += old_size

        if args.dry_run:
            print(f"  [DRY] {rel} ({old_size // 1024} KB → WebP)")
            converted += 1
        elif new_size:
            total_new += new_size
            saved = (1 - new_size / old_size) * 100
            print(f"  [OK]  {rel} ({old_size//1024}KB → {new_size//1024}KB, saved {saved:.0f}%)")
            converted += 1
        else:
            skipped += 1

    # Summary
    print()
    print(f"Done! {converted} converted, {skipped} skipped")
    if not args.dry_run and total_old > 0 and total_new > 0:
        total_saved = (1 - total_new / total_old) * 100
        print(f"Space saved: {(total_old - total_new) // (1024*1024)} MB / {total_old // (1024*1024)} MB ({total_saved:.0f}%)")
    elif args.dry_run:
        total_mb = total_old // (1024*1024)
        print(f"Estimated original: ~{total_mb} MB (typically 60-80% reduction after conversion)")

    if not args.dry_run:
        print()
        print("Next step: Run 'python scripts/rebuild_videos_json.py' to update metadata.")

if __name__ == '__main__':
    main()
