import cv2
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.supabase_client import get_supabase
from app.services.camera_stream import camera_buffer
from app.services.detector import VIOLATION_CLASSES, CONFIDENCE_THRESHOLD

router = APIRouter()
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")

COLORS = {
    "no-hardhat":     (0, 0, 255),
    "no-safety vest": (0, 140, 255),
    "no-mask":        (0, 255, 255),
    "hardhat":        (0, 255, 0),
    "safety vest":    (0, 255, 0),
    "person":         (200, 200, 200),
}


def _generate_frames():
    from ultralytics import YOLO
    model = YOLO(MODEL_PATH)
    while True:
        frame = camera_buffer.get_frame()
        if frame is None:
            import time
            time.sleep(0.05)
            continue

        results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        for r in results:
            for box in r.boxes:
                cls_name = model.names[int(box.cls[0])].lower()
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                color = COLORS.get(cls_name, (180, 180, 180))
                is_violation = cls_name in VIOLATION_CLASSES
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3 if is_violation else 1)
                cv2.putText(frame, f"{cls_name} {conf:.0%}",
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")


@router.get("/stream")
def stream():
    return StreamingResponse(
        _generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/")
def list_cameras():
    db = get_supabase()
    response = db.table("cameras").select("*").execute()
    return {"cameras": response.data}
