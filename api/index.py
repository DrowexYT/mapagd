from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector

app = Flask(__name__)
# This allows the AREDL userscript to talk to your server securely
CORS(app)

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get('TIDB_HOST'),
        user=os.environ.get('TIDB_USER'),
        password=os.environ.get('TIDB_PASSWORD'),
        database='test',
        port=int(os.environ.get('TIDB_PORT', 4000)),
        autocommit=True
    )
    
@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "CZ/SK AREDL Map API is running!"
    }), 200
    
@app.route('/api/players', methods=['GET'])
def get_players():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT name, city, lat, lng, points FROM players")
        players = cursor.fetchall()
        return jsonify({"status": "success", "data": players}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()

@app.route('/api/players', methods=['POST'])
def add_player():
    data = request.json
    name = data.get('name')
    city = data.get('city')
    lat = data.get('lat')
    lng = data.get('lng')
    points = data.get('points', 0.0)

    if not all([name, city, lat, lng]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO players (name, city, lat, lng, points) 
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            city=VALUES(city), lat=VALUES(lat), lng=VALUES(lng), points=VALUES(points)
        """
        cursor.execute(sql, (name, city, lat, lng, points))
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()
