from fastapi import APIRouter
from app.services.supabase_client import get_supabase

router = APIRouter()


@router.get("/")
def list_cameras():
    db = get_supabase()
    response = db.table("cameras").select("*").execute()
    return {"cameras": response.data}
