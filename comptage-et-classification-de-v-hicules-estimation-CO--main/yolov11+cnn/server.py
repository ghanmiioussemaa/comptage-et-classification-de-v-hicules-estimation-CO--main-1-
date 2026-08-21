import asyncio
import cv2
import time
from datetime import datetime
from collections import defaultdict
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from live_fetcher import get_video_capture
from detector import VehicleTracker
from classifier import CarClassifier
from database import TrafficLogger
import utils

# --- CONFIGURATION ---
VIDEO_PATH = "https://www.youtube.com/watch?v=PNCJQkvALVc"  

YOLO_MODEL = 'yolo11l.pt'
CNN_MODEL_PATH = 'my_custom_model.pth'

LINE_A_Y = 250  # ALLER (Bottom)
LINE_B_Y = 200  # RETOUR (Top)
INTERVAL_SECONDS = 300 

# --- INITIALIZATION (Run once on startup) ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading AI Models...")
tracker = VehicleTracker(YOLO_MODEL)
re_classifier = CarClassifier(CNN_MODEL_PATH)
db_logger = TrafficLogger(password="ghaith")
print("Models Loaded. Server Ready.")


def get_vehicle_metrics(frame, box, yolo_label, re_classifier):
    """Refines vehicle type and gets associated CO2."""
    refined_type = yolo_label
    
    if yolo_label == 'car':
        crop = utils.get_crop(frame, box, padding=10)
        refined_type = re_classifier.predict(crop)
    
    co2_g = utils.CO2_FACTORS.get(refined_type.lower(), 180)
    return refined_type, co2_g


def process_frame_headless(frame, tracker, re_classifier, state):
    """Main logic optimized for background processing (no visual drawing)."""
    results = tracker.track(frame)
    current_track_ids = set()
    
    if results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().tolist()
        track_ids = results[0].boxes.id.int().cpu().tolist()
        class_indices = results[0].boxes.cls.int().cpu().tolist()

        for box, track_id, cls_idx in zip(boxes, track_ids, class_indices):
            current_track_ids.add(track_id)
            x1, y1, x2, y2 = map(int, box)
            cy = (y1 + y2) // 2
            yolo_label = tracker.class_list[cls_idx]

            # Movement Direction Logic
            if track_id in state['history']:
                prev_cy = state['history'][track_id]
                direction = None

                if utils.is_crossing_line_a(cy, prev_cy, LINE_A_Y):
                    direction = "Aller"
                elif utils.is_crossing_line_b(cy, prev_cy, LINE_B_Y):
                    direction = "Retour"

                if direction and track_id not in state['processed']:
                    state['processed'].add(track_id)
                    
                    # 1. Get refined type and CO2
                    v_type, co2_g = get_vehicle_metrics(frame, box, yolo_label, re_classifier)
                    
                    print(f"✅ COUNTED: {yolo_label} (Type: {v_type}) | Direction: {direction} | Track ID: {track_id}")
                    
                    # 2. Store for DB (5min interval)
                    state['interval_data'][direction][v_type][0] += 1
                    state['interval_data'][direction][v_type][1] += co2_g
                    
                    # 3. Update React WebSocket Payload state
                    if yolo_label == 'car':
                        if v_type in state['ws_payload']['cars']:
                            state['ws_payload']['cars'][v_type] += 1
                        else:
                            state['ws_payload']['cars']['sedan'] += 1 
                    elif yolo_label == 'van':
                        state['ws_payload']['van'] += 1
                    elif yolo_label == 'motorcycle':
                        state['ws_payload']['motorcycle'] += 1
                    elif yolo_label == 'bus':
                        state['ws_payload']['bus'] += 1
                    elif yolo_label == 'truck':
                        state['ws_payload']['trucks'] += 1

            state['history'][track_id] = cy
    
    # Clean up: Remove track IDs that are no longer in the frame
    # This allows them to be counted again if they reappear
    track_ids_to_remove = [tid for tid in state['history'] if tid not in current_track_ids]
    for tid in track_ids_to_remove:
        if tid in state['history']:
            del state['history'][tid]
        # Note: Keep in 'processed' to avoid double-counting the same vehicle


@app.websocket("/ws/traffic")
async def traffic_websocket(websocket: WebSocket):
    await websocket.accept()
    print("React Frontend Connected!")
    
    cap = get_video_capture(VIDEO_PATH)
    
    # SYSTEM STATE (Includes the exact format requested for the frontend)
    state = {
        'history': {},          
        'processed': set(),     
        'interval_data': {      
            "Aller": defaultdict(lambda: [0, 0.0]),
            "Retour": defaultdict(lambda: [0, 0.0])
        },
        'ws_payload': {
            "cars": {
                "convertible": 0,
                "coupe": 0,
                "hatchback": 0,
                "pickup": 0,
                "sedan": 0,
                "suv": 0,
            },
            "van": 0,
            "motorcycle": 0,
            "bus": 0,
            "trucks": 0
        }
    }

    start_time = time.time()
    interval_dt = datetime.now()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: 
                print(f"Video Resolution: {frame.shape[1]}x{frame.shape[0]}")
                break

            # 1. Run detection logic (updates state['ws_payload'] automatically)
            process_frame_headless(frame, tracker, re_classifier, state)

            # 2. Send the requested format to React
            await websocket.send_json(state['ws_payload'])

            # 3. Handle Database 5-Minute Interval
            if time.time() - start_time >= INTERVAL_SECONDS:
                db_logger.save_interval(interval_dt, state['interval_data'])
                
                # Reset Interval Stats for DB (Do NOT reset ws_payload so React shows cumulative totals)
                start_time = time.time()
                interval_dt = datetime.now()
                state['interval_data'] = {
                    "Aller": defaultdict(lambda: [0, 0.0]),
                    "Retour": defaultdict(lambda: [0, 0.0])
                }
                print(f"Interval Saved to DB: {interval_dt.strftime('%H:%M:%S')}")

            # 4. Crucial sleep to keep WebSocket alive
            await asyncio.sleep(0.01)

    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        cap.release()
        await websocket.close()
        print("Frontend Disconnected. Stream closed.")


if __name__ == "__main__":
    import uvicorn
    # Start the server
    uvicorn.run(app, host="127.0.0.1", port=8000)