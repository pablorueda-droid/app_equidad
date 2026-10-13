"""Orquestación del ETL: BigQuery -> transformaciones -> indicadores -> almacenamiento."""

import time
from datetime import datetime, timezone

import pandas as pd

from . import config, extract, indicators, storage, transform


def ejecutar(output_uri: str | None = None, detalle_local: str | None = None) -> dict:
    """
    Ejecuta el ETL completo.

    detalle_local: ruta a un parquet ya extraído (columnas de extract.py) para
    reprocesar sin consultar BigQuery (útil en desarrollo y pruebas).
    """
    t0 = time.time()
    base = output_uri or config.OUTPUT_URI
    sello = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    print(f"INICIO ETL equidad -> {base}")

    if detalle_local:
        df = pd.read_parquet(detalle_local)
        print(f"  Leído {detalle_local}: {len(df):,} filas")
    else:
        df = extract.extraer_base(extract.anio_final_disponible())

    df = transform.transformar(df)
    dashboard = indicators.construir_dashboard(df)

    storage.escribir_dashboard(base, dashboard, sello)
    if config.GUARDAR_DETALLE:
        storage.escribir_detalle(base, df, sello)

    resumen = {
        "estado": "ok",
        "sello": sello,
        "registros": dashboard["meta"]["registros"],
        "empresas": dashboard["meta"]["empresas"],
        "anios": dashboard["dims"]["anios"],
        "combinaciones": len(dashboard["datos"]),
        "segundos": round(time.time() - t0, 1),
    }
    print(f"FIN ETL: {resumen}")
    return resumen
