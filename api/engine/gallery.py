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
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)

# Initialize on import
init_db()

def _load_data() -> list:
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def _save_data(data: list):
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)

def moderate_image(image_base64: str) -> tuple[bool, str]:
    if not AI_API_KEY:
        return True, "No AI moderation key configured."
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    prompt = (
        "Analyze this image for safety. Answer ONLY with the word 'SAFE' or 'REJECTED' at the very beginning of your response, followed by a short reason."
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
            upper_content = content.upper()
            if upper_content.startswith("REJECTED") or "REJECTED:" in upper_content or "REJECTED." in upper_content or upper_content.startswith("INAPPROPRIATE"):
                return False, content
            return True, "Passed moderation"
        else:
            return True, f"Moderation service returned status {res.status_code}. Bypassed."
    except Exception as e:
        return True, f"Moderation service error: {e}. Bypassed."

def add_gallery_entry(
    target_id: str,
    target_name: str,
    author: str,
    location: str,
    gear: str = "",
    comment: str = "",
    note: str = "",
    image_base64: str = "",
    raw_image_base64: str = "",
    equipment: str = "",
    exposure_details: str = "",
    total_integration: str = "",
    gain_iso: str = "",
    filter_used: str = "",
    processing_software: list = None,
    capture_date: str = "",
    notes: str = ""
) -> dict:
    # Per Refinement 2: Only moderate primary processed image to avoid false rejection of faint unstretched FITS previews
    is_safe, reason = moderate_image(image_base64)
    if not is_safe:
        raise ValueError(f"Image rejected by AI safety filter: {reason}")
    created_at = datetime_now_str()
    data = _load_data()
    new_id = 1 if not data else max(entry["id"] for entry in data) + 1
    
    # Save primary image to file
    img_path = os.path.join(IMG_DIR, f"{new_id}.b64")
    with open(img_path, "w") as f:
        f.write(image_base64)
        
    has_raw = False
    if raw_image_base64 and len(raw_image_base64.strip()) > 0:
        raw_img_path = os.path.join(IMG_DIR, f"{new_id}_raw.b64")
        with open(raw_img_path, "w") as f:
            f.write(raw_image_base64)
        has_raw = True

    # Normalize software tags
    software_list = []
    if isinstance(processing_software, list):
        software_list = [str(s).strip() for s in processing_software if str(s).strip()]
    elif isinstance(processing_software, str) and processing_software.strip():
        software_list = [s.strip() for s in processing_software.split(",") if s.strip()]

    entry = {
        "id": new_id,
        "target_id": target_id,
        "target_name": target_name,
        "author": author,
        "location": location,
        "gear": gear or equipment,
        "equipment": equipment or gear,
        "comment": comment,
        "note": note or notes,
        "notes": notes or note,
        "exposure_details": exposure_details,
        "total_integration": total_integration,
        "gain_iso": gain_iso,
        "filter": filter_used,
        "processing_software": software_list,
        "capture_date": capture_date or created_at.split(" ")[0],
        "created_at": created_at,
        "has_raw_preview": has_raw,
        "reported": 0,
        "comments": []
    }
    data.append(entry)
    _save_data(data)
    return entry

def get_gallery_entries(target_id: str = None) -> list[dict]:
    data = _load_data()
    for e in data:
        if "comments" not in e or not isinstance(e["comments"], list):
            e["comments"] = []
    if target_id:
        data = [e for e in data if e["target_id"] == target_id and e.get("reported", 0) == 0]
    else:
        data = [e for e in data if e.get("reported", 0) == 0]
    # Sort by ID descending
    data.sort(key=lambda x: x["id"], reverse=True)
    return data

def _build_gallery_image_path(entry_id: int, suffix: str = "") -> str:
    safe_entry_id = int(entry_id)
    if safe_entry_id < 0:
        raise ValueError("Invalid entry_id")

    filename = f"{safe_entry_id}{suffix}.b64"
    base_dir = os.path.abspath(IMG_DIR)
    candidate = os.path.abspath(os.path.join(base_dir, filename))

    if os.path.commonpath([base_dir, candidate]) != base_dir:
        raise ValueError("Invalid image path")

    return candidate

def get_gallery_image(entry_id: int) -> str:
    try:
        img_path = _build_gallery_image_path(entry_id)
        with open(img_path, "r", encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, ValueError, TypeError):
        return ""

def get_gallery_raw_image(entry_id: int) -> str:
    try:
        img_path = _build_gallery_image_path(entry_id, "_raw")
        with open(img_path, "r", encoding="utf-8") as f:
            return f.read()
    except (FileNotFoundError, ValueError, TypeError):
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

def delete_gallery_entry(entry_id: int):
    data = _load_data()
    data = [e for e in data if e["id"] != entry_id]
    _save_data(data)
    for ext in [f"{entry_id}.b64", f"{entry_id}_raw.b64"]:
        path = os.path.join(IMG_DIR, ext)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

def get_gallery_counts() -> dict:
    data = _load_data()
    counts = {}
    for e in data:
        if e.get("reported", 0) == 0:
            tid = e["target_id"]
            counts[tid] = counts.get(tid, 0) + 1
    return counts

# ── Anti-Spam Verification Challenge ──────────────────────────────────────────

import hmac
import hashlib
import random
import secrets

CHALLENGES = [
    ("What is 3 + 4?", ["7", "seven"]),
    ("What is 6 + 5?", ["11", "eleven"]),
    ("What is 9 + 4?", ["13", "thirteen"]),
    ("What is 8 + 6?", ["14", "fourteen"]),
    ("What is 15 - 8?", ["7", "seven"]),
    ("What is 12 - 4?", ["8", "eight"]),
    ("Which planet has rings? (Saturn, Mars)", ["saturn"]),
    ("The star at the center of our solar system is the...", ["sun", "the sun"]),
    ("How many natural moons does Earth have?", ["1", "one"]),
    ("What is 5 + 7?", ["12", "twelve"]),
]

CHALLENGE_SECRET = secrets.token_hex(16)

def generate_challenge() -> dict:
    idx = random.randint(0, len(CHALLENGES) - 1)
    q, _ = CHALLENGES[idx]
    exp = int(time.time()) + 600  # 10 min expiry
    payload = f"{idx}:{exp}"
    sig = hmac.new(CHALLENGE_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    token = f"{payload}:{sig}"
    return {"id": token, "question": q}

def verify_challenge(token: str, answer: str) -> bool:
    if not token or not answer:
        return False
    parts = token.split(":")
    if len(parts) != 3:
        return False
    idx_s, exp_s, sig = parts
    try:
        idx = int(idx_s)
        exp = int(exp_s)
    except ValueError:
        return False
    if time.time() > exp:
        return False
    if idx < 0 or idx >= len(CHALLENGES):
        return False
    payload = f"{idx}:{exp}"
    expected_sig = hmac.new(CHALLENGE_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    if not secrets.compare_digest(sig, expected_sig):
        return False
    clean_ans = answer.strip().lower()
    valid_answers = CHALLENGES[idx][1]
    return clean_ans in valid_answers

# ── Comment Management ────────────────────────────────────────────────────────

def add_gallery_comment(entry_id: int, author: str, comment_text: str) -> dict:
    data = _load_data()
    for e in data:
        if e["id"] == entry_id:
            if "comments" not in e or not isinstance(e["comments"], list):
                e["comments"] = []
            new_cid = 1 if not e["comments"] else max(c.get("id", 0) for c in e["comments"]) + 1
            new_comment = {
                "id": new_cid,
                "author": author.strip()[:60],
                "text": comment_text.strip()[:600],
                "created_at": datetime_now_str()
            }
            e["comments"].append(new_comment)
            _save_data(data)
            return new_comment
    return None

def delete_gallery_comment(entry_id: int, comment_id: int) -> bool:
    data = _load_data()
    found = False
    for e in data:
        if e["id"] == entry_id:
            if "comments" in e and isinstance(e["comments"], list):
                orig_len = len(e["comments"])
                e["comments"] = [c for c in e["comments"] if c.get("id") != comment_id]
                if len(e["comments"]) < orig_len:
                    found = True
                    break
    if found:
        _save_data(data)
    return found


