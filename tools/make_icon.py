"""Generates web/icon.png (180x180 home-screen icon) without any image library."""
import pathlib
import struct
import zlib

import numpy as np

OUT = pathlib.Path(__file__).resolve().parent.parent / "web" / "icon.png"
N = 180


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


def main():
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    cx = cy = (N - 1) / 2
    r = np.hypot(xx - cx, yy - cy)
    img = np.zeros((N, N, 3), dtype=np.uint8)
    img[:, :] = (14, 14, 17)                       # background
    img[r < 62] = (34, 34, 42)                     # lens housing
    img[r < 52] = (79, 140, 255)                   # blue ring
    img[r < 44] = (22, 22, 27)                     # dark glass
    img[r < 30] = (40, 60, 110)                    # inner glass
    # highlight blob
    hl = np.hypot(xx - (cx - 14), yy - (cy - 16)) < 9
    img[hl] = (190, 210, 255)
    # little red "rec" dot top-right
    rec = np.hypot(xx - 150, yy - 30) < 9
    img[rec] = (255, 93, 93)
    OUT.write_bytes(png(img))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
