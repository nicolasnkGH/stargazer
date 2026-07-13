"""
Push notification engine.
Handles:
  - Storing/retrieving PushSubscription objects in Redis (or fallback memory)
  - Sending web push messages via VAPID (pywebpush)
"""
import json
import os
import logging
from typing import Optional

from .cache import get_cache, set_cache, HAS_REDIS, redis_client

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_ADMIN_EMAIL = os.environ.get("VAPID_ADMIN_EMAIL", "admin@stargazer.local")

# In-memory fallback when Redis is not available
_memory_subs: dict = {}

PUSH_AVAILABLE = bool(VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)

# ── Subscription storage ──────────────────────────────────────────────────────

def save_subscription(sub_json: dict) -> bool:
    """Persist a PushSubscription object. Returns True on success."""
    endpoint = sub_json.get("endpoint")
    if not endpoint:
        return False

    key = f"push_sub:{endpoint}"
    if HAS_REDIS and redis_client:
        try:
            # TTL = 90 days; refreshed each time the browser re-subscribes
            redis_client.setex(key, 90 * 86400, json.dumps(sub_json))
            return True
        except Exception as e:
            logger.warning(f"Redis push save failed: {e}")

    # Memory fallback
    _memory_subs[endpoint] = sub_json
    return True


def get_all_subscriptions() -> list:
    """Return all stored PushSubscription objects."""
    subs = []
    if HAS_REDIS and redis_client:
        try:
            keys = redis_client.keys("push_sub:*")
            for k in keys:
                raw = redis_client.get(k)
                if raw:
                    subs.append(json.loads(raw))
            return subs
        except Exception as e:
            logger.warning(f"Redis push fetch failed: {e}")

    # Memory fallback
    return list(_memory_subs.values())


def delete_subscription(endpoint: str):
    """Remove a subscription (e.g. after 410 Gone from push service)."""
    key = f"push_sub:{endpoint}"
    if HAS_REDIS and redis_client:
        try:
            redis_client.delete(key)
        except Exception:
            pass
    _memory_subs.pop(endpoint, None)


# ── Send helpers ──────────────────────────────────────────────────────────────

def send_notification(subscription: dict, title: str, body: str, url: str = "/") -> bool:
    """
    Send a single web push notification.
    Returns True on success, False on failure.
    """
    if not PUSH_AVAILABLE:
        logger.warning("VAPID keys not configured — cannot send push")
        return False

    try:
        from pywebpush import webpush, WebPushException
        payload = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": f"mailto:{VAPID_ADMIN_EMAIL}",
            }
        )
        return True
    except Exception as e:
        err_str = str(e)
        # 410 Gone = browser unsubscribed; clean it up
        if "410" in err_str or "404" in err_str:
            delete_subscription(subscription.get("endpoint", ""))
        else:
            logger.error(f"Push send failed: {e}")
        return False


def broadcast_notification(title: str, body: str, url: str = "/") -> dict:
    """Send a push to all stored subscriptions. Returns a summary dict."""
    subs = get_all_subscriptions()
    sent = 0
    failed = 0
    for sub in subs:
        ok = send_notification(sub, title=title, body=body, url=url)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed, "total": len(subs)}
