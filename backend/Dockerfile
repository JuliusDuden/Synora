FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create directories
RUN mkdir -p /app/vault /app/data

# Make startup script executable
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

EXPOSE 8000

# Run startup script (initializes DB then starts app)
CMD ["/app/startup.sh"]
