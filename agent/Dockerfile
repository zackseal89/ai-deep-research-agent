FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy project specifications
COPY pyproject.toml .

# Install dependencies
RUN uv pip install --system -r pyproject.toml

# Copy agent application code
COPY . .

# Expose FastAPI AG-UI port
EXPOSE 8123

# Start the uvicorn server
CMD ["python", "main.py"]
