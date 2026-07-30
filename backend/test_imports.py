print("Importing json...")
import json
print("Importing threading...")
import threading
print("Importing os...")
import os
print("Importing logging...")
import logging
print("Importing Flask...")
from flask import Flask
print("Importing CORS...")
from flask_cors import CORS
print("Importing mqtt...")
import paho.mqtt.client as mqtt
print("Importing random...")
import random
print("Importing dotenv...")
from dotenv import load_dotenv
print("Importing sqlalchemy...")
from sqlalchemy import text
print("Importing werkzeug...")
from werkzeug.security import generate_password_hash
print("Importing models...")
from models import db
print("Importing ml_engine...")
from ml_engine import BehaviorAnomalyDetector
print("Importing routing_engine...")
from routing_engine import RoutingEngine
print("All imports completed successfully!")
