import cv2

# --- CO2 EMISSION FACTORS (Grams per Kilometer) ---
# These are averages based on 2024-2025 environmental standards
CO2_FACTORS = {
    'convertible': 130.0,
    'coupe': 140.0,
    'hatchback': 120.0,
    'pickup': 240.0,
    'sedan': 150.0,
    'suv': 210.0,
    'van': 230.0,
    'truck': 650.0,  # Heavy duty
    'bus': 800.0,
    'motorcycle': 80.0,
    'car': 170.0      # Default fallback for YOLO 'car' class
}

def is_crossing_line_a(current_cy, prev_cy, line_a_y):
    """
    ALLER Direction: Detects crossing downwards.
    Triggered when the center Y moves from above the line to below it.
    """
    return prev_cy < line_a_y and current_cy >= line_a_y

def is_crossing_line_b(current_cy, prev_cy, line_b_y):
    """
    RETOUR Direction: Detects crossing upwards.
    Triggered when the center Y moves from below the line to above it.
    """
    return prev_cy > line_b_y and current_cy <= line_b_y

def get_crop(frame, box, padding=15):
    """Safely crops the vehicle from the frame for the CNN."""
    ih, iw, _ = frame.shape
    x1, y1, x2, y2 = map(int, box)
    
    y_min, y_max = max(0, y1-padding), min(ih, y2+padding)
    x_min, x_max = max(0, x1-padding), min(iw, x2+padding)
    
    return frame[y_min:y_max, x_min:x_max]

def draw_ui_dual(frame, interval_data):
    """
    Draws a real-time scoreboard showing counts and CO2 
    for the current 30-second window.
    """
    # Semi-transparent background for the UI
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (320, 280), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    cv2.putText(frame, "LIVE INTERVAL (30s)", (20, 40), 0, 0.7, (255, 255, 255), 2)
    
    y_offset = 75
    for direction in ["Aller", "Retour"]:
        color = (0, 255, 0) if direction == "Aller" else (0, 0, 255)
        cv2.putText(frame, f"--- {direction} ---", (20, y_offset), 0, 0.5, color, 2)
        y_offset += 25
        
        total_dir_co2 = 0
        for v_type, metrics in interval_data[direction].items():
            count, co2 = metrics
            total_dir_co2 += co2
            cv2.putText(frame, f"{v_type}: {count}", (30, y_offset), 0, 0.5, (200, 200, 200), 1)
            y_offset += 20
        
        cv2.putText(frame, f"CO2: {total_dir_co2/1000:.2f}kg", (150, y_offset-20), 0, 0.5, (0, 255, 255), 1)
        y_offset += 10