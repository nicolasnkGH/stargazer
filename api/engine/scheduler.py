"""
Background scheduler for automated push notifications.
Runs inside the FastAPI process via APScheduler (in-process, no Celery needed).

Triggers:
  - ISS pass approaching (within 20 minutes)
  - Aurora Kp >= 5 (moderate storm — visible at mid-latitudes)
  - Skies clearing (cloud cover drops from > 50% to < 20%)
"""
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .push import broadcast_notification, get_all_subscriptions, PUSH_AVAILABLE
from .aurora import get_aurora_forecast
from .cache import get_cache, set_cache

logger = logging.getLogger(__name__)

# Module-level so we can start/stop cleanly
_scheduler: BackgroundScheduler | None = None


def _check_iss(lat: float, lon: float):
    """Fire an alert if an ISS pass starts within the next 20 minutes."""
    from .iss import get_iss_passes
    try:
        passes = get_iss_passes(count=1, lat=lat, lon=lon)
        if not passes:
            return
        next_pass = passes[0]
        rise_ts = next_pass.get("rise_ts")  # Unix timestamp
        if not rise_ts:
            return

        now_ts = datetime.now(timezone.utc).timestamp()
        minutes_away = (rise_ts - now_ts) / 60

        # Alert window: between 20 and 25 minutes away (send once)
        if 15 <= minutes_away <= 20:
            alert_key = f"push_iss_alerted_{int(rise_ts)}"
            if get_cache(alert_key):
                return  # already sent for this pass

            set_cache(alert_key, True, ttl_seconds=1800)  # 30 min dedup
            max_elev = next_pass.get("max_elevation_deg", "?")
            result = broadcast_notification(
                title="🚀 ISS Pass in ~15 Minutes!",
                body=f"The ISS will reach {max_elev}° elevation. Head outside now!",
                url="/"
            )
            logger.info(f"ISS alert sent: {result}")
    except Exception as e:
        logger.error(f"ISS push check failed: {e}")


def _check_aurora(lat: float):
    """Fire an alert when Kp hits >= 5 (moderate aurora chance)."""
    try:
        data = get_aurora_forecast(lat=lat)
        kp = data.get("kp", 0)
        if kp >= 5:
            alert_key = f"push_aurora_kp_{int(kp)}"
            if get_cache(alert_key):
                return  # already alerted for this Kp level in last hour

            set_cache(alert_key, True, ttl_seconds=3600)
            result = broadcast_notification(
                title="🌌 Aurora Alert! Kp Index Rising",
                body=f"Kp is now {kp:.1f}. {data.get('message', '')} — head outside and look north!",
                url="/"
            )
            logger.info(f"Aurora alert sent: {result}")
    except Exception as e:
        logger.error(f"Aurora push check failed: {e}")


def _check_skies(lat: float, lon: float):
    """Alert when cloud cover drops from > 50% to < 20% (skies clearing)."""
    try:
        from .seeing import get_seeing_forecast
        forecast = get_seeing_forecast(lat=lat, lon=lon, ai_enabled=False)
        cloud = forecast.get("cloud_cover_pct", 100)
        prev_key = "push_sky_prev_cloud"
        prev_cloud = (get_cache(prev_key) or {}).get("cloud", 100)
        set_cache(prev_key, {"cloud": cloud}, ttl_seconds=600)

        if prev_cloud >= 50 and cloud < 20:
            alert_key = "push_skies_cleared"
            if get_cache(alert_key):
                return

            set_cache(alert_key, True, ttl_seconds=7200)  # 2 hr dedup
            result = broadcast_notification(
                title="🔭 Skies Are Clearing!",
                body=f"Cloud cover just dropped to {cloud:.0f}%. Perfect time to set up your telescope!",
                url="/"
            )
            logger.info(f"Clear skies alert sent: {result}")
    except Exception as e:
        logger.error(f"Sky clearing push check failed: {e}")


def _run_all_checks(lat: float, lon: float):
    """Master job — runs all checks every 5 minutes."""
    if not PUSH_AVAILABLE:
        return
    if not get_all_subscriptions():
        return  # No subscribers, skip all API calls

    _check_iss(lat=lat, lon=lon)
    _check_aurora(lat=lat)
    _check_skies(lat=lat, lon=lon)


def start_scheduler(lat: float, lon: float):
    """Start the background scheduler. Call once on app startup."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_all_checks,
        trigger=IntervalTrigger(minutes=5),
        kwargs={"lat": lat, "lon": lon},
        id="push_checks",
        replace_existing=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info("Push notification scheduler started (5-minute interval).")


def stop_scheduler():
    """Stop scheduler gracefully on app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Push notification scheduler stopped.")
