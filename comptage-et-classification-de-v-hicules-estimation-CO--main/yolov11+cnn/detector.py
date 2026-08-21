from ultralytics import YOLO

class VehicleTracker:
    def __init__(self, model_weight='yolo11l.pt'):
        self.model = YOLO(model_weight)
        self.class_list = self.model.names

    def track(self, frame):
        # We use your specific classes: car, bus, truck, etc.
        return self.model.track(frame, persist=True, classes=[1,2,3,5,6,7], verbose=False)