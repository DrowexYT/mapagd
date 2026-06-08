import os  
import mysql.connector  
from flask import Flask, render_template, request

app = Flask(__name__)

# We wrap the connection inside a function so it only runs when called!
def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get('TIDB_HOST'),
        user=os.environ.get('TIDB_USER'),
        password=os.environ.get('TIDB_PASSWORD'),
        database=os.environ.get('TIDB_DB_NAME'), 
        port=int(os.environ.get('TIDB_PORT', 4000))
    )

@app.route('/')
def home():
    try:
        # 1. Open the connection when a user visits the page
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 2. Fetch the player data to send to our Leaflet map
        cursor.execute("SELECT * FROM players")
        players = cursor.fetchall()
        
        # 3. Always clean up and close connections when finished!
        cursor.close()
        conn.close()
        
        # 4. Pass the players data to your HTML file
        return render_template('index.html', players=players)

    except Exception as e:
        # If the database fails, we print the error but still try to show the map safely
        print(f"Database Error: {e}")
        return render_template('index.html', players=[])