from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector

app = Flask(__name__)
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
    return jsonify({"status": "online", "message": "CZ/SK AREDL Map API is running!"}), 200

@app.route('/api/players', methods=['GET'])
def get_players():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Fetch the new columns
        cursor.execute("SELECT name, profile_link, city, lat, lng FROM players")
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
    token = data.get('token')
    name = data.get('name')
    profile_link = data.get('profile_link')
    city = data.get('city')
    lat = data.get('lat')
    lng = data.get('lng')

    if not all([token, name, profile_link, city, lat, lng]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # This matches the user by their secret token. 
        # If they already exist, it updates their name/link/location perfectly.
        sql = """
            INSERT INTO players (token, name, profile_link, city, lat, lng) 
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            name=VALUES(name), profile_link=VALUES(profile_link), city=VALUES(city), lat=VALUES(lat), lng=VALUES(lng)
        """
        cursor.execute(sql, (token, name, profile_link, city, lat, lng))
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()
