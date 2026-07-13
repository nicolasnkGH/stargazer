import requests
import json
from .cache import get_cache, set_cache

def get_aurora_forecast(lat: float) -> dict:
    """
    Fetch the live Kp index from NOAA SWPC and compute the probability 
    of seeing auroras based on the user's latitude.
    """
    cache_key = "aurora_kp_index"
    data = get_cache(cache_key)
    
    if not data:
        try:
            url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            
            raw_data = resp.json()
            
            # The NOAA JSON format is a 2D array where the first item is the header row
            # e.g. [["time_tag", "Kp", "a_running", "station_count"], ["2026-07-06 00:00:00", "2.67", ...]]
            # BUT sometimes it's a list of dicts. Let's handle both.
            if isinstance(raw_data, list) and len(raw_data) > 0:
                if isinstance(raw_data[0], list):
                    # 2D array format
                    latest = raw_data[-1]
                    kp_index = float(latest[1])
                elif isinstance(raw_data[0], dict):
                    # List of dicts format
                    latest = raw_data[-1]
                    kp_index = float(latest["Kp"])
                else:
                    kp_index = 0
            else:
                kp_index = 0
                
            data = {"kp": kp_index}
            set_cache(cache_key, data, ttl_seconds=3600)  # Cache for 1 hour
        except Exception as e:
            return {
                "kp": 0,
                "probability": "Low",
                "color": "gray",
                "message": "Forecast unavailable",
                "error": str(e)
            }
            
    kp = data.get("kp", 0)
    abs_lat = abs(float(lat))
    
    # Calculate probability based on Magnetic Latitude approximation (using absolute lat for simplicity)
    probability = "Low"
    color = "gray"
    
    if kp >= 7 and abs_lat >= 30:
        probability = "High"
        color = "red"
    elif kp >= 6 and abs_lat >= 40:
        probability = "High"
        color = "red"
    elif kp >= 5 and abs_lat >= 45:
        probability = "Moderate"
        color = "yellow"
    elif kp >= 4 and abs_lat >= 50:
        probability = "Moderate"
        color = "yellow"
    elif kp >= 3 and abs_lat >= 55:
        probability = "High"
        color = "green"
    elif abs_lat >= 60:
        probability = "High" if kp >= 2 else "Moderate"
        color = "green"
        
    return {
        "kp": round(kp, 1),
        "probability": probability,
        "color": color,
        "message": f"Kp {round(kp, 1)}: {probability} probability of Auroras"
    }
