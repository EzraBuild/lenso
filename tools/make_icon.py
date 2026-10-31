"""Generates the Lenso icon without any image library: a white lens ring on black.
Writes web/icon.png (180px, iPhone home screen), app/resources/icon.png (512px) and
app/resources/icon.ico (window / taskbar)."""
import pathlib
import struct
import zlib

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTS = [(ROOT / "web" / "icon.png", 180), (ROOT / "app" / "resources" / "icon.png", 512)]
ICO = ROOT / "app" / "resources" / "icon.ico"


def png(rgb: np.ndarray) -> bytes:
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[y].tobytes() for y in range(h))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


def render(n: int, ss: int = 4) -> np.ndarray:
    """Flat monochrome mark: lens ring + a glint, drawn at ss x and box-filtered down."""
    N = n * ss
    yy, xx = np.mgrid[0:N, 0:N].astype(float) + 0.5
    c = N / 2
    r = np.hypot(xx - c, yy - c)
    img = np.zeros((N, N), dtype=float)                       # 0 = black
    ring = (r <= 0.34 * N) & (r >= 0.265 * N)
    img[ring] = 1.0
    # aperture gap: a thin wedge cut out of the ring at the top-right, like a shutter blade
    ang = np.degrees(np.arctan2(c - yy, xx - c))               # 0 = right, 90 = up
    gap = ring & (ang > 38) & (ang < 52)
    img[gap] = 0.0
    glint = np.hypot(xx - (c - 0.09 * N), yy - (c - 0.09 * N)) <= 0.075 * N
    img[glint] = 1.0
    small = img.reshape(n, ss, n, ss).mean(axis=(1, 3))        # antialias
    out = np.empty((n, n, 3), dtype=np.uint8)
    out[:, :, :] = (small * 255 + 0.5).astype(np.uint8)[:, :, None]
    return out


def ico(pngs: list[tuple[int, bytes]]) -> bytes:
    """ICO container holding PNG images (supported since Windows Vista)."""
    head = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, data = b"", b""
    for size, blob in pngs:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(blob), offset + len(data))
        data += blob
    return head + entries + data


def main():
    for path, n in OUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png(render(n)))
        print("wrote", path)
    ICO.write_bytes(ico([(s, png(render(s))) for s in (16, 32, 48, 256)]))
    print("wrote", ICO)


if __name__ == "__main__":
    main()
