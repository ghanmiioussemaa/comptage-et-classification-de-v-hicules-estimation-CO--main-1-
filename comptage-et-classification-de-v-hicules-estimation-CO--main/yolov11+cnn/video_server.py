"""
video_server.py  —  Standalone FastAPI server for vehicle detection & CO2 analysis
Uses single-line crossing logic (same as main.py but without Aller/Retour).

Run with:
    uvicorn video_server:app --port 8001 --reload
"""

import os
import cv2
import time
import uuid
import asyncio
import tempfile
import traceback
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from classifier import CarClassifier
from detector   import VehicleTracker

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════════════════════
YOLO_MODEL     = "yolo11l.pt"
CNN_MODEL_PATH = "my_custom_model.pth"

# Counting line Y position (pixels from top).
# Vehicles are counted when their center crosses this line.
# Adjust based on your video resolution (e.g. 360 for 720p, 540 for 1080p)
COUNT_LINE_Y   = 300

CONF_THRESHOLD = 0.4
DISTANCE_KM    = 24.0    # assumed km per vehicle for CO2 calc

CO2_FACTORS = {
    "convertible": 130.0,
    "coupe":       140.0,
    "hatchback":   120.0,
    "pickup":      240.0,
    "sedan":       150.0,
    "suv":         210.0,
    "van":         230.0,
    "truck":       650.0,
    "bus":         800.0,
    "motorcycle":  80.0,
    "car":         170.0,   # fallback
}

SUBTYPE_TO_MAIN = {
    "convertible": "car",
    "coupe":       "car",
    "hatchback":   "car",
    "pickup":      "car",
    "sedan":       "car",
    "suv":         "car",
    "car":         "car",
    "van":         "truck",
    "truck":       "truck",
    "bus":         "bus",
    "motorcycle":  "motorcycle",
    "motorbike":   "motorcycle",
}

UPLOAD_DIR = Path(tempfile.gettempdir()) / "vehicle_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_MB        = 500

# ══════════════════════════════════════════════════════════════════════════════
#  APP
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="Vehicle CO2 Analysis Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
#  MODEL SINGLETONS
# ══════════════════════════════════════════════════════════════════════════════
_tracker:    VehicleTracker | None = None
_classifier: CarClassifier  | None = None


def get_tracker() -> VehicleTracker:
    global _tracker
    if _tracker is None:
        print(f"[Models] Loading YOLO → {YOLO_MODEL}")
        _tracker = VehicleTracker(model_weight=YOLO_MODEL)
        print(f"[Models] YOLO class list: {_tracker.class_list}")
        print("[Models] YOLO ready ✓")
    return _tracker


def get_classifier() -> CarClassifier:
    global _classifier
    if _classifier is None:
        print(f"[Models] Loading CNN → {CNN_MODEL_PATH}")
        _classifier = CarClassifier(model_path=CNN_MODEL_PATH)
        print("[Models] CNN ready ✓")
    return _classifier


# ══════════════════════════════════════════════════════════════════════════════
#  IN-MEMORY SESSION STORE
# ══════════════════════════════════════════════════════════════════════════════
_sessions: dict[str, dict] = {}

# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════
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


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS  (same logic as main.py)
# ══════════════════════════════════════════════════════════════════════════════
def crossed_line(cy: int, prev_cy: int, line_y: int) -> bool:
    """True when the centre point crosses line_y in either direction."""
    return (prev_cy < line_y <= cy) or (prev_cy > line_y >= cy)


def get_crop(frame, box, padding: int = 10):
    """Crop a detection box from the frame (same as utils.get_crop in main.py)."""
    x1, y1, x2, y2 = map(int, box)
    h, w = frame.shape[:2]
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    return frame[y1:y2, x1:x2]


def refine_label(frame, box, yolo_label: str, classifier: CarClassifier) -> str:
    """
    If YOLO says 'car', run CNN to get the sub-type.
    Everything else passes through directly.
    """
    if yolo_label == "car":
        crop = get_crop(frame, box, padding=10)
        if crop.size == 0:
            return "car"
        predicted = classifier.predict(crop)
        return predicted if predicted != "Unknown" else "car"
    return yolo_label


# ══════════════════════════════════════════════════════════════════════════════
#  PIPELINE  (line-crossing counter, single line, no Aller/Retour)
# ══════════════════════════════════════════════════════════════════════════════
def process_video(video_path: str) -> dict:
    """
    Count vehicles that cross COUNT_LINE_Y.
    Each vehicle (track_id) is counted exactly once when its centre
    crosses the line — same logic as main.py but direction-agnostic.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    tracker    = get_tracker()
    classifier = get_classifier()

    # track_id → previous centre Y
    history:   dict[int, int] = {}
    # track_ids that already crossed the line
    processed: set[int]       = set()
    # track_id → refined label (for display / logging)
    labels:    dict[int, str] = {}
    # final counts: label → count
    vehicle_counts: dict[str, int] = {}

    frame_idx = 0

    # Detect video height to auto-adjust line if needed
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    line_y = COUNT_LINE_Y if COUNT_LINE_Y < height else height // 2
    print(f"[Pipeline] Video height={height}px  counting line Y={line_y}px")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        # Run every frame (no skipping) for accurate line-crossing detection
        results = tracker.track(frame)
        if not results or results[0].boxes is None:
            continue
        if results[0].boxes.id is None:
            continue

        boxes       = results[0].boxes.xyxy.cpu().tolist()
        track_ids   = results[0].boxes.id.int().cpu().tolist()
        class_idxs  = results[0].boxes.cls.int().cpu().tolist()
        confs       = results[0].boxes.conf.cpu().tolist()

        current_ids = set()

        for box, track_id, cls_idx, conf in zip(boxes, track_ids, class_idxs, confs):
            current_ids.add(track_id)

            if conf < CONF_THRESHOLD:
                continue

            x1, y1, x2, y2 = map(int, box)
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2

            yolo_label = tracker.class_list[cls_idx]

            if track_id in history:
                prev_cy = history[track_id]

                if crossed_line(cy, prev_cy, line_y) and track_id not in processed:
                    processed.add(track_id)

                    # Refine label with CNN if it's a car
                    label = refine_label(frame, box, yolo_label, classifier)
                    labels[track_id] = label

                    vehicle_counts[label] = vehicle_counts.get(label, 0) + 1
                    print(f"[Pipeline] ✅ Crossed line → ID={track_id} "
                          f"yolo='{yolo_label}' final='{label}' "
                          f"total so far={sum(vehicle_counts.values())}")

            history[track_id] = cy

        # Clean up IDs that left the frame
        for tid in list(history.keys()):
            if tid not in current_ids:
                del history[tid]

    cap.release()

    print(f"\n[Pipeline] ── Final counts ─────────────────────")
    print(f"[Pipeline] vehicle_counts : {vehicle_counts}")
    print(f"[Pipeline] frames total   : {frame_idx}")
    print(f"[Pipeline] unique crossed : {len(processed)}")
    print(f"[Pipeline] ─────────────────────────────────────\n")

    # ── CO2 per sub-type ──────────────────────────────────────────────────────
    by_type: dict[str, float] = {}
    for label, cnt in vehicle_counts.items():
        factor         = CO2_FACTORS.get(label, CO2_FACTORS["car"])
        by_type[label] = round(factor * cnt * DISTANCE_KM / 1000, 3)  # kg

    total_kg_per_day = round(sum(by_type.values()), 2)

    # ── Roll up to 4 main categories ─────────────────────────────────────────
    main_counts: dict[str, int] = {}
    for label, cnt in vehicle_counts.items():
        main = SUBTYPE_TO_MAIN.get(label, label)
        main_counts[main] = main_counts.get(main, 0) + cnt

    return {
        "vehicle_counts":   vehicle_counts,
        "main_counts":      main_counts,
        "by_type":          by_type,
        "total_kg_per_day": total_kg_per_day,
        "distance_km":      DISTANCE_KM,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  BACKGROUND TASK
# ══════════════════════════════════════════════════════════════════════════════
async def run_pipeline(session_id: str, video_path: str):
    _sessions[session_id]["status"] = "processing"
    start = time.time()
    try:
        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, process_video, video_path)
        _sessions[session_id].update({
            "status":                  "completed",
            "result":                  result,
            "processing_time_seconds": round(time.time() - start, 2),
        })
        print(f"[Session {session_id}] ✅ completed in {round(time.time()-start,1)}s")
    except Exception as exc:
        traceback.print_exc()
        _sessions[session_id].update({"status": "failed", "error": str(exc)})
        print(f"[Session {session_id}] ❌ failed: {exc}")
    finally:
        try:
            os.remove(video_path)
        except OSError:
            pass


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/health")
def health():
    return {"status": "ok", "server": "video-analysis", "line_y": COUNT_LINE_Y}


@app.post("/api/video/upload", response_model=SessionStatus, status_code=202)
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(415, f"Unsupported type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}")

    session_id = str(uuid.uuid4())
    dest       = UPLOAD_DIR / f"{session_id}{ext}"

    try:
        bytes_written = 0
        with dest.open("wb") as f:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > MAX_FILE_MB * 1024 * 1024:
                    dest.unlink(missing_ok=True)
                    raise HTTPException(413, f"File exceeds {MAX_FILE_MB} MB")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Upload failed: {exc}")

    _sessions[session_id] = {
        "status":     "pending",
        "result":     None,
        "error":      None,
        "created_at": time.time(),
    }

    asyncio.create_task(run_pipeline(session_id, str(dest)))
    print(f"[Session {session_id}] uploaded '{file.filename}', analysis started")

    return SessionStatus(session_id=session_id, status="pending")


@app.get("/api/video/session/{session_id}", response_model=SessionStatus)
def get_session(session_id: str):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return SessionStatus(
        session_id=session_id,
        status=session["status"],
        error=session.get("error"),
    )


@app.get("/api/video/results/{session_id}", response_model=VideoResult)
def get_results(session_id: str):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    if session["status"] == "failed":
        return VideoResult(session_id=session_id, status="failed", error=session.get("error"))

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


@app.delete("/api/video/session/{session_id}", status_code=204)
def delete_session(session_id: str):
    _sessions.pop(session_id, None)
    return JSONResponse(status_code=204, content=None)


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("video_server:app", host="0.0.0.0", port=8001, reload=True)