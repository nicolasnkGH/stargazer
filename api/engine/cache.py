import json
import os
import logging
from typing import Any, Optional

try:
    import redis
    # Allow REDIS_URL from env, default to local if not set
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    # Ping to verify connection
    redis_client.ping()
    HAS_REDIS = True
except Exception as e:
    logging.warning(f"Redis not available, falling back to local/memory cache: {e}")
    HAS_REDIS = False
    redis_client = None

# Fallback local dict cache for endpoints
_local_cache = {}

# Legacy AI Cache fallback
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_FILE = os.path.join(BASE_DIR, "data", "ai_cache.json")


def get_cache(key: str) -> Optional[Any]:
    """Get value from Redis (or local memory fallback)."""
    if HAS_REDIS:
        try:
            val = redis_client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass
    
    # Fallback
    return _local_cache.get(key)


def set_cache(key: str, value: Any, ttl_seconds: int = 3600):
    """Set value in Redis with TTL (or local memory fallback)."""
    if HAS_REDIS:
        try:
            redis_client.setex(key, ttl_seconds, json.dumps(value))
            return
        except Exception:
            pass
    
    # Fallback
    _local_cache[key] = value


# ── Legacy AI Caching Functions ──────────────────────────────────────────────

def _load_ai_cache():
    if HAS_REDIS:
        try:
            data = redis_client.get("legacy_ai_cache")
            if data:
                return json.loads(data)
        except Exception:
            pass

    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_ai_cache(cache_dict):
    if HAS_REDIS:
        try:
            # Save AI cache in Redis indefinitely (or very long TTL)
            redis_client.set("legacy_ai_cache", json.dumps(cache_dict))
        except Exception:
            pass

    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(cache_dict, f)
    except Exception:
        pass
