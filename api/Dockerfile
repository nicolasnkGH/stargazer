FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create data dir for Skyfield ephemeris files
RUN mkdir -p /app/data
ENV HOME=/app

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8181

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8181"]
