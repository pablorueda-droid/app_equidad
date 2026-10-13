"""Ejecuta el ETL localmente sin servidor HTTP.

Ejemplos (desde la carpeta etl/):
    python run_local.py                                   # BigQuery -> out/
    python run_local.py --guardar-extraccion cache.parquet  # además guarda la extracción cruda
    python run_local.py --desde-parquet cache.parquet       # reprocesa sin consultar BigQuery
    python run_local.py --output gs://bucket/equidad      # escribe en GCS
"""

import argparse

from app import extract, pipeline

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--output", help="Carpeta local o gs://bucket/prefijo (por defecto OUTPUT_URI u 'out')")
    p.add_argument("--desde-parquet", help="Parquet con la extracción cruda (evita BigQuery)")
    p.add_argument("--guardar-extraccion", help="Guarda la extracción cruda de BigQuery en este parquet y termina")
    a = p.parse_args()

    if a.guardar_extraccion:
        df = extract.extraer_base(extract.anio_final_disponible())
        df.to_parquet(a.guardar_extraccion, index=False)
        print(f"Extracción guardada en {a.guardar_extraccion}")
    else:
        pipeline.ejecutar(output_uri=a.output, detalle_local=a.desde_parquet)
