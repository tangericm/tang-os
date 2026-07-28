"""Export the tang-os portfolio hero pair: raw frame + production prediction.

The wipe in tang-os stacks two JPEGs at 1100x455 and reveals the prediction
with a clip-path. They must be the SAME crop at the SAME display window or the
comparison reads as a contrast trick rather than denoising.

Display rules (kept in sync with tang-os app/components/ProjectsWindow.tsx):
  1. One shared window for both frames -- never per-image autoscale.
  2. Black point at the prediction's 1st percentile; white at its 99th.
  3. Gamma 1.5 applied identically to both after windowing.
  4. Grayscale uint8, resized to 1100x455 without independent axis scaling
     (the crop aspect must already match the output aspect).

Default framing matches the self-fusion hero on tang-os: device A
``Line_6mm_2048Aline_135degCW_50frame_gain165``, full 2048 A-lines, depth
rows 80:926 (846 px, aspect 2048/846 ~ 1100/455).

Example (from an OCT-Denoiser checkout with ``pip install -e .``)::

    python3 scripts/export-denoiser-hero.py \\
        --ckpt runs/architecture_sweep/nafnet.pt \\
        --device-a-root /path/to/images/device_a \\
        --out public
"""
from __future__ import annotations

import argparse
import os

import numpy as np
import torch
from PIL import Image

from octdenoiser.configs.default import DEVICE_A_DISPERSION, FolderSpec
from octdenoiser.networks import create_model
from octdenoiser.preprocess import BAND_TARGET_FULL, BscanProcessor

# Default crop: full lateral field, tissue band with hero aspect ratio.
DEFAULT_STACK = "Line_6mm_2048Aline_135degCW_50frame_gain165"
DEFAULT_Z0, DEFAULT_Z1 = 80, 926
DEFAULT_OUT_W, DEFAULT_OUT_H = 1100, 455
DEFAULT_GAMMA = 1.5


def _spec(root: str, folder: str) -> FolderSpec:
    return FolderSpec(
        root_folder=root,
        data_folder=folder,
        pixels=2048,
        alines=2048,
        crop_depth=(0, 1024),
        window_sigma=0.05,
        gap=0.60,
        gap_offset=0.015,
        dispersion=DEVICE_A_DISPERSION,
    )


def shared_window(noisy: np.ndarray, pred: np.ndarray, *, gamma: float) -> tuple[np.ndarray, np.ndarray]:
    """Map both arrays through one window anchored on the prediction."""
    lo = float(np.percentile(pred, 1))
    hi = float(np.percentile(pred, 99))
    span = max(hi - lo, 1e-12)
    inv_gamma = 1.0 / gamma

    def _map(img: np.ndarray) -> np.ndarray:
        u = np.clip((img.astype(np.float64) - lo) / span, 0.0, 1.0)
        u = np.power(u, inv_gamma)
        return (u * 255.0).astype(np.uint8)

    return _map(noisy), _map(pred)


def resize_gray(img: np.ndarray, width: int, height: int) -> np.ndarray:
    """Resize without independent axis scaling (crop must already match aspect)."""
    pil = Image.fromarray(img, mode="L")
    return np.asarray(pil.resize((width, height), Image.Resampling.LANCZOS), dtype=np.uint8)


@torch.no_grad()
def infer_frame(proc: BscanProcessor, model: torch.nn.Module, frame: int, device: str) -> tuple[np.ndarray, np.ndarray]:
    out = proc.process_one(proc.bscan_paths[frame], frame_idx=frame, fft_workers=-1, bands=(BAND_TARGET_FULL,))
    noisy = out["target_full"]
    x = torch.from_numpy(noisy[None, None].astype(np.float32)).to(device)
    pred = model(x)[0, 0].float().cpu().numpy()
    return noisy, pred


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--ckpt", required=True, help="production nafnet .pt (base 64, scheme C)")
    p.add_argument("--device-a-root", required=True, help="root containing device A stacks")
    p.add_argument("--folder", default=DEFAULT_STACK)
    p.add_argument("--frame", type=int, default=0)
    p.add_argument("--z0", type=int, default=DEFAULT_Z0)
    p.add_argument("--z1", type=int, default=DEFAULT_Z1)
    p.add_argument("--out", default=".", help="output directory for denoiser-raw.jpg / denoiser-pred.jpg")
    p.add_argument("--width", type=int, default=DEFAULT_OUT_W)
    p.add_argument("--height", type=int, default=DEFAULT_OUT_H)
    p.add_argument("--gamma", type=float, default=DEFAULT_GAMMA)
    p.add_argument("--base", type=int, default=64)
    p.add_argument("--device", default="cuda")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)

    blob = torch.load(args.ckpt, map_location="cpu", weights_only=False)
    arch = blob.get("arch", "nafnet")
    model = create_model(arch, base=args.base, in_ch=int(blob.get("in_ch", 1)))
    model.load_state_dict(blob["model"])
    device = args.device if torch.cuda.is_available() else "cpu"
    model.to(device).eval()

    proc = BscanProcessor(_spec(args.device_a_root, args.folder))
    frame = min(max(args.frame, 0), len(proc.bscan_paths) - 1)
    noisy, pred = infer_frame(proc, model, frame, device)

    z0, z1 = args.z0, args.z1
    noisy_c = noisy[z0:z1, :]
    pred_c = pred[z0:z1, :]
    raw_u8, pred_u8 = shared_window(noisy_c, pred_c, gamma=args.gamma)
    raw_u8 = resize_gray(raw_u8, args.width, args.height)
    pred_u8 = resize_gray(pred_u8, args.width, args.height)

    raw_path = os.path.join(args.out, "denoiser-raw.jpg")
    pred_path = os.path.join(args.out, "denoiser-pred.jpg")
    Image.fromarray(raw_u8, mode="L").save(raw_path, quality=92)
    Image.fromarray(pred_u8, mode="L").save(pred_path, quality=92)
    print(f"wrote {raw_path}")
    print(f"wrote {pred_path}")


if __name__ == "__main__":
    main()
