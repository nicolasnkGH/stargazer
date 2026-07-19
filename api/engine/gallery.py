import os
import sqlite3
import time
import requests
import json
import base64
from config import AI_API_KEY, AI_API_URL, AI_MODEL

db_dir = os.environ.get("DB_DIR", os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(db_dir, "stargazer_gallery.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_id TEXT NOT NULL,
            target_name TEXT NOT NULL,
            author TEXT NOT NULL,
            location TEXT NOT NULL,
            gear TEXT NOT NULL,
            comment TEXT NOT NULL,
            note TEXT,
            image_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            reported INTEGER DEFAULT 0
        )
    """)
    try:
        cursor.execute("ALTER TABLE gallery ADD COLUMN reported INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists
    conn.commit()
    conn.close()

# Initialize on import
init_db()

def moderate_image(image_base64: str) -> tuple[bool, str]:
    """
    Moderates an image using Gemini's vision capability.
    Returns (is_safe: bool, reason: str).
    """
    if not AI_API_KEY:
        # If no API key is provided, bypass moderation as a fallback
        return True, "No AI moderation key configured."

    # Remove header if present
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
    # First, run moderation
    is_safe, reason = moderate_image(image_base64)
    if not is_safe:
        raise ValueError(f"Image rejected by AI safety filter: {reason}")

    created_at = datetime_now_str()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO gallery (target_id, target_name, author, location, gear, comment, note, image_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (target_id, target_name, author, location, gear, comment, note, image_base64, created_at))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()

    return {
        "id": inserted_id,
        "target_id": target_id,
        "target_name": target_name,
        "author": author,
        "location": location,
        "gear": gear,
        "comment": comment,
        "note": note,
        "created_at": created_at
    }

def get_gallery_entries(target_id: str = None) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if target_id:
        cursor.execute("""
            SELECT id, target_id, target_name, author, location, gear, comment, note, created_at
            FROM gallery WHERE target_id = ? ORDER BY id DESC
        """, (target_id,))
    else:
        cursor.execute("""
            SELECT id, target_id, target_name, author, location, gear, comment, note, created_at
            FROM gallery ORDER BY id DESC
        """)
    rows = cursor.fetchall()
    conn.close()

    entries = []
    for r in rows:
        entries.append({
            "id": r[0],
            "target_id": r[1],
            "target_name": r[2],
            "author": r[3],
            "location": r[4],
            "gear": r[5],
            "comment": r[6],
            "note": r[7],
            "created_at": r[8]
        })
    return entries

def get_gallery_image(entry_id: int) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT image_data FROM gallery WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return ""

def datetime_now_str():
    from datetime import datetime
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

def report_image(image_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE gallery SET reported = reported + 1 WHERE id = ?", (image_id,))
    conn.commit()
    conn.close()

def get_gallery_counts() -> dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT target_id, COUNT(*) FROM gallery WHERE reported = 0 GROUP BY target_id")
    rows = cursor.fetchall()
    conn.close()
    return {row[0]: row[1] for row in rows}
