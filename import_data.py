import json
import os
import uuid

def load_json(filename, default_val):
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return default_val
    return default_val

def save_json(filename, data):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    projects = load_json('projects.json', [])
    tasks = load_json('tasks.json', [])

    new_projects = ["Private", "Spot 1", "Spot 2", "Spot 3", "dommune"]
    proj_ids = {}

    # Ensure projects exist
    for p_name in new_projects:
        existing = next((p for p in projects if p['name'] == p_name), None)
        if existing:
            proj_ids[p_name] = existing['id']
        else:
            new_id = str(uuid.uuid4())
            projects.append({
                'id': new_id,
                'name': p_name,
                'order': len(projects)
            })
            proj_ids[p_name] = new_id

    save_json('projects.json', projects)

    new_tasks = [
        {"project": "Private", "name": "ハロワ", "start": "2025-10-21", "color": "var(--task-blue)"},
        {"project": "Spot 1", "name": "月見ル君想フ", "start": "2025-10-07", "color": "var(--task-blue)"},
        {"project": "Spot 1", "name": "松田アキ", "start": "2025-10-09", "color": "var(--task-blue)"},
        {"project": "Spot 1", "name": "ENEKO", "start": "2025-10-13", "color": "var(--task-blue)"},
        {"project": "Spot 2", "name": "Ruby Room", "start": "2025-10-08", "color": "var(--task-pink)"},
        {"project": "Spot 2", "name": "OR", "start": "2025-10-10", "color": "var(--task-pink)"},
        {"project": "Spot 2", "name": "Ruby", "start": "2025-10-18", "color": "var(--task-pink)"},
        {"project": "dommune", "name": "16時", "start": "2025-10-16", "color": "var(--task-orange)"},
    ]

    added = 0
    for t in new_tasks:
        p_id = proj_ids[t['project']]
        # Check if task already exists on that date
        existing = next((x for x in tasks if x['project_id'] == p_id and x['start'] == t['start']), None)
        if not existing:
            tasks.append({
                'id': str(uuid.uuid4()),
                'project_id': p_id,
                'name': t['name'],
                'start': t['start'],
                'end': t['start'],
                'color': t['color'],
                'tags': []
            })
            added += 1

    save_json('tasks.json', tasks)
    print(f"Import complete! Added {len(projects)} projects and {added} tasks.")

if __name__ == '__main__':
    main()
