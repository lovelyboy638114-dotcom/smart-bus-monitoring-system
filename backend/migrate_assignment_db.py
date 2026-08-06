import pymysql
import os
from dotenv import load_dotenv

load_dotenv('backend/.env.development')

conn = pymysql.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', 'sathish@6064'),
    database=os.getenv('DB_NAME', 'safebus')
)
cursor = conn.cursor()

def run_migration():
    print("Starting database migration for Automatic Bus Assignment...")
    
    # 1. Create routes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routes (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_location VARCHAR(255) NULL,
        end_location VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    """)
    print("Table 'routes' ready.")

    # 2. Create stops table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        address VARCHAR(255) NULL,
        route_id VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
    )
    """)
    print("Table 'stops' ready.")

    # 3. Create route_stops table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS route_stops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id VARCHAR(255) NOT NULL,
        stop_id INT NOT NULL,
        stop_order INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
        FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
    )
    """)
    print("Table 'route_stops' ready.")

    # 4. Safely add columns to buses
    def add_column_if_missing(table, col, definition):
        cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{col}'")
        if not cursor.fetchone():
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
            print(f"Added column '{col}' to table '{table}'.")
        else:
            print(f"Column '{col}' already exists in table '{table}'.")

    add_column_if_missing('buses', 'capacity', "INT DEFAULT 40 NOT NULL")
    add_column_if_missing('buses', 'route_id', "VARCHAR(255) NULL")
    add_column_if_missing('buses', 'is_active', "TINYINT(1) DEFAULT 1 NOT NULL")

    # Add foreign key constraint to buses.route_id if missing
    try:
        cursor.execute("ALTER TABLE buses ADD FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL")
        print("Foreign key constraint added to 'buses.route_id'.")
    except Exception:
        # Constraint might already exist
        pass

    # 5. Safely add columns to students
    add_column_if_missing('students', 'pickup_distance', "FLOAT NULL")
    add_column_if_missing('students', 'assignment_status', "VARCHAR(50) DEFAULT 'PENDING' NOT NULL")
    add_column_if_missing('students', 'assigned_at', "DATETIME NULL")

    # 6. Seeding initial route configurations matching mockData stops
    routes_seed = [
        ("R-01", "R-01 (North Loop)", "Gandhipuram", "Karpagam College of Engineering"),
        ("R-02", "R-02 (East Loop)", "Hope College", "Karpagam College of Engineering"),
        ("R-03", "R-03 (South Loop)", "Ukkadam", "Karpagam College of Engineering")
    ]
    for r_id, r_name, start, end in routes_seed:
        cursor.execute("INSERT INTO routes (id, name, start_location, end_location) VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE name=%s", (r_id, r_name, start, end, r_name))
    print("Routes seeded.")

    # Update buses to point to their routes
    bus_route_mapping = {
        "TN38AB1234": "R-01",
        "TN38CD5678": "R-02",
        "TN38EP9012": "R-03"
    }
    for b_id, r_id in bus_route_mapping.items():
        cursor.execute("UPDATE buses SET route_id=%s WHERE id=%s", (r_id, b_id))
    print("Buses mapped to routes.")

    # Stops seed matching mockData stops coordinates
    stops_seed = [
        # Route 1 stops
        ("Gandhipuram Bus Stand", 11.0168, 76.9674, "Gandhipuram Bus Stand, Coimbatore", "R-01", 0),
        ("RS Puram", 11.0088, 76.9498, "RS Puram, Coimbatore", "R-01", 1),
        ("Saibaba Colony", 11.0275, 76.9427, "Saibaba Colony, Coimbatore", "R-01", 2),
        ("Vadavalli", 11.0394, 76.9002, "Vadavalli, Coimbatore", "R-01", 3),
        ("Thudiyalur", 11.0820, 76.9410, "Thudiyalur, Coimbatore", "R-01", 4),
        ("Kavundampalayam", 11.0505, 76.9514, "Kavundampalayam, Coimbatore", "R-01", 5),
        ("GN Mills", 11.0570, 76.9445, "GN Mills, Coimbatore", "R-01", 6),
        
        # Route 2 stops
        ("Hope College", 11.0270, 77.0288, "Hope College, Coimbatore", "R-02", 0),
        ("Peelamedu", 11.0312, 77.0364, "Peelamedu, Coimbatore", "R-02", 1),
        ("Singanallur", 10.9985, 77.0273, "Singanallur, Coimbatore", "R-02", 2),
        ("Chinniyampalayam", 11.0205, 77.0488, "Chinniyampalayam, Coimbatore", "R-02", 3),
        ("Neelambur", 11.0405, 77.0910, "Neelambur, Coimbatore", "R-02", 4),
        ("Kalapatti", 11.0695, 77.0398, "Kalapatti, Coimbatore", "R-02", 5),
        ("Saravanampatti", 11.0825, 76.9994, "Saravanampatti, Coimbatore", "R-02", 6),
        
        # Route 3 stops
        ("Ukkadam Bus Stand", 10.9925, 76.9616, "Ukkadam Bus Stand, Coimbatore", "R-03", 0),
        ("Town Hall", 10.9968, 76.9635, "Town Hall, Coimbatore", "R-03", 1),
        ("Podanur", 10.9725, 76.9715, "Podanur, Coimbatore", "R-03", 2),
        ("Sundarapuram", 10.9595, 76.9755, "Sundarapuram, Coimbatore", "R-03", 3),
        ("Kuniyamuthur", 10.9788, 76.9552, "Kuniyamuthur, Coimbatore", "R-03", 4),
        ("Eachanari", 10.9060, 76.9865, "Eachanari, Coimbatore", "R-03", 5),
        ("Madukkarai", 10.9055, 76.9550, "Madukkarai, Coimbatore", "R-03", 6),
    ]

    for name, lat, lng, addr, route_id, order in stops_seed:
        # Check if stop exists
        cursor.execute("SELECT id FROM stops WHERE name=%s", (name,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("INSERT INTO stops (name, latitude, longitude, address, route_id) VALUES (%s, %s, %s, %s, %s)", (name, lat, lng, addr, route_id))
            stop_id = cursor.lastrowid
        else:
            stop_id = row[0]
            cursor.execute("UPDATE stops SET latitude=%s, longitude=%s, address=%s, route_id=%s WHERE id=%s", (lat, lng, addr, route_id, stop_id))
        
        # Seed route stops order
        cursor.execute("SELECT id FROM route_stops WHERE route_id=%s AND stop_id=%s", (route_id, stop_id))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (%s, %s, %s)", (route_id, stop_id, order))
        else:
            cursor.execute("UPDATE route_stops SET stop_order=%s WHERE route_id=%s AND stop_id=%s", (order, route_id, stop_id))

    print("Stops and route order seeded successfully.")
    conn.commit()
    conn.close()
    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()
