import mysql.connector
from datetime import datetime

class TrafficLogger:
    def __init__(self, host="localhost", user="root", password="ghaith", database="traffic_ml_db"):
        self.connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database
        )
        self.cursor = self.connection.cursor()

    def save_interval(self, interval_start, interval_data):
        """
        interval_data is a nested dict: 
        { 'Aller': {'suv': [count, co2], 'sedan': [count, co2]}, 'Retour': {...} }
        """
        sql = """INSERT INTO traffic_intervals 
                 (interval_start, day_of_week, hour_of_day, direction, vehicle_type, vehicle_count, total_co2_grams) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        
        batch_data = []
        for direction, types in interval_data.items():
            for v_type, metrics in types.items():
                if metrics[0] > 0:  # Only save if at least 1 vehicle passed
                    row = (
                        interval_start,
                        interval_start.weekday(),
                        interval_start.hour,
                        direction,
                        v_type,
                        metrics[0], # Count
                        metrics[1]  # CO2
                    )
                    batch_data.append(row)

        if batch_data:
            self.cursor.executemany(sql, batch_data)
            self.connection.commit()
            print(f"--- Saved {len(batch_data)} rows to MySQL ---")

    def close(self):
        """Close the database connection."""
        self.cursor.close()
        self.connection.close()