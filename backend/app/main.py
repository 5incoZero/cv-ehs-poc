from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import camera, alerts, analysis
from app.services.detector import DetectorService

app = FastAPI(title="CV-EHS-POC API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(camera.router, prefix="/camera", tags=["camera"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])

detector = DetectorService()


@app.on_event("startup")
async def startup():
    await detector.start()


@app.on_event("shutdown")
async def shutdown():
    await detector.stop()


@app.get("/health")
def health():
    return {"status": "ok", "detector_running": detector.running}


@app.post("/detector/start")
async def start_detector():
    await detector.start()
    return {"status": "started", "running": detector.running}


@app.post("/detector/stop")
async def stop_detector():
    await detector.stop()
    return {"status": "stopped", "running": detector.running}
