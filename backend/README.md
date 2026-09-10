# SIF SENTINEL Backend

Welcome to the backend for the SIF Sentinel project! This is a FastAPI modular monolith that houses our ML models, Rule Engines, and APIs.

## 🚀 Quick Start (For All Team Members)

To make collaboration incredibly fast, we have **Dockerized** the entire backend. You do **not** need to install Python, Postgres, Redis, or any heavy ML libraries on your laptop.

### Prerequisites
- Install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** on your machine.
- Make sure Docker is running!

### Running the App
Open your terminal and run the following commands:

`ash
# 1. ALWAYS make sure you are inside the backend directory!
cd backend

# 2. Build and start the container
docker compose up -d --build
`

That's it! Your API is now live at: **http://localhost:8000/docs**

### How it Works (Under the Hood)
When you run the docker command, it automatically:
1. Installs all required Python dependencies using uv in an isolated container.
2. Connects to our **live Neon Cloud PostgreSQL Database**.
3. Spins up a local **Redis** instance for background processing.
4. Loads the **Gemini API** and ML models (TF-IDF + LogReg).

To stop the app and clear the container, simply run:
`ash
docker compose down
`

---

## 🛠 Manual Development (Optional)
If you prefer not to use Docker and want to run things natively on your laptop, you will need Python 3.12+ and the uv package manager.

`ash
# Inside the backend/ directory
uv sync
uv run uvicorn app.main:app --reload
`

### Testing
To run the complete test suite locally:
`ash
uv run pytest -q
`
