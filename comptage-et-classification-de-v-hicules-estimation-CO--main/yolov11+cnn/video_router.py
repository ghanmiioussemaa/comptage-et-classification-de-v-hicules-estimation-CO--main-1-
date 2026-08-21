"""
video_router.py  –  FastAPI router for video analysis
Place this file next to main.py (project root).

Include in main.py with:
    from video_router import router as video_router
    app.include_router(video_router)
"""

import os
import time
import uuid
import asyncio
import tempfile
import traceback
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/video", tags=["video"])

# ── In-memory session store ───────────────────────────────────────────────────
# For production swap this for Redis / a database.
# Structure: { session_id: { status, result, error, created_at } }
_sessions: dict[str, dict] = {}

UPLOAD_DIR = Path(tempfile.gettempdir()) / "vehicle_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_MB        = 500


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class SessionStatus(BaseModel):
    session_id: str
    status:     Literal["pending", "processing", "completed", "failed"]
    error:      str | None = None


class Co2Result(BaseModel):
    vehicle_counts:   dict[str, int]
    main_counts:      dict[str, int]
    by_type:          dict[str, float]
    total_kg_per_day: float
    distance_km:      float


class VideoResult(BaseModel):
    session_id:              str
    status:                  str
    processing_time_seconds: float | None = None
    co2_result:              Co2Result | None = None
    error:                   str | None = None


# ── Background processing task ────────────────────────────────────────────────
async def _run_pipeline(session_id: str, video_path: str):
    """Runs in the background via asyncio.  Offloads blocking work to a thread."""
    _sessions[session_id]["status"] = "processing"
    start = time.time()
    try:
        # Import here so FastAPI starts even if model files are missing
        from video_pipeline import process_video

        # Run the blocking CPU/GPU call in a thread pool so the event loop stays free
        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, process_video, video_path)

        _sessions[session_id].update({
            "status":                  "completed",
            "result":                  result,
            "processing_time_seconds": round(time.time() - start, 2),
        })
    except Exception as exc:
        traceback.print_exc()
        _sessions[session_id].update({
            "status": "failed",
            "error":  str(exc),
        })
    finally:
        # Clean up the temp file
        try:
            os.remove(video_path)
        except OSError:
            pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=SessionStatus, status_code=202)
async def upload_video(file: UploadFile = File(...)):
    """
    Accept a video file, save it, kick off background analysis.
    Returns a session_id the client can poll.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    session_id = str(uuid.uuid4())
    dest       = UPLOAD_DIR / f"{session_id}{ext}"

    # Stream file to disk in chunks (avoids loading entire video into RAM)
    try:
        bytes_written = 0
        with dest.open("wb") as f:
            while chunk := await file.read(1024 * 1024):   # 1 MB chunks
                bytes_written += len(chunk)
                if bytes_written > MAX_FILE_MB * 1024 * 1024:
                    dest.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds {MAX_FILE_MB} MB limit",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    _sessions[session_id] = {
        "status":     "pending",
        "result":     None,
        "error":      None,
        "created_at": time.time(),
    }

    # Fire and forget – do not await
    asyncio.create_task(_run_pipeline(session_id, str(dest)))

    return SessionStatus(session_id=session_id, status="pending")


@router.get("/session/{session_id}", response_model=SessionStatus)
async def get_session(session_id: str):
    """Poll this endpoint until status is 'completed' or 'failed'."""
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStatus(
        session_id=session_id,
        status=session["status"],
        error=session.get("error"),
    )


@router.get("/results/{session_id}", response_model=VideoResult)
async def get_results(session_id: str):
    """Fetch the full result once the session is completed."""
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] == "failed":
        return VideoResult(
            session_id=session_id,
            status="failed",
            error=session.get("error"),
        )

    if session["status"] != "completed":
        return VideoResult(session_id=session_id, status=session["status"])

    r = session["result"]
    return VideoResult(
        session_id=session_id,
        status="completed",
        processing_time_seconds=session.get("processing_time_seconds"),
        co2_result=Co2Result(
            vehicle_counts=r["vehicle_counts"],
            main_counts=r["main_counts"],
            by_type=r["by_type"],
            total_kg_per_day=r["total_kg_per_day"],
            distance_km=r["distance_km"],
        ),
    )


@router.delete("/session/{session_id}", status_code=204)
async def delete_session(session_id: str):
    """Optional: let the client clean up a session."""
    _sessions.pop(session_id, None)
    return JSONResponse(status_code=204, content=None)