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
        (10.9925, 76.9616),  # Ukkadam Bus Stand
        (10.9595, 76.9755),  # Sundarapuram
        (10.9060, 76.9865),  # Eachanari
        (10.8985, 76.9950),  # Karpagam Signal
        (10.8872, 77.0015),  # Malumichampatti
        (10.8750, 77.0120),  # Othakalmandapam
        (10.8801, 77.0224)   # Karpagam College of Engineering
    ],
    "TN38CD5678": [
        (10.6580, 77.0090),  # Pollachi Bus Stand
        (10.6850, 77.0125),  # Achipatti
        (10.7250, 77.0160),  # Kovilpalayam
        (10.7600, 77.0180),  # Thamaraikulam
        (10.8170, 77.0205),  # Kinathukadavu
        (10.8450, 77.0215),  # Millgate
        (10.8650, 77.0220),  # Myleripalayam
        (10.8801, 77.0224)   # Karpagam College of Engineering
    ],
    "TN38EP9012": [
        (10.9985, 77.0273),  # Singanallur
        (10.9940, 77.0580),  # Ondipudur
        (10.9650, 77.0650),  # Pattanam Pirivu
        (10.9420, 77.0610),  # Chinthamanipudur
        (10.9020, 77.0420),  # Chettipalayam
        (10.8801, 77.0224)   # Karpagam College of Engineering
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
                try:
                    res = requests.post("http://localhost:8080/api/v1/telemetry", json=payload, timeout=3)
                    print(f"POST HTTP: {payload} -> Response: {res.status_code}")
                except Exception as err:
                    print(f"Gateway Ingestion failed: {err}")

                    
            # Increment path coordinates index
            path_indices[bus_id] = (idx + 1) % len(path)
            
        # Broadcast interval (PDF requirement: sends location + speed + acceleration every 10 seconds)
        time.sleep(10)

if __name__ == "__main__":
    print("Starting Driving Telemetry GPS Node Node Simulator...")
    simulate_buses()
