from flask import Flask, render_template

app = Flask(__name__)  # <--- Vercel looks specifically for the name 'app'

@app.route('/')
def home():
    return render_template('index.html')