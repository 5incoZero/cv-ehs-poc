import asyncio
import base64
import os
import tempfile
import uuid
from datetime import datetime, timezone

import cv2
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
import json

from app.services.detector import VIOLATION_CLASSES, CONFIDENCE_THRESHOLD

router = APIRouter()

MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")


def _analyze_video(video_path: str):
    """Generator que analiza el video y hace yield de eventos SSE."""
    from ultralytics import YOLO
    model = YOLO(MODEL_PATH)

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_idx    = 0
    violations   = []

    # Analizar 1 frame cada 0.5 segundos para mayor velocidad
    step = max(1, int(fps * 0.5))

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % step == 0:
                results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
                timestamp_sec = frame_idx / fps

                for r in results:
                    for box in r.boxes:
                        cls_name = model.names[int(box.cls[0])].lower()
                        conf = float(box.conf[0])
                        if cls_name in VIOLATION_CLASSES:
                            # Dibujar bbox en el frame
                            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                            cv2.putText(frame, f"{cls_name} {conf:.0%}",
                                        (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                            snap = base64.b64encode(buf).decode()

                            violation = {
                                "id":             str(uuid.uuid4()),
                                "timestamp_sec":  round(timestamp_sec, 2),
                                "timestamp_fmt":  _fmt_time(timestamp_sec),
                                "violation_type": cls_name,
                                "confidence":     round(conf, 3),
                                "snapshot_b64":   snap,
                            }
                            violations.append(violation)

                            # Enviar evento inmediato
                            yield f"data: {json.dumps({'type': 'violation', 'data': violation})}\n\n"

                # Progreso
                pct = round((frame_idx / total_frames) * 100) if total_frames else 0
                yield f"data: {json.dumps({'type': 'progress', 'pct': pct, 'frame': frame_idx})}\n\n"

            frame_idx += 1
    finally:
        cap.release()

    # Resumen final
    summary = {
        "total_violations": len(violations),
        "duration_sec":     round(frame_idx / fps, 1),
        "by_type": {},
    }
    for v in violations:
        t = v["violation_type"]
        summary["by_type"][t] = summary["by_type"].get(t, 0) + 1

    yield f"data: {json.dumps({'type': 'done', 'summary': summary})}\n\n"


def _fmt_time(sec: float) -> str:
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Sube un video y retorna SSE con el progreso y violaciones detectadas."""
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        tmp.close()

        video_path = tmp.name

        def event_stream():
            yield f"data: {json.dumps({'type': 'start', 'filename': file.filename})}\n\n"
            yield from _analyze_video(video_path)

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    except Exception as e:
        os.unlink(tmp.name)
        raise e
