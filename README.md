# Maarga Mindcare HMS — Frontend

## Overview

The Maarga Mindcare HMS frontend is built with React and Vite. It provides the user interface for the Hospital Management System and communicates with the FastAPI backend.

## Prerequisites

- Docker installed and running.
- Frontend source code and `package.json`.
- A configured frontend `.env` file containing the backend API URL.
- The backend API running and accessible.

## Environment Configuration

Create a `.env` file in the frontend root directory:

```dotenv
VITE_API_BASE_URL=http://localhost:8001
```

Replace the URL with the reachable backend address for your environment.

## Build Docker Image

Run from the frontend project directory:

```powershell
docker build --no-cache --build-arg VITE_API_BASE_URL=http://16.176.31.53:8001 -t maarga-hms-frontend .
```

The Dockerfile copies the project files and runs `npm run build`. Vite reads the `.env` configuration during the build.

## Run the Container

```powershell
docker run -d --name maarga-hms-frontend -p 5173:80 maarga-hms-frontend
```

## Access the Application

Open the following URL in your browser:

http://localhost:5173

## Useful Docker Commands

View container logs:

```powershell
docker logs -f maarga-hms-frontend
```

Stop the container:

```powershell
docker stop maarga-hms-frontend
```

Remove the container:

```powershell
docker rm maarga-hms-frontend
```

## Notes

- The backend must be accessible from the user's browser.
- Vite embeds `VITE_` environment variables into the frontend build. Rebuild the image after changing the API URL.
- Never put passwords, API secrets, or other confidential values in frontend environment variables.
- Ensure Nginx is configured to serve `index.html` for React Router routes.