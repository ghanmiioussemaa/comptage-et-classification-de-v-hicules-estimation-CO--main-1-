import cv2
import torch
import torch.nn as nn
import numpy as np
from torchvision import models

# ==========================================================
# 1. THE ARCHITECTURE (Must match your training script)
# ==========================================================
class CarBodyClassifier(nn.Module):
    def __init__(self, num_classes=7, dropout=0.3):
        super().__init__()
        # Use the same backbone as your Kaggle script
        backbone = models.efficientnet_b0(weights=None) 
        in_features = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()
        self.backbone = backbone

        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.backbone(x)
        return self.classifier(x)

# ==========================================================
# 2. THE WRAPPER CLASS
# ==========================================================
class CarClassifier:
    def __init__(self, model_path='my_custom_model.pth'):
        self.classes = ['convertible', 'coupe', 'hatchback', 'pickup', 'sedan', 'suv', 'van']
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize the architecture shell
        # Use the dropout from your best params (looks like 0.2 or 0.3)
        self.model = CarBodyClassifier(num_classes=7, dropout=0.3)
        
        try:
            # Load the state_dict (the dictionary)
            state_dict = torch.load(model_path, map_location=self.device)
            
            # Load weights into the shell
            self.model.load_state_dict(state_dict)
            self.model.to(self.device)
            self.model.eval()
            print(f"✅ Success: Model loaded on {self.device}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")

    def preprocess(self, crop):
        """Matches the val_test_transforms from your script."""
        img = cv2.resize(crop, (224, 224))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Normalization values from your script
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        
        img = img.astype(np.float32) / 255.0
        img = (img - mean) / std
        
        # HWC to CHW and add Batch dimension
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        
        return torch.from_numpy(img).float().to(self.device)

    def predict(self, crop):
        if crop is None or crop.size == 0:
            return "Unknown"

        input_tensor = self.preprocess(crop)

        with torch.no_grad():
            output = self.model(input_tensor)
            index = torch.argmax(output, dim=1).item()
            return self.classes[index]