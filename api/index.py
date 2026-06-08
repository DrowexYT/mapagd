import os  
import mysql.connector  
from flask import Flask, render_template, request, redirect, url_for

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

# 1. HOME ROUTE: Fetches players from TiDB and loads the main map layout
@app.route('/')
def home():
    try:
        # Open the connection when a user visits the page
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Fetch the player data to send to our Leaflet map
        cursor.execute("SELECT * FROM players")
        players = cursor.fetchall()
        
        # Always clean up and close connections when finished!
        cursor.close()
        conn.close()
        
        # Pass the players data to your HTML file
        return render_template('index.html', players=players)

    except Exception as e:
        # If the database fails, we print the error but still try to show the map safely
        print(f"Database Error: {e}")
        return render_template('index.html', players=[])

# 2. SUBMIT PAGE ROUTE: Just serves the static submission form layout
@app.route('/submit')
def submit_page():
    return render_template('submit.html')

# 3. ACTION ROUTE: Receives data sent from the HTML form and logs it to TiDB
@app.route('/add-player', methods=['POST'])
def add_player():
    # Grab user inputs out of the HTTP POST request payload
    name = request.form.get('player_name')
    x = request.form.get('coord_x')
    y = request.form.get('coord_y')
    
    if not name or not x or not y:
        return "<h3>Error: All fields are required!</h3>", 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Secure parameterized SQL syntax—safeguards entirely against injection attacks!
        sql = "INSERT INTO players (name, coord_x, coord_y) VALUES (%s, %s, %s)"
        cursor.execute(sql, (name, float(x), float(y)))
        
        # Save modifications to your persistent database tables
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Smoothly kick the user back to the index page to view their new map pin
        return redirect(url_for('home'))

    except Exception as e:
        print(f"Submission Error: {e}")
        return f"<h3>Database Error processing submission: {e}</h3>", 500