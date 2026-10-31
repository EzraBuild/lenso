"""PC-side picture adjustments applied to every decoded frame before it reaches the
virtual webcam: rotation (manual or automatic from the phone's tilt), mirror, flip
and 16:9 framing. Pure numpy. Also a tiny PNG encoder for the control-window preview."""
import json
import pathlib
import struct
import zlib

import numpy as np

DEFAULTS = {
    "rotate": "auto",     # "auto" | 0 / 90 / 180 / 270  (clockwise)
    "mirror": False,      # left <-> right (selfie look)
    "flip": False,        # upside down
    "fit": "letterbox",   # native | letterbox | crop   (force a 16:9 landscape output)
}
ASPECT = 16 / 9


def _even(n: float) -> int:
    n = int(round(n))
    return n if n % 2 == 0 else n + 1


def _resize(rgb: np.ndarray, nw: int, nh: int) -> np.ndarray:
    """Nearest-neighbour resize via index gather: fast, no extra dependency."""
    h, w = rgb.shape[:2]
    ys = (np.arange(nh) * (h / nh)).astype(np.intp)
    xs = (np.arange(nw) * (w / nw)).astype(np.intp)
    return rgb[np.ix_(ys, xs)]


def auto_rotation(frame_w: int, frame_h: int, tilt) -> int:
    """How far to turn a frame clockwise so the picture is upright.

    iOS Safari already turns the frame to match the *interface* orientation. When the
    phone's orientation lock is on, the interface stays portrait while the phone is
    physically sideways, so a portrait frame arrives with the scene lying on its side.
    `tilt` is the physical orientation the phone measured with its motion sensor
    (0 upright, 90 turned clockwise, 180 upside down, 270 turned counter-clockwise)."""
    if frame_w > frame_h or tilt not in (90, 180, 270):
        return 0                         # landscape frame: Safari handled it already
    return (360 - tilt) % 360            # undo the physical turn


class Picture:
    def __init__(self, path: pathlib.Path):
        self.path = path
        self.settings = dict(DEFAULTS)
        self.effective_rotate = 0        # what was actually applied to the last frame
        self.load()

    # -------------------------------------------------------------- persistence
    def load(self):
        try:
            self.update(json.loads(self.path.read_text("utf-8")), save=False)
        except (OSError, ValueError):
            pass

    def save(self):
        try:
            self.path.write_text(json.dumps(self.settings, indent=2), "utf-8")
        except OSError:
            pass

    def update(self, data: dict, save: bool = True) -> dict:
        s = dict(self.settings)
        if "rotate" in data:
            r = data["rotate"]
            if r == "auto":
                s["rotate"] = "auto"
            else:
                try:
                    r = int(r) % 360
                    if r in (0, 90, 180, 270):
                        s["rotate"] = r
                except (TypeError, ValueError):
                    pass
        if "mirror" in data:
            s["mirror"] = bool(data["mirror"])
        if "flip" in data:
            s["flip"] = bool(data["flip"])
        if "fit" in data and data["fit"] in ("native", "letterbox", "crop"):
            s["fit"] = data["fit"]
        self.settings = s
        if save:
            self.save()
        return s

    # -------------------------------------------------------------- the work
    def apply(self, rgb: np.ndarray, tilt=None) -> np.ndarray:
        s = self.settings
        h, w = rgb.shape[:2]
        rot = auto_rotation(w, h, tilt) if s["rotate"] == "auto" else s["rotate"]
        self.effective_rotate = rot
        if rot:
            rgb = np.rot90(rgb, k=(-rot // 90) % 4)   # np.rot90 is counter-clockwise
        if s["mirror"]:
            rgb = rgb[:, ::-1]
        if s["flip"]:
            rgb = rgb[::-1]
        if s["fit"] == "letterbox":
            rgb = self._letterbox(rgb)
        elif s["fit"] == "crop":
            rgb = self._crop(rgb)
        return np.ascontiguousarray(rgb)

    @staticmethod
    def _letterbox(rgb: np.ndarray) -> np.ndarray:
        """Put the picture inside a normal landscape 16:9 frame of the same pixel budget:
        a portrait 1080x1920 picture ends up centred in a 1920x1080 webcam frame."""
        h, w = rgb.shape[:2]
        if abs(w / h - ASPECT) < 0.01:
            return rgb
        long, short = max(w, h), min(w, h)
        if long / short >= ASPECT:          # canvas = landscape version of the frame
            W, H = long, _even(long / ASPECT)
        else:
            W, H = _even(short * ASPECT), short
        scale = min(W / w, H / h)
        nw, nh = max(2, _even(w * scale)), max(2, _even(h * scale))
        if (nw, nh) != (w, h):
            rgb = _resize(rgb, nw, nh)
        out = np.zeros((H, W, 3), dtype=rgb.dtype)
        y, x = (H - nh) // 2, (W - nw) // 2
        out[y:y + nh, x:x + nw] = rgb
        return out

    @staticmethod
    def _crop(rgb: np.ndarray) -> np.ndarray:
        h, w = rgb.shape[:2]
        if abs(w / h - ASPECT) < 0.01:
            return rgb
        if w / h > ASPECT:          # too wide: cut the sides
            W = _even(h * ASPECT)
            x = (w - W) // 2
            return rgb[:, x:x + W]
        H = _even(w / ASPECT)       # too tall: cut top and bottom
        y = (h - H) // 2
        return rgb[y:y + H]


def thumbnail(rgb: np.ndarray, max_w: int = 640, max_h: int = 480) -> np.ndarray:
    """Cheap nearest-neighbour downscale by integer stride, fits inside max_w x max_h."""
    h, w = rgb.shape[:2]
    k = max(1, -(-w // max_w), -(-h // max_h))
    return np.ascontiguousarray(rgb[::k, ::k])


def to_png(rgb: np.ndarray) -> bytes:
    """Minimal PNG (RGB8, fast zlib level) for the control-window preview."""
    h, w = rgb.shape[:2]
    rows = np.empty((h, 1 + w * 3), dtype=np.uint8)
    rows[:, 0] = 0                                  # filter type: none
    rows[:, 1:] = np.ascontiguousarray(rgb).reshape(h, w * 3)
    raw = zlib.compress(rows.tobytes(), 1)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", raw)
            + chunk(b"IEND", b""))
