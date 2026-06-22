# StarGazer AI Memory Bank

## Project Context
StarGazer is a personal, distraction-free stargazing dashboard designed to help beginners figure out if it's a good night to observe and what to look at.

## Architecture & Tech Stack
- **Frontend**: Vanilla JS, HTML, CSS (no bundlers, no React). Deployed on Cloudflare Pages.
- **Backend**: Python 3.11+ / FastAPI. Computes ephemerides with `skyfield`.
- **AI Integration**:
  - **Primary**: Google Gemini 2.5 Flash via OpenAI compatibility endpoint.
  - **Fallback**: Local Qwen (4B/9B) running on `llama.cpp` using AMD ROCm on the local server.
  - **Graceful Degradation**: If both APIs fail, the system falls back to a deterministic, math-based rule engine.
  - **Caching**: AI responses are hashed by location and 3-hour time block to minimize API calls and server load. Stuck "processing" cache locks are automatically evicted after 4 minutes.

## Important Notes & Gotchas
- The backend API runs inside a Docker container (`/app` directory). Any imports in `api/engine.py` must use `from engine import X` (not `from api.engine import X`) to avoid `ModuleNotFoundError` inside the container.
- Qwen models natively produce massive `reasoning_content` blocks that can delay responses by 40-60 seconds on modest hardware. Using `--reasoning off` with `llama.cpp` for models like Qwen 4B significantly speeds up inference.
- The AI background thread passes `fallback_args` to gracefully drop into rule-based calculation if API connections time out or return invalid JSON.
