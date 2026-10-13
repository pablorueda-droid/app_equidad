# Imagen única: dashboard React (estático) + microservicio ETL/API (FastAPI)

# 1) Build del dashboard
FROM node:24-slim AS dashboard
WORKDIR /dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
# Servido por el mismo servicio: los datos se leen de la API relativa
ENV VITE_DATA_URL=./api/dashboard
RUN npm run build

# 2) Servicio Python
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PIP_NO_CACHE_DIR=1 \
    STATIC_DIR=/app/static
WORKDIR /app
COPY etl/requirements.txt .
RUN pip install -r requirements.txt
COPY etl/app ./app
COPY etl/run_local.py .
COPY --from=dashboard /dashboard/dist ./static

# Un solo worker: el ETL usa mucha memoria y no debe correr dos veces en paralelo
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --timeout-keep-alive 75
