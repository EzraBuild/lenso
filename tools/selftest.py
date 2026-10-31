"""Pretends to be the phone: streams a synthetic 1080p H.264 feed into the running
receiver for a few seconds and reports what the receiver saw.
Usage: .venv\\Scripts\\python.exe tools\\selftest.py [https://localhost:8443]"""
import asyncio
import fractions
import sys
import time

import aiohttp
import numpy as np
from aiortc import RTCPeerConnection, VideoStreamTrack
from av import VideoFrame

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://localhost:8443"
W, H, FPS, SECONDS = 1920, 1080, 30, 6


class Pattern(VideoStreamTrack):
    """Moving colour bars so the encoder has real motion to chew on."""

    def __init__(self):
        super().__init__()
        self.t0 = time.monotonic()
        self.n = 0
        x = np.linspace(0, 255, W, dtype=np.uint8)
        self.base = np.zeros((H, W, 3), dtype=np.uint8)
        self.base[:, :, 0] = x
        self.base[:, :, 1] = x[::-1]
        self.base[:, :, 2] = np.linspace(0, 255, H, dtype=np.uint8)[:, None]

    async def recv(self):
        self.n += 1
        target = self.t0 + self.n / FPS
        await asyncio.sleep(max(0.0, target - time.monotonic()))
        img = np.roll(self.base, self.n * 8, axis=1)
        frame = VideoFrame.from_ndarray(img, format="rgb24")
        frame.pts = self.n
        frame.time_base = fractions.Fraction(1, FPS)
        return frame


async def main():
    pc = RTCPeerConnection()
    pc.addTrack(Pattern())
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as http:
        async with http.post(f"{BASE}/offer", json={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}) as r:
            r.raise_for_status()
            answer = await r.json()
        from aiortc import RTCSessionDescription
        await pc.setRemoteDescription(RTCSessionDescription(**answer))

        print(f"streaming {W}x{H}@{FPS} for {SECONDS}s ...")
        for i in range(SECONDS):
            await asyncio.sleep(1)
            async with http.get(f"{BASE}/api/status") as r:
                st = await r.json()
            print(f"  t={i+1}s  pc={pc.connectionState:12s} receiver_fps={st['receiver_fps']:5}  frames={st['frames_total']:4}  vcam={st['vcam_size']}")

        await pc.close()
        async with http.post(f"{BASE}/hangup") as r:
            await r.json()

    ok = st["frames_total"] > FPS * (SECONDS - 3) and st["vcam_size"] == [W, H]
    print("SELFTEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
