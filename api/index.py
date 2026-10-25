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

def clean_profile_link(url):
    if not url:
        return ''
    url = url.strip().rstrip('/')
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
    return url.lower()

@app.route('/')
def home():
    return jsonify({"status": "online", "message": "CZ/SK AREDL Map API V17 is running!"}), 200

@app.route('/api/players', methods=['GET'])
def get_players():
    conn = None
    try:
        conn = get_db_connection()
        # dictionary=True automatically maps the SELECT columns into JSON keys
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT name, profile_link, city, lat, lng, nationality, 
                   rank_packs, rank_nopacks, rank_hardest, rank_extremes,
                   t_rank_packs, t_rank_nopacks, t_rank_hardest, t_rank_extremes,
                   g_rank_packs, g_rank_nopacks, g_rank_hardest, g_rank_extremes,
                   g_t_rank_packs, g_t_rank_nopacks, g_t_rank_hardest, g_t_rank_extremes
            FROM test.players
        """)
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
    name = (data.get('name') or '').strip()
    raw_link = data.get('profile_link') or ''
    profile_link = clean_profile_link(raw_link)
    city = (data.get('city') or '').strip()
    lat = data.get('lat')
    lng = data.get('lng')
    nationality = data.get('nationality', 'CZ')
    
    if not all([name, profile_link, city, lat is not None, lng is not None]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    # Extract country ranks
    rank_packs = data.get('rank_packs', 99999)
    rank_nopacks = data.get('rank_nopacks', 99999)
    rank_hardest = data.get('rank_hardest', 99999)
    rank_extremes = data.get('rank_extremes', 99999)
    t_rank_packs = data.get('t_rank_packs', 99999)
    t_rank_nopacks = data.get('t_rank_nopacks', 99999)
    t_rank_hardest = data.get('t_rank_hardest', 99999)
    t_rank_extremes = data.get('t_rank_extremes', 99999)

    # Extract global ranks
    g_rank_packs = data.get('g_rank_packs', 99999)
    g_rank_nopacks = data.get('g_rank_nopacks', 99999)
    g_rank_hardest = data.get('g_rank_hardest', 99999)
    g_rank_extremes = data.get('g_rank_extremes', 99999)
    g_t_rank_packs = data.get('g_t_rank_packs', 99999)
    g_t_rank_nopacks = data.get('g_t_rank_nopacks', 99999)
    g_t_rank_hardest = data.get('g_t_rank_hardest', 99999)
    g_t_rank_extremes = data.get('g_t_rank_extremes', 99999)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO players (name, profile_link, city, lat, lng, nationality, 
                rank_packs, rank_nopacks, rank_hardest, rank_extremes, 
                t_rank_packs, t_rank_nopacks, t_rank_hardest, t_rank_extremes,
                g_rank_packs, g_rank_nopacks, g_rank_hardest, g_rank_extremes,
                g_t_rank_packs, g_t_rank_nopacks, g_t_rank_hardest, g_t_rank_extremes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                name=VALUES(name), city=VALUES(city), lat=VALUES(lat), lng=VALUES(lng), nationality=VALUES(nationality),
                rank_packs=VALUES(rank_packs), rank_nopacks=VALUES(rank_nopacks), rank_hardest=VALUES(rank_hardest), rank_extremes=VALUES(rank_extremes),
                t_rank_packs=VALUES(t_rank_packs), t_rank_nopacks=VALUES(t_rank_nopacks), t_rank_hardest=VALUES(t_rank_hardest), t_rank_extremes=VALUES(t_rank_extremes),
                g_rank_packs=VALUES(g_rank_packs), g_rank_nopacks=VALUES(g_rank_nopacks), g_rank_hardest=VALUES(g_rank_hardest), g_rank_extremes=VALUES(g_rank_extremes),
                g_t_rank_packs=VALUES(g_t_rank_packs), g_t_rank_nopacks=VALUES(g_t_rank_nopacks), g_t_rank_hardest=VALUES(g_t_rank_hardest), g_t_rank_extremes=VALUES(g_t_rank_extremes)
        """, (name, profile_link, city, lat, lng, nationality, 
              rank_packs, rank_nopacks, rank_hardest, rank_extremes, 
              t_rank_packs, t_rank_nopacks, t_rank_hardest, t_rank_extremes, 
              g_rank_packs, g_rank_nopacks, g_rank_hardest, g_rank_extremes, 
              g_t_rank_packs, g_t_rank_nopacks, g_t_rank_hardest, g_t_rank_extremes))
        
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()
