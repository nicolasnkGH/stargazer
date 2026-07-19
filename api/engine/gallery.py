import os
import time
import requests
import json
import base64
from config import AI_API_KEY, AI_API_URL, AI_MODEL

db_dir = os.environ.get("DB_DIR", os.path.join(os.path.dirname(__file__), ".."))
JSON_PATH = os.path.join(db_dir, "stargazer_gallery.json")
IMG_DIR = os.path.join(db_dir, "images")

def init_db():
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    if not os.path.exists(IMG_DIR):
        os.makedirs(IMG_DIR, exist_ok=True)
    if not os.path.exists(JSON_PATH):
        with open(JSON_PATH, "w") as f:
            json.dump([], f)

# Initialize on import
init_db()

def _load_data() -> list:
    try:
        with open(JSON_PATH, "r") as f:
            return json.load(f)
    except:
        return []

def _save_data(data: list):
    with open(JSON_PATH, "w") as f:
        json.dump(data, f)

def moderate_image(image_base64: str) -> tuple[bool, str]:
    if not AI_API_KEY:
        return True, "No AI moderation key configured."
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    prompt = (
        "Analyze this image. Is it pornography, NSFW, nudity, gore, hate speech, violence, "
        "or otherwise inappropriate? Answer ONLY with 'SAFE' or 'INAPPROPRIATE' followed by a short, 1-sentence reason."
    )
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AI_API_KEY}"
    }
    payload = {
        "model": AI_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 100
    }
    try:
        res = requests.post(AI_API_URL, json=payload, headers=headers, timeout=30)
        if res.status_code == 200:
            data = res.json()
            content = data["choices"][0]["message"]["content"].strip()
            if "INAPPROPRIATE" in content.upper():
                return False, content
            return True, "Passed moderation"
        else:
            return True, f"Moderation service returned status {res.status_code}. Bypassed."
    except Exception as e:
        return True, f"Moderation service error: {e}. Bypassed."

def add_gallery_entry(target_id: str, target_name: str, author: str, location: str, gear: str, comment: str, note: str, image_base64: str) -> dict:
    is_safe, reason = moderate_image(image_base64)
    if not is_safe:
        raise ValueError(f"Image rejected by AI safety filter: {reason}")
    created_at = datetime_now_str()
    data = _load_data()
    new_id = 1 if not data else max(entry["id"] for entry in data) + 1
    
    # Save image to file
    img_path = os.path.join(IMG_DIR, f"{new_id}.b64")
    with open(img_path, "w") as f:
        f.write(image_base64)
        
    entry = {
        "id": new_id,
        "target_id": target_id,
        "target_name": target_name,
        "author": author,
        "location": location,
        "gear": gear,
        "comment": comment,
        "note": note,
        "created_at": created_at,
        "reported": 0
    }
    data.append(entry)
    _save_data(data)
    return entry

def get_gallery_entries(target_id: str = None) -> list[dict]:
    data = _load_data()
    if target_id:
        data = [e for e in data if e["target_id"] == target_id]
    # Sort by ID descending
    data.sort(key=lambda x: x["id"], reverse=True)
    return data

def get_gallery_image(entry_id: int) -> str:
    img_path = os.path.join(IMG_DIR, f"{entry_id}.b64")
    try:
        with open(img_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""

def datetime_now_str():
    from datetime import datetime
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

def report_image(image_id: int):
    data = _load_data()
    for e in data:
        if e["id"] == image_id:
            e["reported"] = e.get("reported", 0) + 1
            break
    _save_data(data)

def get_gallery_counts() -> dict:
    data = _load_data()
    counts = {}
    for e in data:
        if e.get("reported", 0) == 0:
            tid = e["target_id"]
            counts[tid] = counts.get(tid, 0) + 1
    return counts
