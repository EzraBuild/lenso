"""Thin wrapper around the UnityCapture DirectShow virtual camera.
Re-opens the device whenever the incoming frame size changes."""
import logging
import time

import numpy as np
import pyvirtualcam

log = logging.getLogger("vcam")


class VirtualCamera:
    def __init__(self, device: str, fps: int = 30, standby_size=(1280, 720)):
        self.device = device
        self.fps = fps
        self._cam: pyvirtualcam.Camera | None = None
        self._size: tuple[int, int] | None = None
        self._standby = self._make_standby(*standby_size)
        self._last_frame_ts = 0.0

    @staticmethod
    def _make_standby(w: int, h: int) -> np.ndarray:
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:, :] = (18, 18, 22)
        # faint crosshair so you can tell the camera is alive but idle
        cy, cx = h // 2, w // 2
        frame[cy - 2:cy + 2, cx - 40:cx + 40] = (90, 90, 100)
        frame[cy - 40:cy + 40, cx - 2:cx + 2] = (90, 90, 100)
        return frame

    def _open(self, w: int, h: int):
        self.close()
        self._cam = pyvirtualcam.Camera(
            width=w, height=h, fps=self.fps,
            fmt=pyvirtualcam.PixelFormat.RGB,
            device=self.device, backend="unitycapture", print_fps=False,
        )
        self._size = (w, h)
        log.info("virtual camera '%s' open at %dx%d", self._cam.device, w, h)

    def send(self, rgb: np.ndarray):
        h, w = rgb.shape[:2]
        if self._cam is None or self._size != (w, h):
            self._open(w, h)
        self._cam.send(rgb)
        self._last_frame_ts = time.monotonic()

    def standby(self):
        """Call periodically while no phone is streaming so apps still see a picture."""
        if self._cam is None or time.monotonic() - self._last_frame_ts > 0.5:
            self.send(self._standby)

    @property
    def size(self):
        return self._size

    def close(self):
        if self._cam is not None:
            try:
                self._cam.close()
            except Exception:  # noqa: BLE001
                pass
            self._cam = None
            self._size = None
