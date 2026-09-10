FROM python:3.12-slim

# Install system dependencies (needed for compiling C extensions like asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY pyproject.toml ./

# Install dependencies globally in the system environment
RUN uv pip install --system -e .

# Copy application code and ML artifacts
COPY . .

# Expose the API port
EXPOSE 8000

# Start the FastAPI server using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
