"""Microservicio ETL ACTUAR por la Equidad (Cloud Run).

Endpoints:
  GET  /health            estado del servicio (/healthz está reservado en Cloud Run)
  GET  /api/dashboard     JSON público de indicadores (lo consume el dashboard React)
  POST /etl/run           ejecuta el ETL completo (requiere cabecera X-ETL-Token)
  GET  /                  dashboard React compilado (si existe STATIC_DIR)
"""

import os
import secrets
import threading
import time

from fastapi import FastAPI, Header, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from . import config, pipeline, storage

app = FastAPI(title="ACTUAR por la Equidad - ETL", version="1.0.0")
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET"], allow_headers=["*"])

_CACHE_TTL = 300
_cache: dict = {"datos": None, "ts": 0.0}
_etl_lock = threading.Lock()


@app.get("/health")
def healthz():
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard():
    if _cache["datos"] is None or time.time() - _cache["ts"] > _CACHE_TTL:
        datos = storage.leer_bytes(config.OUTPUT_URI, "publico/dashboard.json")
        if datos is None:
            raise HTTPException(404, "Aún no se ha generado el dashboard. Ejecute POST /etl/run.")
        _cache.update(datos=datos, ts=time.time())
    return Response(
        content=_cache["datos"],
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={_CACHE_TTL}"},
    )


@app.post("/etl/run")
async def etl_run(x_etl_token: str = Header(default="")):
    if not config.ETL_TOKEN or not secrets.compare_digest(x_etl_token, config.ETL_TOKEN):
        raise HTTPException(403, "Token inválido")
    if not _etl_lock.acquire(blocking=False):
        raise HTTPException(409, "Ya hay una ejecución del ETL en curso")
    try:
        resumen = await run_in_threadpool(pipeline.ejecutar)
    finally:
        _etl_lock.release()
    _cache.update(datos=None, ts=0.0)
    return resumen


# El dashboard se monta al final para que no tape las rutas de la API
_static = os.getenv("STATIC_DIR", "")
if _static and os.path.isdir(_static):
    app.mount("/", StaticFiles(directory=_static, html=True), name="dashboard")
