FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Preload Skyfield ephemeris at build time (avoids CPU spike on first request)
RUN mkdir -p /app/.skyfield && \
    python3 -c "from skyfield.api import Loader; l = Loader('/app/.skyfield'); l.timescale(); l('de421.bsp')" && \
    echo "Skyfield ephemeris preloaded"
ENV HOME=/app

EXPOSE 8181

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8181"]
