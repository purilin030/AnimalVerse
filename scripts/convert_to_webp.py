"""
AnimalVerse - Optimize all photos (resize + WebP)
==================================================
Resize all photos to max 800px and convert to WebP quality 65,
matching Marquee folder performance (~10-80KB per image).

Usage:
    python scripts/convert_to_webp.py
    python scripts/convert_to_webp.py --dry-run
    python scripts/convert_to_webp.py --max-size 600 --quality 60
"""

import os
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # Disable decompression bomb check

BASE_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'images'
MAX_SIZE = 800   # max px on longest edge
QUALITY  = 65    # WebP quality (Marquee uses ~60-80)

def optimize_image(img_path, max_size=MAX_SIZE, quality=QUALITY, dry_run=False):
    """Resize + convert to WebP. Returns (old_size, new_size) or None."""

    # Must be JPG/JPEG/WebP
    if img_path.suffix.lower() not in ('.jpg', '.jpeg', '.webp'):
        return None

    # Skip if already optimized (size < 50KB)
    if img_path.suffix.lower() == '.webp' and img_path.stat().st_size < 50000:
        return None

    webp_path = img_path.with_suffix('.webp')
    old_size = img_path.stat().st_size

    if dry_run:
        return (old_size, None)

    try:
        with Image.open(img_path) as img:
            # Convert to RGB
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            elif img.mode == 'CMYK':
                img = img.convert('RGB')

            # Resize: max longest edge = max_size, keep aspect ratio
            w, h = img.size
            if max(w, h) > max_size:
                ratio = max_size / max(w, h)
                new_w = int(w * ratio)
                new_h = int(h * ratio)
                img = img.resize((new_w, new_h), Image.LANCZOS)

            img.save(webp_path, 'WEBP', quality=quality, method=6)

        if webp_path.exists() and webp_path.stat().st_size > 0:
            new_size = webp_path.stat().st_size
            # Delete original only if it's JPG (keep WebP -> smaller WebP)
            if img_path.suffix.lower() != '.webp':
                img_path.unlink(missing_ok=True)
            return (old_size, new_size)
        else:
            return None
    except Exception as e:
        print(f"  [ERROR] {img_path.name}: {e}")
        # Delete corrupt originals
        if old_size > 10 * 1024 * 1024:  # >10MB corrupt file
            print(f"  └─ Deleting corrupt file: {img_path.name}")
            img_path.unlink(missing_ok=True)
        return None


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--max-size', type=int, default=MAX_SIZE,
                        help=f'Max pixels on longest edge (default {MAX_SIZE})')
    parser.add_argument('--quality', type=int, default=QUALITY,
                        help=f'WebP quality 1-100 (default {QUALITY})')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    # Collect all image files (dedup on Windows)
    all_files = set()
    for ext in ('*.jpg', '*.jpeg', '*.webp', '*.JPG', '*.JPEG', '*.WEBP'):
        all_files |= {f.resolve() for f in BASE_DIR.rglob(ext)}

    all_files = sorted(f for f in all_files if 'tmp' not in f.parts)

    if not all_files:
        print("No image files found.")
        return

    total_old = 0
    total_new = 0
    converted = 0
    skipped   = 0

    print(f"Processing {len(all_files)} images (max {args.max_size}px, quality {args.quality})")
    if args.dry_run:
        print(" *** DRY RUN ***")
    print()

    for img in all_files:
        # Skip already-small WebP files
        if img.suffix.lower() == '.webp' and img.stat().st_size < 50000:
            skipped += 1
            continue

        rel = img.relative_to(BASE_DIR.parent.parent)
        result = optimize_image(img, args.max_size, args.quality, args.dry_run)

        if result is None:
            continue

        old_size, new_size = result
        total_old += old_size

        if args.dry_run:
            print(f"  [DRY] {rel} ({old_size//1024}KB → ~{old_size//1024//3}KB)")
            converted += 1
        elif new_size:
            total_new += new_size
            saved = (1 - new_size / old_size) * 100 if old_size > 0 else 0
            print(f"  [OK]  {rel}  {old_size//1024:5d}KB → {new_size//1024:3d}KB  ({saved:.0f}% saved)")
            converted += 1

    print()
    print(f"Done! {converted} optimized, {skipped} skipped")
    if not args.dry_run and total_new > 0:
        saved_mb = (total_old - total_new) // (1024*1024)
        total_mb_old = total_old // (1024*1024)
        total_mb_new = total_new // (1024*1024)
        print(f"Total: {total_mb_old}MB → {total_mb_new}MB  (saved {saved_mb}MB, {saved_mb*100//total_mb_old if total_mb_old else 0}%)")
    elif args.dry_run:
        print(f"Current total: ~{total_old//(1024*1024)}MB (expect 70-90% reduction)")

    if not args.dry_run:
        print()
        print("Run 'python scripts/rebuild_videos_json.py' to update metadata.")


if __name__ == '__main__':
    main()
