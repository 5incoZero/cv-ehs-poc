import asyncio
import cv2
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.supabase_client import get_supabase
from app.services.detector import DetectorService, VIOLATION_CLASSES, CONFIDENCE_THRESHOLD
import os

router = APIRouter()

CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))

# Color map for bounding boxes
COLORS = {
    "no-hardhat":    (0, 0, 255),      # rojo
    "no-safety vest":(0, 140, 255),    # naranja
    "no-mask":       (0, 255, 255),    # amarillo
    "hardhat":       (0, 255, 0),      # verde
    "safety vest":   (0, 255, 0),
    "person":        (200, 200, 200),
}

def _generate_frames():
    from ultralytics import YOLO
    model_path = os.getenv("MODEL_PATH", "yolov8n.pt")
    model = YOLO(model_path)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_name = model.names[int(box.cls[0])].lower()
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    color = COLORS.get(cls_name, (180, 180, 180))
                    is_violation = cls_name in VIOLATION_CLASSES
                    thickness = 3 if is_violation else 1
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
                    label = f"{cls_name} {conf:.0%}"
                    cv2.putText(frame, label, (x1, y1 - 8),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
    finally:
        cap.release()


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
