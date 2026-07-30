import pymysql
import sys
import os
from dotenv import load_dotenv

load_dotenv(".env.development")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sathish@6064")

try:
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS safebus")
    conn.commit()
    conn.close()
    print(f"SUCCESS: Connected to MySQL with configured credentials and verified 'safebus' database.")
    sys.exit(0)
except Exception as e:
    print(f"ERROR: Failed to connect to MySQL using root / password: {e}")
    sys.exit(1)
