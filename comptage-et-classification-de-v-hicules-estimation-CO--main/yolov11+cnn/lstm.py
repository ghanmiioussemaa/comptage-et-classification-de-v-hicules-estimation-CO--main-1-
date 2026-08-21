from fastapi import FastAPI
import os
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
import pandas as pd
from lstm_engine import LSTMPredictor
import numpy as np
from datetime import datetime, timedelta

app = FastAPI()

# Autoriser React à communiquer avec Python
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

BASE_DIR = Path(__file__).resolve().parent

# Initialisation de l'IA
ai_engine = LSTMPredictor(
    model_path=str(BASE_DIR / "traffic_lstm_model.h5"),
    scaler_x_path=str(BASE_DIR / "scaler_X.pkl"),
    scaler_y_path=str(BASE_DIR / "scaler_Y.pkl")
)

# Connexion MySQL
engine = create_engine("mysql+pymysql://root:ghaith@localhost/traffic_ml_db")

@app.get("/predict-live")
async def get_prediction():
    query = """
    SELECT 
        interval_start, hour_of_day as hour, day_of_week as dayofweek,
        SUM(CASE WHEN vehicle_type = 'convertible' THEN vehicle_count ELSE 0 END) AS convertible,
        SUM(CASE WHEN vehicle_type = 'coupe' THEN vehicle_count ELSE 0 END) AS coupe,
        SUM(CASE WHEN vehicle_type = 'hatchback' THEN vehicle_count ELSE 0 END) AS hatchback,
        SUM(CASE WHEN vehicle_type = 'pickup' THEN vehicle_count ELSE 0 END) AS pickup,
        SUM(CASE WHEN vehicle_type = 'suv' THEN vehicle_count ELSE 0 END) AS suv,
        SUM(CASE WHEN vehicle_type = 'sedan' THEN vehicle_count ELSE 0 END) AS sedan,
        SUM(CASE WHEN vehicle_type = 'van' THEN vehicle_count ELSE 0 END) AS van,
        SUM(CASE WHEN vehicle_type = 'bus' THEN vehicle_count ELSE 0 END) AS bus,
        SUM(CASE WHEN vehicle_type = 'truck' THEN vehicle_count ELSE 0 END) AS truck,
        SUM(CASE WHEN vehicle_type = 'moto' THEN vehicle_count ELSE 0 END) AS moto
    FROM traffic_intervals
    GROUP BY interval_start, hour_of_day, day_of_week
    ORDER BY interval_start DESC
    LIMIT 12;
    """
    
    try:
        df = pd.read_sql(query, engine)
        
        if len(df) < 12:
            return {"status": "error", "message": f"Besoin de 12 intervalles (trouvé: {len(df)})"}

        # 1. IMPORTANT : Inverser le dataframe pour que l'ordre soit chronologique (du plus ancien au plus récent)
        df_input = df.iloc[::-1].reset_index(drop=True)

        # 2. Lancer la prédiction via le moteur LSTM
        predictions = ai_engine.predict(df_input)

        # 3. Extraction et calcul des moyennes
        pred_vals = [p['value'] for p in predictions]
        predicted_counts = [int(max(0, round(float(v)))) for v in pred_vals]
        
        # Moyenne totale prédite sur l'heure à venir
        total_predicted = sum(predicted_counts)
        avg_predicted = total_predicted / 12

        # 4. Calcul de la répartition par type (Logiciel)
        # On utilise des ratios de distribution réels pour diviser le total prédit par l'IA
        total_cars = int(total_predicted * 0.65)
        
        metrics = {
            "avg_co2": round(avg_predicted * 0.18, 2),
            "total_vehicles": int(total_predicted),
            "vehicle_types": {
                "voiture": total_cars,
                "camion": int(total_predicted * 0.13),
                "bus": int(total_predicted * 0.09),
                "moto": int(total_predicted * 0.13),
            },
            "car_subtypes": [
                {"label": "Sedan", "count": int(total_cars * 0.35)},
                {"label": "SUV", "count": int(total_cars * 0.25)},
                {"label": "Hatchback", "count": int(total_cars * 0.15)},
                {"label": "Pickup", "count": int(total_cars * 0.10)},
                {"label": "Van/Autres", "count": int(total_cars * 0.15)}
            ]
        }

        # 5. Génération des timestamps futurs
        now = datetime.now()
        future_timestamps = [(now + timedelta(minutes=5 * (i + 1))).strftime("%H:%M") for i in range(12)]

        return {
            "status": "success",
            "metrics": metrics,
            "predicted_counts": predicted_counts,
            "future_timestamps": future_timestamps,
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)