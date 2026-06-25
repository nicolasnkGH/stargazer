"""AI response cache for seeing forecast."""

import json
import os

CACHE_FILE = "/app/data/ai_cache.json"


def _load_ai_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_ai_cache(cache_dict):
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(cache_dict, f)
    except Exception:
        pass
