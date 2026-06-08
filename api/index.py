import os  # <-- Add this! (Allows reading Vercel environment variables)
import mysql.connector  # <-- Add this! (Allows connecting to TiDB/MySQL)
from flask import Flask, render_template, request

# Your existing code continues below...
app = Flask(__name__)

# Make sure the string inside os.environ.get matches your Vercel keys exactly!
connection = mysql.connector.connect(
    host=os.environ.get('TIDB_HOST'),
    user=os.environ.get('TIDB_USER'),
    password=os.environ.get('TIDB_PASSWORD'),
    database=os.environ.get('TIDB_DB_NAME'), # <-- Is this named TIDB_DB_NAME or TIDB_DATABASE in Vercel? Check your keys!
    port=int(os.environ.get('TIDB_PORT', 4000))
)

@app.route('/')
def home():
    return render_template('index.html')