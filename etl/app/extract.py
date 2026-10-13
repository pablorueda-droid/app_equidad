"""Extracción desde BigQuery (vista consolidada de estudios actuariales + SCVS).

Los filtros de calidad que no dependen de cálculos sobre el conjunto (jubilados, SBU,
edad, antigüedad, sexo, tipo de empresa) se aplican en SQL para mover menos datos.
"""

import pandas as pd
from google.cloud import bigquery

from . import config


def _sql(anio_final: int) -> str:
    sbu = ", ".join(
        f"STRUCT({a} AS anio, {v} AS sbu)" for a, v in config.SBU_POR_ANIO.items()
    )
    return f"""
    WITH sbu AS (SELECT * FROM UNNEST([{sbu}])),
    base AS (
        SELECT
            TRIM(ea.empresa_identificacion)    AS rucced,
            UPPER(TRIM(ea.sexo_persona))       AS sexo_persona,
            IFNULL(ea.cargo, 'sin_definir')    AS cargo,
            ea.remuneracion_promedio_desahucio AS remuneracion,
            CAST(FLOOR(ea.edad) AS INT64)      AS edad,
            ea.ts_desahucio                    AS ts_desahucio,
            ea.anio_valoracion                 AS anio
        FROM `{config.VIEW_ESTUDIOS}` ea
        JOIN sbu ON sbu.anio = ea.anio_valoracion
        WHERE ea.es_ultima_version = TRUE
          AND ea.anio_valoracion BETWEEN {config.ANIO_INICIAL} AND {anio_final}
          AND ea.tipo IN (2, 3, 4)
          AND ea.empresa_identificacion IS NOT NULL
          AND UPPER(TRIM(ea.sexo_persona)) IN ('M', 'F')
          AND ea.remuneracion_promedio_desahucio >= sbu.sbu
          AND ea.edad BETWEEN 18 AND 100
          AND ea.ts_desahucio >= 0
          AND NOT REGEXP_CONTAINS(UPPER(IFNULL(ea.cargo, '')), r'JUBILAD|JUBILACION|JUBILAR')
    ),
    empresas_anio AS (SELECT DISTINCT rucced, anio FROM base),
    -- CIIU nivel 1 más reciente de cada RUC (estable en el tiempo)
    ciiu AS (
        SELECT ruc, ciiu_n1 FROM (
            SELECT ruc, UPPER(SUBSTR(TRIM(ciiu_n1), 1, 1)) AS ciiu_n1,
                   ROW_NUMBER() OVER (PARTITION BY ruc ORDER BY anio DESC) AS rn
            FROM `{config.TBL_BALANCES}`
            WHERE ruc IS NOT NULL AND ciiu_n1 IS NOT NULL AND TRIM(ciiu_n1) != ''
        ) WHERE rn = 1
    ),
    -- Segmento SCVS (tamaño oficial) del balance más cercano anterior o igual al año del estudio
    segmento AS (
        SELECT rucced, anio, segmento FROM (
            SELECT e.rucced, e.anio, UPPER(TRIM(b.segmento)) AS segmento,
                   ROW_NUMBER() OVER (
                       PARTITION BY e.rucced, e.anio
                       ORDER BY IF(b.anio <= e.anio, 0, 1), ABS(e.anio - b.anio)
                   ) AS rn
            FROM empresas_anio e
            JOIN `{config.TBL_BALANCES}` b ON b.ruc = e.rucced
            WHERE b.segmento IS NOT NULL
        ) WHERE rn = 1
    ),
    provincia AS (
        SELECT ruc, ANY_VALUE(TRIM(provincia)) AS provincia
        FROM `{config.TBL_EMPRESAS}` WHERE ruc IS NOT NULL GROUP BY ruc
    )
    SELECT b.*, c.ciiu_n1, s.segmento, p.provincia
    FROM base b
    LEFT JOIN ciiu c ON c.ruc = b.rucced
    LEFT JOIN segmento s ON s.rucced = b.rucced AND s.anio = b.anio
    LEFT JOIN provincia p ON p.ruc = b.rucced
    """


def extraer_base(anio_final: int) -> pd.DataFrame:
    client = bigquery.Client(project=config.BQ_PROJECT)
    print(f"Consultando BigQuery {config.VIEW_ESTUDIOS} ({config.ANIO_INICIAL}-{anio_final}) ...")
    job = client.query(_sql(anio_final))
    job.result()
    try:
        df = job.to_dataframe(create_bqstorage_client=True)
    except Exception as e:  # sin permiso bigquery.readSessionUser -> descarga por REST (más lenta)
        print(f"  BigQuery Storage API no disponible ({type(e).__name__}); se usa REST")
        df = job.to_dataframe(create_bqstorage_client=False)
    print(f"  Filas extraídas (ya filtradas por calidad): {len(df):,}")
    return df


def anio_final_disponible() -> int:
    """Último año con SBU configurado (los años sin SBU no se pueden filtrar)."""
    return max(config.SBU_POR_ANIO)
