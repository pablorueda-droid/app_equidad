"""Escritura/lectura de salidas en carpeta local o en Google Cloud Storage (gs://)."""

import gzip
import io
import json
from pathlib import Path

import pandas as pd


def _split_gs(uri: str):
    sin = uri[len("gs://"):]
    bucket, _, prefijo = sin.partition("/")
    return bucket, prefijo.strip("/")


def _join(base: str, nombre: str) -> str:
    return f"{base.rstrip('/')}/{nombre}"


def escribir_bytes(base: str, nombre: str, datos: bytes, content_type: str, encoding: str | None = None):
    destino = _join(base, nombre)
    if base.startswith("gs://"):
        from google.cloud import storage

        bucket, prefijo = _split_gs(base)
        blob = storage.Client().bucket(bucket).blob(f"{prefijo}/{nombre}" if prefijo else nombre)
        if encoding:
            blob.content_encoding = encoding
        blob.cache_control = "public, max-age=300"
        blob.upload_from_string(datos, content_type=content_type)
    else:
        ruta = Path(destino)
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_bytes(datos)
    print(f"  Escrito {destino} ({len(datos) / 1024:,.0f} KB)")
    return destino


def leer_bytes(base: str, nombre: str) -> bytes | None:
    if base.startswith("gs://"):
        from google.cloud import storage

        bucket, prefijo = _split_gs(base)
        blob = storage.Client().bucket(bucket).blob(f"{prefijo}/{nombre}" if prefijo else nombre)
        if not blob.exists():
            return None
        datos = blob.download_as_bytes(raw_download=True)
    else:
        ruta = Path(_join(base, nombre))
        if not ruta.exists():
            return None
        datos = ruta.read_bytes()
    return gzip.decompress(datos) if datos[:2] == b"\x1f\x8b" else datos


def escribir_dashboard(base: str, dashboard: dict, sello: str):
    crudo = json.dumps(dashboard, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comprimido = gzip.compress(crudo, compresslevel=9)
    escribir_bytes(base, "publico/dashboard.json", comprimido, "application/json", encoding="gzip")
    escribir_bytes(base, f"historico/dashboard_{sello}.json.gz", comprimido, "application/gzip")


def escribir_detalle(base: str, df: pd.DataFrame, sello: str):
    buf = io.BytesIO()
    df.to_parquet(buf, engine="pyarrow", index=False)
    escribir_bytes(base, f"privado/detalle_{sello}.parquet", buf.getvalue(), "application/octet-stream")
