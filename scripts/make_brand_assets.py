#!/usr/bin/env python3
"""
Generate high-fidelity, transparent brand assets from the original Parikshit logo.
Source: frontend/public/brand/parikshit-logo-original.jpg
Destination: frontend/public/brand/
"""

import os
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

def extract_alpha_asset(crop_arr, floor=12.0, gamma=0.92, min_alpha_denom=0.18):
    """
    Convert near-black background to transparent alpha using luminance/color channels,
    and un-premultiply RGB so translucent glows look vibrant on dark surfaces.
    """
    max_c = np.maximum(np.maximum(crop_arr[:, :, 0], crop_arr[:, :, 1]), crop_arr[:, :, 2])
    alpha = np.clip((max_c - floor) / (255.0 - floor), 0.0, 1.0)
    alpha = np.power(alpha, gamma)

    rgb = np.zeros_like(crop_arr)
    mask = alpha > 0.005
    for ch in range(3):
        rgb[mask, ch] = np.clip(crop_arr[mask, ch] / np.maximum(alpha[mask], min_alpha_denom), 0, 255)

    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def main():
    root = Path(__file__).resolve().parent.parent
    src_path = root / "frontend" / "public" / "brand" / "parikshit-logo-original.jpg"
    out_dir = root / "frontend" / "public" / "brand"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not src_path.exists():
        raise FileNotFoundError(f"Original logo not found at {src_path}")

    orig = Image.open(src_path).convert("RGB")
    arr = np.array(orig, dtype=np.float32)

    print(f"Loaded original logo from {src_path} ({orig.size})")

    # 1. Mark Extraction (Square crop around the P and orbit ring)
    # Center is approximately (506, 376)
    cx, cy = 506, 376
    half = 256
    mark_crop = arr[cy - half : cy + half, cx - half : cx + half].copy()
    mark_img = extract_alpha_asset(mark_crop, floor=10.0, gamma=0.90, min_alpha_denom=0.15)

    mark_path = out_dir / "mark.png"
    mark_2x_path = out_dir / "mark@2x.png"
    mark_img.save(mark_2x_path, "PNG", optimize=True)
    mark_img.resize((256, 256), Image.Resampling.LANCZOS).save(mark_path, "PNG", optimize=True)
    print(f"Generated {mark_path} and {mark_2x_path}")

    # 2. Wordmark Extraction ("PARIKSHIT")
    # Rows 662 to 755, Cols 110 to 920
    wm_crop = arr[662:755, 110:920].copy()
    wm_img = extract_alpha_asset(wm_crop, floor=12.0, gamma=0.95, min_alpha_denom=0.20)
    wm_path = out_dir / "wordmark.png"
    wm_2x_path = out_dir / "wordmark@2x.png"
    wm_img.save(wm_2x_path, "PNG", optimize=True)
    wm_img.resize((wm_img.width // 2, wm_img.height // 2), Image.Resampling.LANCZOS).save(wm_path, "PNG", optimize=True)
    print(f"Generated {wm_path} and {wm_2x_path}")

    # 3. Horizontal Lockup (Mark + Wordmark)
    # Scale wordmark to height 64, mark to height 64, place side by side with 16px gap
    target_h = 72
    m_scaled = mark_img.resize((target_h, target_h), Image.Resampling.LANCZOS)
    wm_scale_factor = target_h / wm_img.height
    wm_scaled = wm_img.resize((int(wm_img.width * wm_scale_factor), target_h), Image.Resampling.LANCZOS)

    gap = 18
    lockup_w = m_scaled.width + gap + wm_scaled.width
    lockup_h = target_h
    lockup_img = Image.new("RGBA", (lockup_w, lockup_h), (0, 0, 0, 0))
    lockup_img.paste(m_scaled, (0, 0), m_scaled)
    lockup_img.paste(wm_scaled, (m_scaled.width + gap, 0), wm_scaled)

    lockup_path = out_dir / "lockup.png"
    lockup_2x_path = out_dir / "lockup@2x.png"
    lockup_img.save(lockup_2x_path, "PNG", optimize=True)
    lockup_img.resize((lockup_w // 2, lockup_h // 2), Image.Resampling.LANCZOS).save(lockup_path, "PNG", optimize=True)
    print(f"Generated {lockup_path} and {lockup_2x_path}")

    # 4. Stacked Lockup (Mark centered above Wordmark)
    s_mark_h = 160
    s_m = mark_img.resize((s_mark_h, s_mark_h), Image.Resampling.LANCZOS)
    s_wm_w = 320
    s_wm_h = int(wm_img.height * (s_wm_w / wm_img.width))
    s_wm = wm_img.resize((s_wm_w, s_wm_h), Image.Resampling.LANCZOS)

    stack_w = max(s_m.width, s_wm.width) + 40
    stack_h = s_m.height + 24 + s_wm.height
    stacked_img = Image.new("RGBA", (stack_w, stack_h), (0, 0, 0, 0))
    stacked_img.paste(s_m, ((stack_w - s_m.width) // 2, 0), s_m)
    stacked_img.paste(s_wm, ((stack_w - s_wm.width) // 2, s_m.height + 24), s_wm)

    stacked_path = out_dir / "lockup-stacked.png"
    stacked_2x_path = out_dir / "lockup-stacked@2x.png"
    stacked_img.save(stacked_2x_path, "PNG", optimize=True)
    stacked_img.resize((stack_w // 2, stack_h // 2), Image.Resampling.LANCZOS).save(stacked_path, "PNG", optimize=True)
    print(f"Generated {stacked_path} and {stacked_2x_path}")

    # 5. Favicon & App Icons
    fav_base = mark_img.resize((512, 512), Image.Resampling.LANCZOS)
    fav_base.save(out_dir / "icon-512.png", "PNG", optimize=True)
    mark_img.resize((192, 192), Image.Resampling.LANCZOS).save(out_dir / "icon-192.png", "PNG", optimize=True)
    mark_img.resize((180, 180), Image.Resampling.LANCZOS).save(out_dir / "apple-touch-icon.png", "PNG", optimize=True)

    # Multi-res favicon.ico
    fav_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    fav_imgs = [mark_img.resize(s, Image.Resampling.LANCZOS) for s in fav_sizes]
    fav_imgs[0].save(
        out_dir / "favicon.ico",
        format="ICO",
        sizes=fav_sizes,
        append_images=fav_imgs[1:]
    )
    # Also write to frontend/src/app/favicon.ico so Next.js picks it up directly
    fav_imgs[0].save(
        root / "frontend" / "src" / "app" / "favicon.ico",
        format="ICO",
        sizes=fav_sizes,
        append_images=fav_imgs[1:]
    )
    print("Generated favicon.ico and app icons.")

    # 6. Open Graph / Social Card (1200x630, ink-950 canvas with ambient indigo corner glows and tagline)
    og = Image.new("RGBA", (1200, 630), (0, 3, 15, 255)) # #00030F

    # Draw ambient indigo glows
    glow_layer = Image.new("RGBA", (1200, 630), (0, 0, 0, 0))
    glow_arr = np.zeros((630, 1200, 4), dtype=np.float32)
    # top-right glow around (1100, 50)
    y_grid, x_grid = np.ogrid[:630, :1200]
    d1 = np.sqrt((x_grid - 1100)**2 + (y_grid - 50)**2)
    g1 = np.exp(-d1 / 280.0) * 160.0
    # bottom-left glow around (100, 580)
    d2 = np.sqrt((x_grid - 100)**2 + (y_grid - 580)**2)
    g2 = np.exp(-d2 / 300.0) * 180.0

    glow_arr[:, :, 0] = np.clip(g1 * 0.15 + g2 * 0.12, 0, 255) # R
    glow_arr[:, :, 1] = np.clip(g1 * 0.08 + g2 * 0.05, 0, 255) # G
    glow_arr[:, :, 2] = np.clip(g1 * 0.85 + g2 * 0.90, 0, 255) # B
    glow_arr[:, :, 3] = np.clip(g1 + g2, 0, 255)
    glow_layer = Image.fromarray(glow_arr.astype(np.uint8), "RGBA")
    og = Image.alpha_composite(og, glow_layer)

    # Extract tagline from original (rows 790:825, cols 90:930)
    tag_crop = arr[790:825, 90:930].copy()
    tag_img = extract_alpha_asset(tag_crop, floor=14.0, gamma=0.96, min_alpha_denom=0.25)

    # Composite Mark, Wordmark, and Tagline onto OG image
    og_mark_h = 240
    og_m = mark_img.resize((og_mark_h, og_mark_h), Image.Resampling.LANCZOS)
    og_wm_w = 480
    og_wm_h = int(wm_img.height * (og_wm_w / wm_img.width))
    og_wm = wm_img.resize((og_wm_w, og_wm_h), Image.Resampling.LANCZOS)

    og_tag_w = 540
    og_tag_h = int(tag_img.height * (og_tag_w / tag_img.width))
    og_tag = tag_img.resize((og_tag_w, og_tag_h), Image.Resampling.LANCZOS)

    total_content_h = og_m.height + 20 + og_wm.height + 18 + og_tag.height
    start_y = (630 - total_content_h) // 2

    og.paste(og_m, ((1200 - og_m.width) // 2, start_y), og_m)
    og.paste(og_wm, ((1200 - og_wm.width) // 2, start_y + og_m.height + 20), og_wm)
    og.paste(og_tag, ((1200 - og_tag.width) // 2, start_y + og_m.height + 20 + og_wm.height + 18), og_tag)

    og_path = out_dir / "og-image.png"
    og.convert("RGB").save(og_path, "JPEG", quality=94)
    print(f"Generated {og_path} (1200x630)")

    # 7. Clean up temporary test files
    for t in ["test_mark.png", "test_wordmark.png", "test_comp_ink950.png", "test_comp_wm.png"]:
        t_p = out_dir / t
        if t_p.exists():
            t_p.unlink()

    print("\nAll brand assets successfully built into frontend/public/brand/")

if __name__ == "__main__":
    main()
