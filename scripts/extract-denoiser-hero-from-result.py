"""Extract tang-os hero JPEGs from OCT-Denoiser ``docs/result.jpg``.

Use this only when ``scripts/export-denoiser-hero.py`` cannot run (no
``nafnet.pt`` checkpoint or device A stacks). The README figure is a composite:
the noisy reference and NAFNet prediction are rendered at different subplot
heights, so this is an approximation. For a pixel-aligned wipe, export from
inference::

    python3 scripts/export-denoiser-hero.py \\
        --ckpt /path/to/runs/architecture_sweep/nafnet.pt \\
        --device-a-root /path/to/images/device_a \\
        --out public

Crop constants below were reverse-engineered from the production
``docs/result.jpg`` committed with the NAFNet base-64 README rebuild
(``d8ffb55``).
"""
from __future__ import annotations

import argparse
import os

import numpy as np
from PIL import Image

# Production README figure layout (rows in docs/result.jpg, width 1100).
RAW_Y0, RAW_Y1 = 32, 487
PRED_Y0, PRED_Y1 = 555, 874
OUT_W, OUT_H = 1100, 455


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument(
        "--result",
        default=None,
        help="path to OCT-Denoiser docs/result.jpg (default: ../OCT-Denoiser/docs/result.jpg if present)",
    )
    p.add_argument("--out", default="public", help="output directory")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    result = args.result
    if result is None:
        for candidate in ("../OCT-Denoiser/docs/result.jpg", "docs/result.jpg"):
            if os.path.isfile(candidate):
                result = candidate
                break
    if not result or not os.path.isfile(result):
        raise SystemExit("pass --result /path/to/OCT-Denoiser/docs/result.jpg")

    gray = np.asarray(Image.open(result).convert("L"), dtype=np.uint8)
    raw = gray[RAW_Y0:RAW_Y1, :]
    if raw.shape != (OUT_H, OUT_W):
        raise SystemExit(f"unexpected raw crop {raw.shape}, expected ({OUT_H}, {OUT_W})")

    pred_src = gray[PRED_Y0:PRED_Y1, :]
    pred = np.asarray(
        Image.fromarray(pred_src, mode="L").resize((OUT_W, OUT_H), Image.Resampling.LANCZOS),
        dtype=np.uint8,
    )

    os.makedirs(args.out, exist_ok=True)
    raw_path = os.path.join(args.out, "denoiser-raw.jpg")
    pred_path = os.path.join(args.out, "denoiser-pred.jpg")
    Image.fromarray(raw, mode="L").save(raw_path, quality=92)
    Image.fromarray(pred, mode="L").save(pred_path, quality=92)
    corr = float(np.corrcoef(raw.astype(float).ravel(), pred.astype(float).ravel())[0, 1])
    print(f"wrote {raw_path}")
    print(f"wrote {pred_path}")
    print(f"raw/pred correlation {corr:.3f} (export-denoiser-hero.py gives a aligned pair)")


if __name__ == "__main__":
    main()
