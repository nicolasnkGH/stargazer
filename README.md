# 🔭 StarGazer — Personal Observatory Assistant
[![Deploy Stargazer CI/CD](https://github.com/nicolasnkGH/stargazer/actions/workflows/deploy.yml/badge.svg)](https://github.com/nicolasnkGH/stargazer/actions/workflows/deploy.yml)

> **Columbus, OH · Celestron StarSense Explorer 5" DX · South-facing 3rd floor porch**

A personalized stargazing dashboard + Telegram alert bot powered by open-source tools. No subscriptions. No ads. No cloud lock-in.

---

## What It Does

| Feature | How |
|---|---|
| 🌙 Tonight's report | Moon, planets, Scorpius window, best targets |
| 🦂 Scorpius database | All major targets rated for your 5" scope + Bortle 8 |
| ☁️ Seeing conditions | Cloud cover, wind, go/no-go from Open-Meteo |
| 🛸 ISS alerts | Upcoming passes over Columbus |
| 📅 Weekly forecast | 7-day celestial event calendar |
| 📆 Monthly preview | Moon phases, meteor showers, highlights |
| 📱 Telegram bot | Daily/weekly/monthly alerts via n8n |
| 🌐 Web dashboard | Dark-mode local dashboard |

---

## Stack

```
stargazer/
├── api/                 # Python FastAPI astronomy engine
│   ├── config.py        # Your observer config + DSO database
│   ├── engine.py        # Skyfield calculations
│   ├── main.py          # FastAPI REST endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── web/                 # Static web dashboard
│   ├── index.html
│   ├── style.css
│   └── app.js
├── n8n/                 # Importable n8n workflow JSONs
│   ├── daily_report.json
│   ├── weekly_report.json
│   ├── monthly_report.json
│   └── iss_alert.json
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

---

## Quick Start

### 1. Create a Telegram Bot (2 minutes)

1. Open Telegram → search **@BotFather**
2. Send `/newbot` → follow prompts → copy the **token**
3. Send your new bot any message, then visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Copy the `"id"` value from `"chat"` — that's your **Chat ID**

### 2. Configure Environment

```bash
cd /path/to/stargazer
cp .env.example .env
nano .env
# Fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

### 3. Deploy on Proxmox LXC

**Option A — Docker (recommended)**
```bash
# On your LXC with Docker installed:
git clone <your-repo> stargazer
cd stargazer
cp .env.example .env && nano .env
docker compose up -d

# API running at: http://LXC_IP:8181
# Dashboard at:  http://LXC_IP:8080
```

**Option B — Bare metal (no Docker)**
```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8181

# For web: just serve the /web folder with any HTTP server
cd ../web
python3 -m http.server 8080
```

### 4. Verify the API

```bash
curl http://LXC_IP:8181/
curl http://LXC_IP:8181/tonight | python3 -m json.tool
curl http://LXC_IP:8181/scorpius
```

---

## Cloudflare Zero Trust Setup

Expose the dashboard remotely through your existing Cloudflare ZT tunnel:

1. Cloudflare Zero Trust dashboard → **Access** → **Tunnels**
2. Add a public hostname for your LXC:
   - Subdomain: `stars.yourdomain.com`
   - Service: `http://LXC_IP:8080`
3. (Optional) Add an Access Policy to protect it with your email

The API can stay internal (no external exposure needed — n8n calls it internally).

---

## n8n Workflow Import

1. Open your n8n instance
2. Go to **Workflows** → **Import from file**
3. Import each JSON from the `n8n/` folder:
   - `daily_report.json` — Every day at 7pm
   - `weekly_report.json` — Every Sunday at 8pm
   - `monthly_report.json` — 1st of every month at 7pm
   - `iss_alert.json` — Every 2 hours (alerts if pass within 30 min)

4. In each workflow, update the **Telegram node credentials**:
   - Add a new credential: `Telegram API` → paste your Bot Token
   - Set environment variable `TELEGRAM_CHAT_ID` in n8n settings

5. Set `STARGAZER_API_URL` in n8n environment:
   - If n8n and API are on same Docker network: `http://stargazer-api:8181`
   - If separate LXCs: `http://192.168.1.XXX:8181`

6. **Activate** each workflow

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Service info |
| `GET /tonight` | Full tonight report (JSON) |
| `GET /tonight/telegram` | Tonight report (Telegram markdown) |
| `GET /weekly` | 7-day calendar (JSON) |
| `GET /weekly/telegram` | Weekly (Telegram markdown) |
| `GET /monthly` | Monthly preview (JSON) |
| `GET /monthly/telegram` | Monthly (Telegram markdown) |
| `GET /scorpius` | Scorpius window + visible targets |
| `GET /moon` | Moon phase + rise/set |
| `GET /planets` | All planets with altitude/azimuth |
| `GET /iss?count=3` | Next ISS passes |
| `GET /seeing` | Cloud/seeing forecast + 7-day weather |
| `GET /targets` | Full DSO target database with live altitude |

---

## Free Services Used

| Service | Cost | Purpose |
|---|---|---|
| **Skyfield** | Free Python lib | NASA JPL ephemeris calculations |
| **Open-Meteo** | Free, no key | Cloud cover + weather forecast |
| **Celestrak TLE** | Free | ISS orbital data for pass predictions |
| **Clear Outside** | Free embed | Astronomy-optimized weather widget |
| **NASA APOD** | Free (sign up) | Daily space photo |
| **n8n** | Self-hosted | Scheduling + Telegram delivery |
| **python-telegram-bot** | Free | Telegram Bot API |

---

## Your Scorpius Season Window

From Columbus OH (40.1°N), Scorpius stays low in the southern sky:

| Month | Max Altitude | Status |
|---|---|---|
| June | ~25° | 🟡 Good — season starting |
| **July** | **~27°** | **🟢 PEAK — best month** |
| **August** | **~25°** | **🟢 Excellent** |
| September | ~18° | 🟡 Fading |
| October | <10° | 🔴 Difficult |

Your south-facing porch is **perfectly oriented** — Scorpius culminates due south.

---

## Celestron 5" DX Tips

- **Collimation**: Check every few sessions (Newtonian variant)
- **Dark adaptation**: 20-25 minutes before observing DSOs
- **Best targets for Bortle 8**: M4, M80, M6, M7, Antares, Graffias, ν Sco
- **Avoid on full moon**: M4, NGC 6144, rho Oph nebula
- **Always try**: Antares color at any magnification, Graffias double split

---

## License

MIT — use it, fork it, share it. Astronomy should be free. 🌌
