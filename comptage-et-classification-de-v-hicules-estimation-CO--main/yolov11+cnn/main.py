import cv2
import time
from datetime import datetime
from collections import defaultdict
from live_fetcher import get_video_capture


# Your custom modules
from detector import VehicleTracker
from classifier import CarClassifier
from database import TrafficLogger # The class we created in the previous step
import utils

# --- CONFIGURATION ---
VIDEO_PATH = "https://www.youtube.com/watch?v=PNCJQkvALVc"  # YouTube URL

YOLO_MODEL = 'yolo11l.pt'
CNN_MODEL_PATH = 'my_custom_model.pth'

# Two-Line System
LINE_A_Y = 250  # ALLER (Bottom)
LINE_B_Y = 200  # RETOUR (Top)
INTERVAL_SECONDS = 30 

# 1. INITIALIZATION
tracker = VehicleTracker(YOLO_MODEL)
re_classifier = CarClassifier(CNN_MODEL_PATH)
db_logger = TrafficLogger(password="ghaith")

def get_vehicle_metrics(frame, box, yolo_label, re_classifier):
    """Refines vehicle type and gets associated CO2."""
    refined_type = yolo_label
    
    if yolo_label == 'car':
        crop = utils.get_crop(frame, box, padding=10)
        refined_type = re_classifier.predict(crop)
    
    # Get CO2 factor from your utils dictionary
    co2_g = utils.CO2_FACTORS.get(refined_type.lower(), 180)
    return refined_type, co2_g

def process_frame(frame, tracker, re_classifier, state):
    """Main logic for tracking, direction detection, and counting."""
    results = tracker.track(frame)
    
    # Draw Visual Lines
    cv2.line(frame, (0, LINE_A_Y), (frame.shape[1], LINE_A_Y), (0, 255, 0), 2) # Green
    cv2.line(frame, (0, LINE_B_Y), (frame.shape[1], LINE_B_Y), (0, 0, 255), 2) # Red

    if results[0].boxes.id is not None:
        boxes = results[0].boxes.xyxy.cpu().tolist()
        track_ids = results[0].boxes.id.int().cpu().tolist()
        class_indices = results[0].boxes.cls.int().cpu().tolist()

        for box, track_id, cls_idx in zip(boxes, track_ids, class_indices):
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
                    
                    # 1. Get refined type and CO2
                    v_type, co2_g = get_vehicle_metrics(frame, box, yolo_label, re_classifier)
                    
                    # 2. Store in current 30s interval bucket
                    state['interval_data'][direction][v_type][0] += 1      # Count
                    state['interval_data'][direction][v_type][1] += co2_g  # Total CO2
                    
                    # 3. Store for real-time display
                    state['display_labels'][track_id] = v_type

            state['history'][track_id] = cy

            # Visuals
            label = state['display_labels'].get(track_id, yolo_label)
            color = (0, 255, 0) if track_id in state['processed'] else (0, 255, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"ID:{track_id} {label}", (x1, y1-10), 0, 0.5, (255, 255, 255), 2)

def main():
    cap = get_video_capture(VIDEO_PATH)
    
    # SYSTEM STATE
    state = {
        'history': {},          # {id: last_cy}
        'processed': set(),     # {id1, id2...}
        'display_labels': {},   # {id: 'suv'}
        'interval_data': {      # Data to be sent to MySQL
            "Aller": defaultdict(lambda: [0, 0.0]),
            "Retour": defaultdict(lambda: [0, 0.0])
        }
    }

    start_time = time.time()
    interval_dt = datetime.now()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        # Run detection and counting logic
        process_frame(frame, tracker, re_classifier, state)

        # CHECK 30-SECOND TIMER
        if time.time() - start_time >= INTERVAL_SECONDS:
            db_logger.save_interval(interval_dt, state['interval_data'])
            
            # Reset Interval Stats
            start_time = time.time()
            interval_dt = datetime.now()
            state['interval_data'] = {
                "Aller": defaultdict(lambda: [0, 0.0]),
                "Retour": defaultdict(lambda: [0, 0.0])
            }
            print(f"Interval Reset: {interval_dt.strftime('%H:%M:%S')}")

        # Visual Dashboard (Current Interval Totals)
        utils.draw_ui_dual(frame, state['interval_data'])
        
        cv2.imshow('Traffic ML Data Collector', frame)
        if cv2.waitKey(1) & 0xFF in [27, ord('q')]: break

    cap.release()
    cv2.destroyAllWindows()
    db_logger.close()

if __name__ == "__main__":
    main()