import json
import os

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

    target_names = ["Private", "Spot 1", "Spot 2", "Spot 3", "dommune"]
    target_ids = [p['id'] for p in projects if p['name'] in target_names]

    # Filter out the imported projects
    new_projects = [p for p in projects if p['id'] not in target_ids]
    # Filter out the tasks belonging to those projects
    new_tasks = [t for t in tasks if t['project_id'] not in target_ids]

    save_json('projects.json', new_projects)
    save_json('tasks.json', new_tasks)

    print(f"取り消し完了しました！ {len(projects) - len(new_projects)}個のプロジェクトと、それに紐づくタスクを削除しました。")

if __name__ == '__main__':
    main()
