import os
import pickle
import numpy as np
import pandas as pd
from typing import List, Dict
import warnings

warnings.filterwarnings("ignore")

try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    from tensorflow.keras.layers import InputLayer
    from tensorflow.keras.utils import custom_object_scope
    
    # --- CONFIGURATION DE COMPATIBILITÉ ---
    class FakeDTypePolicy:
        def __init__(self, *args, **kwargs): pass
        @classmethod
        def from_config(cls, config): return cls()
        def get_config(self): return {}

    original_from_config = InputLayer.from_config
    def patched_from_config(cls, config):
        if 'batch_shape' in config:
            config['batch_input_shape'] = config.pop('batch_shape')
        return original_from_config.__func__(cls, config) if hasattr(original_from_config, '__func__') else original_from_config(config)
    
    InputLayer.from_config = classmethod(patched_from_config)
except Exception:
    tf = None
    load_model = None

class LSTMPredictor:
    # Les 17 colonnes nécessaires pour ton modèle
    FEATURE_COLS = [
        'convertible', 'coupe', 'hatchback', 'pickup', 'suv', 
        'sedan', 'van', 'bus', 'truck', 'moto',
        'sin_hour', 'cos_hour', 'sin_day', 'cos_day', 'sin_month', 'cos_month', 'is_weekend'
    ]

    def __init__(self, model_path: str, scaler_x_path: str = None, scaler_y_path: str = None):
        if load_model is None:
            raise RuntimeError("TensorFlow n'est pas installé dans cet environnement.")

        # Chargement avec gestion des erreurs de version (Keras 2 vs 3)
        with custom_object_scope({'DTypePolicy': FakeDTypePolicy, 'InputLayer': InputLayer}):
            try:
                self.model = load_model(model_path, compile=False)
                print("✅ Modèle LSTM chargé avec succès.")
            except Exception as e:
                print(f"⚠️ Chargement standard échoué, tentative alternative : {e}")
                self.model = load_model(model_path, custom_objects={'InputLayer': InputLayer}, compile=False)

        self.scaler_x = self._safe_load(scaler_x_path)
        self.scaler_y = self._safe_load(scaler_y_path)

    def _safe_load(self, path):
        if not path or not os.path.exists(path): return None
        try:
            import joblib
            return joblib.load(path)
        except:
            with open(path, 'rb') as f: return pickle.load(f)

    def _prepare_x(self, df):
        """Prépare les données en entrée avec encodage cyclique (17 features)."""
        df_proc = df.copy()
        
        # Sécurité pour le mois
        if 'month' not in df_proc.columns:
            df_proc['month'] = pd.Timestamp.now().month

        # Encodage cyclique temporel
        df_proc["sin_hour"]  = np.sin(2 * np.pi * df_proc["hour"] / 24)
        df_proc["cos_hour"]  = np.cos(2 * np.pi * df_proc["hour"] / 24)
        df_proc["sin_day"]   = np.sin(2 * np.pi * df_proc["dayofweek"] / 7)
        df_proc["cos_day"]   = np.cos(2 * np.pi * df_proc["dayofweek"] / 7)
        df_proc["sin_month"] = np.sin(2 * np.pi * df_proc["month"] / 12)
        df_proc["cos_month"] = np.cos(2 * np.pi * df_proc["month"] / 12)
        df_proc["is_weekend"] = df_proc["dayofweek"].apply(lambda x: 1.0 if x >= 5 else 0.0)

        # Sélection des colonnes dans l'ordre exact de l'entraînement
        X = df_proc[self.FEATURE_COLS].astype(float).values
        
        if self.scaler_x is not None:
            X = self.scaler_x.transform(X)
        
        # Reshape pour LSTM : (batch_size=1, timesteps=1, features=17)
        return X[np.newaxis, ...]

    def predict(self, df) -> List[Dict]:
        """Exécute la prédiction et gère le scaling de sortie (inverse transform)."""
        X = self._prepare_x(df)
        raw = self.model.predict(X, verbose=0)
        
        # Aplatir le résultat (Horizon 12)
        preds = np.array(raw).flatten()

        # Inverse Transform sécurisé contre les erreurs de dimension (Broadcast)
        if self.scaler_y is not None:
            try:
                # Format standard (12 lignes, 1 colonne)
                preds = self.scaler_y.inverse_transform(preds.reshape(-1, 1)).flatten()
            except:
                try:
                    # Format alternatif (1 ligne, 12 colonnes)
                    preds = self.scaler_y.inverse_transform(preds.reshape(1, -1)).flatten()
                except Exception as e:
                    print(f"⚠️ Erreur de dé-normalisation : {e}")

        # Retourner les 12 pas de temps formatés pour le JSON
        return [{"step": i + 1, "value": round(float(v), 4)} for i, v in enumerate(preds)]