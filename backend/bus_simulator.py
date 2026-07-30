import time
import json
import random
import requests
import paho.mqtt.client as mqtt

# MQTT configuration
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "safebus/telemetry"

# Planned Route Paths Coordinates
ROUTE_PATHS = {
    "TN38AB1234": [
        (13.0850, 80.2101),  # Anna Nagar Depot
        (13.0820, 80.2120),  # Anna Nagar Roundtana
        (13.0780, 80.2150),  # Aminjikarai
        (13.0720, 80.2220),  # Kilpauk
        (13.0650, 80.2300),  # Chetpet
        (13.0569, 80.2425)   # School Campus (Nungambakkam)
    ],
    "TN38CD5678": [
        (13.0373, 80.1943),  # KK Nagar Depot
        (13.0420, 80.2020),  # Ashok Nagar
        (13.0470, 80.2150),  # West Mambalam
        (13.0520, 80.2250),  # Kodambakkam
        (13.0569, 80.2425)   # School Campus (Nungambakkam)
    ]
}

def simulate_buses():
    # Initialize MQTT client
    client = mqtt.Client()
    mqtt_connected = False
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        mqtt_connected = True
        print("Connected to MQTT Broker. Telemetry will be broadcasted via MQTT.")
    except Exception as e:
        print(f"MQTT Broker offline ({e}). Falling back to HTTP telemetry REST postings.")

    # Tracking index along the paths
    path_indices = {bus_id: 0 for bus_id in ROUTE_PATHS.keys()}
    iteration = 0
    
    while True:
        iteration += 1
        print(f"\n--- Simulation Cycle #{iteration} ---")
        
        for bus_id, path in ROUTE_PATHS.items():
            idx = path_indices[bus_id]
            lat, lng = path[idx]
            
            # 1. Base telemetry values (Speed & Acceleration)
            speed = random.randint(30, 48)
            acceleration = round(random.uniform(0.01, 0.15), 2) # g's
            
            # 2. Inject occasional safety anomalies to demonstrate AI/ML triggers
            if iteration % 4 == 0 and bus_id == "TN38AB1234":
                # Inject speed violation
                speed = 68 
                print(f"[Simulation Alert] Injecting Speed violation on Bus {bus_id} ({speed} km/h)")
            elif iteration % 6 == 0 and bus_id == "TN38CD5678":
                # Inject harsh deceleration (braking) anomaly
                acceleration = 0.58
                print(f"[Simulation Alert] Injecting Harsh Braking anomaly on Bus {bus_id} ({acceleration}g)")
            elif iteration % 8 == 0 and bus_id == "TN38AB1234":
                # Inject GPS Route deviation (deviate coordinate by ~300 meters)
                lat += 0.003
                lng -= 0.003
                print(f"[Simulation Alert] Injecting Path geofence deviation on Bus {bus_id}")
                
            # Build telemetry payload
            payload = {
                "busId": bus_id,
                "latitude": lat,
                "longitude": lng,
                "speed": speed,
                "acceleration": acceleration
            }
            
            # Send payload
            if mqtt_connected:
                # 541: Broadcast via MQTT topic
                client.publish(MQTT_TOPIC, json.dumps(payload))
                print(f"Published MQTT: {payload}")
            else:
                # HTTP REST fallback direct ingestion
                try:
                    res = requests.post("http://localhost:5000/api/telemetry", json=payload, timeout=3)
                    print(f"POST HTTP: {payload} -> Response: {res.status_code}")
                except Exception as err:
                    print(f"Flask API offline. Ingestion failed: {err}")
                    
            # Increment path coordinates index
            path_indices[bus_id] = (idx + 1) % len(path)
            
        # Broadcast interval (PDF requirement: sends location + speed + acceleration every 10 seconds)
        time.sleep(10)

if __name__ == "__main__":
    print("Starting Driving Telemetry GPS Node Node Simulator...")
    simulate_buses()
