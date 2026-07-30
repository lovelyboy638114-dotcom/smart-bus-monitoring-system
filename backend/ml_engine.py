import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

class BehaviorAnomalyDetector:
    def __init__(self):
        # Create a synthetic dataset of normal driving behavior
        # Normal speed: 20-50 km/h, Normal deceleration: 0.01g - 0.2g
        np.random.seed(42)
        normal_speeds = np.random.uniform(20, 50, 300)
        normal_decel = np.random.uniform(0.01, 0.2, 300)
        
        df_train = pd.DataFrame({
            'speed': normal_speeds,
            'deceleration': normal_decel
        })
        
        # Initialize and fit Isolation Forest
        # contamination represents expected proportion of outliers (anomalies) in training data
        self.model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
        self.model.fit(df_train)

    def analyze_telemetry(self, speed, deceleration):
        """
        Analyzes a single telemetry data point and returns:
        (is_anomaly: bool, score: float, reasons: list[str])
        """
        # Rule-based threshold alerts
        reasons = []
        if speed > 60:
            reasons.append(f"Overspeeding Zone Warning: {speed} km/h exceeds 60 km/h limit")
        
        if deceleration > 0.5:
            reasons.append(f"Harsh Braking Detected: {deceleration}g deceleration exceeds 0.5g safety threshold")
            
        # Isolation Forest Anomaly Detection
        # Reshape for single sample prediction
        X_test = pd.DataFrame([{ 'speed': speed, 'deceleration': deceleration }])
        prediction = self.model.predict(X_test)[0]  # returns -1 for anomaly, 1 for normal
        score = self.model.decision_function(X_test)[0] # anomaly score (lower is more anomalous)
        
        # Flag as anomaly if either Isolation Forest detects it or rules are breached
        is_anomaly = (prediction == -1) or (len(reasons) > 0)
        
        if prediction == -1 and len(reasons) == 0:
            reasons.append("Unusual driving pattern detected by Isolation Forest telemetry filter")
            
        return is_anomaly, float(score), reasons

# Test execution block
if __name__ == "__main__":
    detector = BehaviorAnomalyDetector()
    print("Normal drive check (40 km/h, 0.1g):", detector.analyze_telemetry(40, 0.1))
    print("Overspeed check (65 km/h, 0.1g):", detector.analyze_telemetry(65, 0.1))
    print("Harsh deceleration check (30 km/h, 0.6g):", detector.analyze_telemetry(30, 0.6))
    print("Anomalous drift check (58 km/h, 0.4g):", detector.analyze_telemetry(58, 0.4))
