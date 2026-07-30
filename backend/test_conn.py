import os
import pymysql
from dotenv import load_dotenv

print("Loading dotenv...")
load_dotenv(".env.development")

host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", "3306"))
name = os.getenv("DB_NAME", "safebus")
user = os.getenv("DB_USER", "root")
pwd = os.getenv("DB_PASSWORD", "")

print(f"Connecting to MySQL: host={host}, port={port}, user={user}, database={name}...")
try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=pwd,
        database=name,
        connect_timeout=3
    )
    print("SUCCESS: Connection established!")
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
