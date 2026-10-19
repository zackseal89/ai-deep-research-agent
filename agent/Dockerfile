FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy project specifications
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --locked --no-dev

# Copy agent application code
COPY . .

# Expose FastAPI AG-UI port
EXPOSE 8123

# Start the uvicorn server
CMD ["uv", "run", "--no-sync", "python", "main.py"]
