import asyncio
import base64
import os
from datetime import datetime, timezone

import cv2
import numpy as np
from ultralytics import YOLO

from app.services.supabase_client import get_supabase

# Clases EHS — nombres del dataset Construction Safety de Roboflow
VIOLATION_CLASSES = {"no-hardhat", "no-safety vest", "no-mask"}

CONFIDENCE_THRESHOLD   = float(os.getenv("CONFIDENCE_THRESHOLD", "0.40"))
CAMERA_INDEX           = int(os.getenv("CAMERA_INDEX", "0"))
ALERT_COOLDOWN_SECONDS = 10
MODEL_PATH             = os.getenv("MODEL_PATH", "yolov8n.pt")  # reemplazar con best.pt cuando esté disponible


class DetectorService:
    def __init__(self):
        self.running = False
        self._task: asyncio.Task | None = None
        self._model: YOLO | None = None

    async def start(self):
        if self.running:
            return
        print(f"[detector] Cargando modelo: {MODEL_PATH}")
        self._model = YOLO(MODEL_PATH)
        self.running = True
        self._task = asyncio.create_task(self._loop())
        print("[detector] Iniciado ✓")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def _loop(self):
        cap = cv2.VideoCapture(CAMERA_INDEX)
        if not cap.isOpened():
            print(f"[detector] ERROR: No se pudo abrir cámara {CAMERA_INDEX}")
            return
        db = get_supabase()
        last_alert: dict[str, datetime] = {}
        print(f"[detector] Cámara {CAMERA_INDEX} abierta ✓")
        try:
            while self.running:
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(0.1)
                    continue

                violations = await asyncio.to_thread(self._infer, frame)
                for cls, conf, bbox in violations:
                    now = datetime.now(timezone.utc)
                    last = last_alert.get(cls)
                    if last and (now - last).total_seconds() < ALERT_COOLDOWN_SECONDS:
                        continue
                    last_alert[cls] = now
                    await self._save_alert(db, cls, conf, bbox, frame, now)

                await asyncio.sleep(0.2)
        finally:
            cap.release()
            print("[detector] Cámara cerrada")

    def _infer(self, frame: np.ndarray) -> list[tuple[str, float, list]]:
        results = self._model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        violations = []
        for r in results:
            for box in r.boxes:
                cls_name = self._model.names[int(box.cls[0])].lower()
                if cls_name in VIOLATION_CLASSES:
                    conf = float(box.conf[0])
                    bbox = box.xyxy[0].tolist()
                    violations.append((cls_name, conf, bbox))
        return violations

    async def _save_alert(self, db, violation_type, confidence, bbox, frame, now):
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        snapshot_b64 = base64.b64encode(buf).decode()
        await asyncio.to_thread(
            db.table("alerts").insert({
                "violation_type": violation_type,
                "confidence":     round(confidence, 4),
                "bbox":           bbox,
                "snapshot_b64":   snapshot_b64,
                "camera_id":      f"cam-{CAMERA_INDEX}",
                "created_at":     now.isoformat(),
            }).execute
        )
        print(f"[detector] ALERTA guardada: {violation_type} ({confidence:.1%})")
