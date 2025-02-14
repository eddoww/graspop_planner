FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make sure the entrypoint script is executable and has correct line endings
RUN chmod +x entrypoint.sh && \
    sed -i 's/\r$//' entrypoint.sh

# Run as non-root user
RUN useradd -m myuser && \
    chown -R myuser:myuser /app
USER myuser

# Set Python path to include the app directory
ENV PYTHONPATH=/app

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]