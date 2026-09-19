# ReForge local development

## Requirements

- Python 3.10 or newer
- Git
- Node.js/npm only if you want to run the optional static frontend copy step

## Backend

Create and activate a virtual environment:

python -m venv venv

Linux/macOS:

source venv/bin/activate

Windows PowerShell:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt

Create a .env file with a Groq key if you want live AI reviews.

Start the API:

uvicorn backend.main:app --reload --port 8000

Check it:

curl http://localhost:8000/health

## Frontend

The frontend is plain HTML, CSS, and JavaScript.

Set frontend/js/config.js to the backend you are using:

window.REFORGE_CONFIG = {
  API_URL: "http://localhost:8000",
};

Then serve the directory:

cd frontend
python -m http.server 5173

Open http://localhost:5173.

## Optional frontend build

The npm script only copies the static frontend into dist/. There is no frontend framework or bundler.

cd frontend
npm run build

## Useful checks

Backend syntax:

python -m compileall backend

Frontend build:

cd frontend
npm run build

## Project layout

Re_Forge/
  backend/
    main.py
    config.py
    routes.py
    ai.py
    review_pipeline/
  frontend/
    index.html
    css/
    js/
    assets/
  docs/
  requirements.txt
  render.yaml

No database, authentication service, or account storage is required for local development.
