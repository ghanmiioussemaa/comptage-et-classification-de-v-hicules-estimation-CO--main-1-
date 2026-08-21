import asyncio
import cv2
import time
from datetime import datetime
from collections import defaultdict
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import threading

from live_fetcher import get_video_capture
from detector import VehicleTracker
from classifier import CarClassifier
from database import TrafficLogger
import utils

# --- CONFIGURATION ---
VIDEO_PATH = "https://www.youtube.com/watch?v=z545k7Tcb5o"

YOLO_MODEL = 'yolo11l.pt'
CNN_MODEL_PATH = 'my_custom_model.pth'

# Two-Line System
LINE_A_Y = 250  # ALLER (Bottom)
LINE_B_Y = 200  # RETOUR (Top)
INTERVAL_SECONDS = 30 

# --- INITIALIZATION ---
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

# Global state for video display
global_state = None
display_frame = None

def get_vehicle_metrics(frame, box, yolo_label, re_classifier):
    """Refines vehicle type and gets associated CO2."""
    refined_type = yolo_label
    
    if yolo_label == 'car':
        crop = utils.get_crop(frame, box, padding=10)
        refined_type = re_classifier.predict(crop)
    
    co2_g = utils.CO2_FACTORS.get(refined_type.lower(), 180)
    return refined_type, co2_g

def process_frame(frame, tracker, re_classifier, state):
    """Main logic for tracking, direction detection, and counting."""
    results = tracker.track(frame)
    current_track_ids = set()
    
    # Draw Visual Lines
    cv2.line(frame, (0, LINE_A_Y), (frame.shape[1], LINE_A_Y), (0, 255, 0), 2)
    cv2.line(frame, (0, LINE_B_Y), (frame.shape[1], LINE_B_Y), (0, 0, 255), 2)

    if results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().tolist()
        track_ids = results[0].boxes.id.int().cpu().tolist()
        class_indices = results[0].boxes.cls.int().cpu().tolist()

        for box, track_id, cls_idx in zip(boxes, track_ids, class_indices):
            current_track_ids.add(track_id)
            x1, y1, x2, y2 = map(int, box)
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
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
                    
                    v_type, co2_g = get_vehicle_metrics(frame, box, yolo_label, re_classifier)
                    
                    state['interval_data'][direction][v_type][0] += 1
                    state['interval_data'][direction][v_type][1] += co2_g
                    
                    state['display_labels'][track_id] = v_type
                    
                    # Update WebSocket payload
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

            # Visuals
            label = state['display_labels'].get(track_id, yolo_label)
            color = (0, 255, 0) if track_id in state['processed'] else (0, 255, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"ID:{track_id} {label}", (x1, y1-10), 0, 0.5, (255, 255, 255), 2)
    
    # Clean up old track IDs
    track_ids_to_remove = [tid for tid in state['history'] if tid not in current_track_ids]
    for tid in track_ids_to_remove:
        if tid in state['history']:
            del state['history'][tid]
    
    return frame


def video_display_thread():
    """Separate thread to display video"""
    global display_frame
    
    while True:
        if display_frame is not None:
            cv2.imshow('Traffic Detection - Main', display_frame)
            if cv2.waitKey(1) & 0xFF in [27, ord('q')]:
                break
        else:
            time.sleep(0.01)


@app.websocket("/ws/traffic")
async def traffic_websocket(websocket: WebSocket):
    global display_frame
    
    await websocket.accept()
    print("Client Connected!")
    
    cap = get_video_capture(VIDEO_PATH)
    
    state = {
        'history': {},
        'processed': set(),
        'display_labels': {},
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
                break

            # Process frame and get annotated frame
            frame = process_frame(frame, tracker, re_classifier, state)
            
            # Update global frame for display thread
            display_frame = frame.copy()

            # Send WebSocket payload
            await websocket.send_json(state['ws_payload'])

            # Check 30-second timer
            if time.time() - start_time >= INTERVAL_SECONDS:
                db_logger.save_interval(interval_dt, state['interval_data'])
                
                print(f"\n📊 Interval saved at {interval_dt.strftime('%H:%M:%S')}")
                print(f"Payload: {state['ws_payload']}")
                
                start_time = time.time()
                interval_dt = datetime.now()
                state['interval_data'] = {
                    "Aller": defaultdict(lambda: [0, 0.0]),
                    "Retour": defaultdict(lambda: [0, 0.0])
                }

            await asyncio.sleep(0.01)

    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        cap.release()
        await websocket.close()
        print("Client Disconnected.")


@app.get("/")
def read_root():
    return {
        "message": "Traffic Detection Server Running",
        "websocket_url": "ws://127.0.0.1:8001/ws/traffic",
        "video_display": "Running in separate window"
    }


if __name__ == "__main__":
    # Start video display thread
    display_thread = threading.Thread(target=video_display_thread, daemon=True)
    display_thread.start()
    
    print("Video display window will appear once client connects...")
    uvicorn.run(app, host="127.0.0.1", port=8001)