# cv-ehs-poc

Proof-of-concept: detección de EPP en tiempo real con YOLOv8 + FastAPI + Next.js 14 + Supabase.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | FastAPI + Uvicorn |
| CV/ML | YOLOv8n (Ultralytics) + OpenCV |
| Base de datos | Supabase (PostgreSQL + Realtime) |
| Cámara | Webcam local `cv2.VideoCapture(0)` |

## Setup

### 1. Supabase
Ejecutar `supabase/schema.sql` en el SQL Editor de tu proyecto.

### 2. Backend
```bash
cd backend
cp .env.example .env          # completar credenciales
python -m venv venv
venv\Scripts\activate         # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local   # completar credenciales
npm install
npm run dev
```

Abrir http://localhost:3000

## Violaciones detectadas

- `no-helmet` / `no-hardhat` → Sin casco
- `no-vest` / `no-safety-vest` → Sin chaleco

> El modelo `yolov8n.pt` base no detecta EPP directamente. Para producción se necesita fine-tuning con un dataset EHS (p.ej. [Safety Helmet Detection](https://universe.roboflow.com/joseph-nelson/hard-hat-workers)).
