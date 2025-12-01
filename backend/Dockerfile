FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl dos2unix && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create directories
RUN mkdir -p /app/vault /app/data

# Fix line endings and make startup script executable
COPY startup.sh /app/startup.sh
RUN dos2unix /app/startup.sh && chmod +x /app/startup.sh

EXPOSE 8000

# Run startup script (initializes DB then starts app)
CMD ["/bin/bash", "/app/startup.sh"]
