"""
Shared camera buffer — un solo VideoCapture compartido entre
el detector y el stream MJPEG para evitar conflictos.
"""
import threading
import cv2
import numpy as np
import os

CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))


class CameraBuffer:
    def __init__(self):
        self._frame: np.ndarray | None = None
        self._lock = threading.Lock()
        self._running = False
        self._thread: threading.Thread | None = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def get_frame(self) -> np.ndarray | None:
        with self._lock:
            return self._frame.copy() if self._frame is not None else None

    def _capture_loop(self):
        cap = cv2.VideoCapture(CAMERA_INDEX)
        print(f"[camera_buffer] Cámara {CAMERA_INDEX} abierta")
        while self._running:
            ret, frame = cap.read()
            if ret:
                with self._lock:
                    self._frame = frame
        cap.release()
        print("[camera_buffer] Cámara cerrada")


# Singleton global
camera_buffer = CameraBuffer()
