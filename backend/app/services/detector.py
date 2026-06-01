import asyncio
import base64
import os
from datetime import datetime, timezone

import cv2
import numpy as np
from ultralytics import YOLO

from app.services.supabase_client import get_supabase

# Map YOLO class names to EHS violation types
VIOLATION_CLASSES = {"no-helmet", "no-vest", "no-hardhat", "no-safety-vest"}

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
ALERT_COOLDOWN_SECONDS = 10  # avoid duplicate alerts for same event


class DetectorService:
    def __init__(self):
        self.running = False
        self._task: asyncio.Task | None = None
        self._model: YOLO | None = None
        self._last_alert: dict[str, datetime] = {}

    async def start(self):
        if self.running:
            return
        self._model = YOLO("yolov8n.pt")  # downloads on first run
        self.running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def _loop(self):
        cap = cv2.VideoCapture(CAMERA_INDEX)
        db = get_supabase()
        try:
            while self.running:
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(0.1)
                    continue

                results = await asyncio.to_thread(self._infer, frame)
                for violation_type, confidence, bbox in results:
                    await self._maybe_save_alert(db, violation_type, confidence, bbox, frame)

                await asyncio.sleep(0.05)  # ~20 fps
        finally:
            cap.release()

    def _infer(self, frame: np.ndarray) -> list[tuple[str, float, list]]:
        results = self._model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        violations = []
        for r in results:
            for box in r.boxes:
                cls_name = self._model.names[int(box.cls[0])].lower()
                if cls_name in VIOLATION_CLASSES:
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    violations.append((cls_name, conf, xyxy))
        return violations

    async def _maybe_save_alert(self, db, violation_type: str, confidence: float, bbox: list, frame: np.ndarray):
        now = datetime.now(timezone.utc)
        last = self._last_alert.get(violation_type)
        if last and (now - last).total_seconds() < ALERT_COOLDOWN_SECONDS:
            return
        self._last_alert[violation_type] = now

        # Encode frame snapshot as base64
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        snapshot_b64 = base64.b64encode(buf).decode()

        await asyncio.to_thread(
            db.table("alerts").insert({
                "violation_type": violation_type,
                "confidence": round(confidence, 4),
                "bbox": bbox,
                "snapshot_b64": snapshot_b64,
                "camera_id": f"cam-{CAMERA_INDEX}",
                "created_at": now.isoformat(),
            }).execute
        )
