import sqlite3
import json
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__, static_folder='.')
CORS(app, supports_credentials=True)
app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key_ganttflow')

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

DB_FILE = os.environ.get('DB_FILE', 'ganttflow.db')

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL DEFAULT 1,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            color TEXT,
            tags TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    ''')
    try:
        c.execute("ALTER TABLE tasks ADD COLUMN project_id INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
        
    db = get_db()
    try:
        db.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)',
                   (email, generate_password_hash(password, method='pbkdf2:sha256')))
        db.commit()
        user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        session['user_id'] = user['id']
        session['email'] = user['email']
        return jsonify({'message': 'Registered successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400
    finally:
        db.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    db.close()
    
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['email'] = user['email']
        return jsonify({'message': 'Logged in successfully'})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

@app.route('/api/me', methods=['GET'])
def me():
    if 'user_id' in session:
        return jsonify({'email': session['email']})
    return jsonify({'error': 'Not logged in'}), 401

@app.route('/api/projects', methods=['GET'])
def get_projects():
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    db = get_db()
    projects = db.execute('SELECT * FROM projects WHERE user_id = ?', (session['user_id'],)).fetchall()
    
    if not projects:
        # Create default project
        cursor = db.execute('INSERT INTO projects (user_id, name) VALUES (?, ?)', (session['user_id'], 'My First Project'))
        db.commit()
        projects = [{'id': cursor.lastrowid, 'name': 'My First Project'}]
    else:
        projects = [{'id': p['id'], 'name': p['name']} for p in projects]
    db.close()
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def save_project():
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    name = request.json.get('name')
    if not name: return jsonify({'error': 'Name required'}), 400
    db = get_db()
    cursor = db.execute('INSERT INTO projects (user_id, name) VALUES (?, ?)', (session['user_id'], name))
    db.commit()
    new_id = cursor.lastrowid
    db.close()
    return jsonify({'message': 'Project created', 'id': new_id})

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    name = request.json.get('name')
    if not name: return jsonify({'error': 'Name required'}), 400
    db = get_db()
    db.execute('UPDATE projects SET name = ? WHERE id = ? AND user_id = ?', (name, project_id, session['user_id']))
    db.commit()
    db.close()
    return jsonify({'message': 'Project updated'})

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    db = get_db()
    db.execute('DELETE FROM tasks WHERE project_id = ? AND user_id = ?', (project_id, session['user_id']))
    db.execute('DELETE FROM projects WHERE id = ? AND user_id = ?', (project_id, session['user_id']))
    db.commit()
    db.close()
    return jsonify({'message': 'Project and its tasks deleted'})

@app.route('/api/tags', methods=['GET'])
def get_tags():
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    db = get_db()
    tags = db.execute('SELECT * FROM tags WHERE user_id = ?', (session['user_id'],)).fetchall()
    db.close()
    return jsonify([{'id': t['id'], 'name': t['name'], 'color': t['color']} for t in tags])

@app.route('/api/tags', methods=['POST'])
def save_tag():
    if 'user_id' not in session: return jsonify({'error': 'Not logged in'}), 401
    name = request.json.get('name')
    color = request.json.get('color', '#3b82f6')
    if not name: return jsonify({'error': 'Name required'}), 400
    db = get_db()
    cursor = db.execute('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)', (session['user_id'], name, color))
    db.commit()
    new_id = cursor.lastrowid
    db.close()
    return jsonify({'message': 'Tag created', 'id': new_id})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    project_id = request.args.get('project_id')
        
    db = get_db()
    if project_id:
        tasks = db.execute('SELECT * FROM tasks WHERE user_id = ? AND project_id = ?', (session['user_id'], project_id)).fetchall()
    else:
        tasks = db.execute('SELECT * FROM tasks WHERE user_id = ?', (session['user_id'],)).fetchall()
    db.close()
    
    result = []
    for t in tasks:
        result.append({
            'id': t['id'],
            'project_id': t['project_id'],
            'name': t['name'],
            'start': t['start_date'],
            'end': t['end_date'],
            'color': t['color'],
            'tags': json.loads(t['tags']) if t['tags'] else []
        })
    return jsonify(result)

@app.route('/api/tasks', methods=['POST'])
def save_task():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    data = request.json
    user_id = session['user_id']
    project_id = data.get('project_id', 1)
    name = data.get('name')
    start_date = data.get('start')
    end_date = data.get('end')
    color = data.get('color')
    tags = json.dumps(data.get('tags', []))
    
    db = get_db()
    cursor = db.execute('''
        INSERT INTO tasks (user_id, project_id, name, start_date, end_date, color, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, project_id, name, start_date, end_date, color, tags))
    db.commit()
    new_id = cursor.lastrowid
    db.close()
    
    return jsonify({'message': 'Task created', 'id': new_id})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    data = request.json
    name = data.get('name')
    start_date = data.get('start')
    end_date = data.get('end')
    color = data.get('color')
    tags = json.dumps(data.get('tags', []))
    
    db = get_db()
    # Ensure the task belongs to the user
    task = db.execute('SELECT id FROM tasks WHERE id = ? AND user_id = ?', (task_id, session['user_id'])).fetchone()
    if not task:
        db.close()
        return jsonify({'error': 'Task not found or unauthorized'}), 404
        
    db.execute('''
        UPDATE tasks 
        SET name = ?, start_date = ?, end_date = ?, color = ?, tags = ?
        WHERE id = ? AND user_id = ?
    ''', (name, start_date, end_date, color, tags, task_id, session['user_id']))
    db.commit()
    db.close()
    return jsonify({'message': 'Task updated'})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    db = get_db()
    task = db.execute('SELECT id FROM tasks WHERE id = ? AND user_id = ?', (task_id, session['user_id'])).fetchone()
    if not task:
        db.close()
        return jsonify({'error': 'Task not found or unauthorized'}), 404
        
    db.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, session['user_id']))
    db.commit()
    db.close()
    return jsonify({'message': 'Task deleted'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
