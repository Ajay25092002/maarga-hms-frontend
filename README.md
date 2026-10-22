# Maarga Mindcare HMS — Frontend

## 1. Prerequisites

Before building and running the frontend, ensure the following are available:

- Docker is installed and running.
- Frontend source code and `package.json` are available.
- The appropriate environment configuration is set for the selected environment.
- The FastAPI backend is running and accessible from the browser.

---

## 2. Development Environment Configuration

Use this configuration when running the frontend in the development environment on your local machine.

### Step 1: Configure the environment

In the frontend `.env` file, set:

```env
VITE_API_BASE_URL=http://localhost:8001
```

This configuration assumes the backend is running locally on port `8001`.

### Step 2: Build the Docker image

Run the following command from the frontend project directory:

```bash
docker build --no-cache \
  --build-arg VITE_API_BASE_URL=http://localhost:8001 \
  -t maarga-hms-frontend-dev .
```

### Step 3: Run the frontend container

```bash
docker run -d \
  --name maarga-hms-frontend-dev \
  -p 5173:80 \
  maarga-hms-frontend-dev
```

### Step 4: Access the frontend

Open the following URL in your browser:

```text
http://localhost:5173
```

**Note:** If the browser is running on a different machine from the backend, `localhost` refers to that browser's machine, not the backend server. Use an address accessible from the browser when necessary.

---

## 3. Production Environment Configuration

Use this configuration when deploying the frontend to the production server.

**Production server IP:** `164.52.213.96`

### Step 1: Configure the environment

Use the production backend URL:

```env
VITE_API_BASE_URL=http://164.52.213.96:8001
```

The backend must be accessible to users' browsers at this address.

### Step 2: Build the Docker image

Run the following command from the frontend project directory on the production server:

```bash
docker build --no-cache \
  --build-arg VITE_API_BASE_URL=http://164.52.213.96:8001 \
  -t maarga-hms-frontend .
```

### Step 3: Run the frontend container

```bash
docker run -d \
  --name maarga-hms-frontend \
  -p 5173:80 \
  maarga-hms-frontend
```

### Step 4: Access the production frontend

Open the following URL:

```text
http://164.52.213.96:5173
```

Ensure that port `5173` is allowed by the server firewall and hosting provider's security rules.

---

## 4. Useful Docker Commands

### View running containers

```bash
docker ps
```

### View frontend container logs

Development:

```bash
docker logs -f maarga-hms-frontend-dev
```

Production:

```bash
docker logs -f maarga-hms-frontend
```

### Stop a container

Development:

```bash
docker stop maarga-hms-frontend-dev
```

Production:

```bash
docker stop maarga-hms-frontend
```

### Remove a container

Development:

```bash
docker rm maarga-hms-frontend-dev
```

Production:

```bash
docker rm maarga-hms-frontend
```

---

## 5. Important Notes

- **Environment separation:** Use the development configuration for local development and the production configuration for the deployed server.
- **Build-time variables:** Vite embeds `VITE_` environment variables into the frontend during the build. Rebuild the image whenever the API URL changes.
- **Dockerfile support:** The frontend Dockerfile must accept the `VITE_API_BASE_URL` build argument and make it available to Vite before running the production build.
- **Backend connectivity:** The API URL must be reachable from the user's browser. Ensure that the backend is listening on the intended port and that firewall and CORS settings permit access.
- **Secrets:** Never put passwords, API secrets, or other sensitive credentials in frontend environment variables. Variables prefixed with `VITE_` are exposed to browser-side code.
- **Production security:** For a public production deployment, HTTPS through a domain and reverse proxy is recommended instead of exposing the frontend and backend over plain HTTP.
- **React Router:** Configure the production web server to fall back to `index.html` for frontend routes.

