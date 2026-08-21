# 🚗 Vehicle Counting, Classification & CO₂ Estimation

> An intelligent vehicle counting and classification system with real-time CO₂ emission estimation using YOLOv11l and custom CNN models.

**Authors:** Ghaith Sayari, Oussema Ghanmi, Sahar Elloumi

---

## 📋 Overview

This project provides a comprehensive solution for:
- **Vehicle Detection**: Real-time detection using YOLOv11l
- **Vehicle Classification**: Custom CNN-based reclassification into subcategories
- **CO₂ Estimation**: Calculate emission levels based on vehicle type and traffic patterns
- **Live Dashboard**: Real-time visualization and analytics with React frontend

The system processes video streams or live camera feeds to detect vehicles and classify them into specific subcategories (Convertible, Pickup, Sedan, SUV, Van, Coupe, Hatchback), then estimates CO₂ emissions.

---

## 🛠️ Technology Stack

### Frontend
- **React** (75.7%) - UI framework for interactive dashboard
- **CSS** (6.4%) - Styling and responsive design
- **HTML** (0.2%) - Markup

### Backend & ML
- **Python** (17.7%) - Core ML pipeline and model training
- **FastAPI** - High-performance async API framework
- **WebSocket** - Real-time bidirectional communication

### ML Models
- **YOLOv11l** - Large object detection model for vehicle detection
- **Custom CNN** - Neural network for vehicle sub-classification

---

## ✨ Features

### Core Functionality
✅ **Real-time Vehicle Detection** - YOLOv11l for accurate multi-scale detection
✅ **Intelligent Classification** - 8-class vehicle sub-classification (Convertible, Pickup, Sedan, SUV, Van, Coupe, Hatchback, & more)
✅ **CO₂ Emission Tracking** - Calculate and track emissions by vehicle type
✅ **Live Dashboard** - Real-time statistics and visualizations
✅ **WebSocket Integration** - Low-latency data streaming

### Analytics
- Vehicle count statistics
- Classification distribution charts
- CO₂ emission estimates and trends
- Traffic pattern analysis
- Historical data tracking

---

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- pip & npm

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Ghaith-Sayari/comptage-et-classification-de-v-hicules-estimation-CO-.git
cd comptage-et-classification-de-v-hicules-estimation-CO-

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd Dashboard
npm install
npm run dev
```

---

## 🚀 Usage

### Running the Backend

```bash
# Start FastAPI server with WebSocket support
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Running the Frontend

```bash
cd Dashboard
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Processing a Video/Stream

```python
from vehicle_detector import VehicleDetector

detector = VehicleDetector(
    detection_model='yolov11l',
    classification_model='path/to/custom_cnn_model.pt'
)

results = detector.process_video('path/to/video.mp4')
# or for live camera feed
results = detector.process_stream(camera_index=0)
```

### API Endpoints

#### WebSocket Connection
```
ws://localhost:8000/ws/detection


## 🤖 Model Details

### YOLOv11l Detection Model
- **Type**: Object Detection
- **Input**: Video frames (1920x1080 recommended)
- **Output**: Bounding boxes with confidence scores
- **Classes**: All vehicle types

### Custom CNN Classification Model
- **Architecture**: Multi-class convolutional neural network
- **Input**: Cropped vehicle regions from YOLOv11l detections
- **Classes**: 
  - Convertible
  - Pickup
  - Sedan
  - SUV
  - Van
  - Coupe
  - Hatchback
  - (Other vehicles)
- **Accuracy**: ~92% on validation set

### CO₂ Estimation
Emissions calculated based on:
- Vehicle class (different emission profiles per class)
- Average speed (traffic flow analysis)
- Engine size assumptions per class

---

## 📊 Dashboard Features

### Real-time Metrics
- Live vehicle count
- Classification breakdown (pie/bar charts)
- CO₂ emission totals
- Peak hour analysis

### Analytics
- Historical trends
- Traffic patterns
- Vehicle class distribution
- Emissions by vehicle type

### Configuration
- Adjust detection sensitivity
- Filter by vehicle class
- Set time ranges for analysis
- Export data as CSV/JSON

---

## 🔧 Configuration

Edit `utils.py` to customize:

```python
# Model paths
YOLO_MODEL_PATH = 'models/yolov11l.pt'
CNN_MODEL_PATH = 'models/custom_cnn.pt'

# Detection parameters
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.4

# Video processing
INPUT_WIDTH = 1920
INPUT_HEIGHT = 1080
PROCESS_FPS = 30

# WebSocket
WS_UPDATE_INTERVAL = 0.1  # seconds
```

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| Classification Accuracy | 92% |
| Memory Usage | ~2GB GPU, ~500MB RAM |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] Add real-time tracking (vehicle trajectories)
- [ ] Implement multi-camera support
- [ ] Add vehicle plate detection/OCR
- [ ] Enhance CO₂ calculation with weather data
- [ ] Mobile app for remote monitoring
- [ ] Anomaly detection for traffic incidents
- [ ] Machine learning model optimization
- [ ] Database integration for historical data

---

## 📝 License

This project is open source and available under the MIT License.

---

## 📧 Contact & Support

For questions or suggestions:
- **Ghaith Sayari** - [@Ghaith-Sayari](https://github.com/Ghaith-Sayari)
- **Oussema Ghanmi** - [@oussema-ghanmi](https://github.com/oussema-ghanmi)
- **Sahar Elloumi** - [@sahar-elloumi](https://github.com/sahar-elloumi)

---

## 🙏 Acknowledgments

- YOLOv11 by Ultralytics
- FastAPI community
- React and modern web technologies
- Open source ML community

---

**Last Updated:** 2026-05-10
