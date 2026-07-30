import os
import pymysql
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("safebus-database")

# Load environment variables
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BACKEND_DIR, '.env.development')
if os.path.exists(env_path):
    logger.info(f"[Database] Loading configuration from {env_path}")
    load_dotenv(env_path)
else:
    logger.info("[Database] Loading fallback system environment variables")
    load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "safebus")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def get_db_connection():
    """
    Builds a standard PyMySQL connection configured to return dict-like rows.
    Acts as a compatible drop-in replacement for sqlite3 connections.
    """
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10
        )
        return conn
    except Exception as e:
        logger.error(f"[Database Connection Error] Could not connect to MySQL server: {e}")
        raise

def init_db():
    """
    Legacy database initializer.
    In the MySQL setup, table generation is handled in app startup / migrate_db.py.
    """
    logger.info("[Database] init_db legacy wrapper triggered. Schema is maintained in models.py.")
    pass

if __name__ == "__main__":
    logger.info("Database module test connection check...")
    try:
        connection = get_db_connection()
        logger.info("Successfully established connection to MySQL Database!")
        connection.close()
    except Exception as err:
        logger.error(f"Database connection check failed: {err}")
