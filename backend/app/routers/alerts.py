from fastapi import APIRouter
from app.services.supabase_client import get_supabase

router = APIRouter()


@router.get("/")
def list_alerts(limit: int = 50, offset: int = 0):
    db = get_supabase()
    response = (
        db.table("alerts")
        .select("id, violation_type, confidence, camera_id, created_at")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"alerts": response.data, "count": len(response.data)}
