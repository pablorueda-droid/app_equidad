# CLAUDE.md

Guía para trabajar con código en este repositorio.

## Proyecto

**ACTUAR por la Equidad**: indicadores públicos de equidad de género (participación y brecha salarial) del mercado laboral formal ecuatoriano, a partir de los estudios actuariales de Actuaria (Actuafast) y la Superintendencia de Compañías (SCVS).

```
etl/          Microservicio FastAPI (Cloud Run, proyecto act-automations-stage)
  app/
    config.py       parámetros: SBU por año, CIIU, palabras clave de cargos, umbrales de privacidad
    extract.py      consulta BigQuery (act-actuafast.actuafastv2) con filtros de calidad en SQL
    transform.py    sector, tamaño, nivel de cargo, rangos, provincia (vectorizado)
    indicators.py   precalcula indicadores para todas las combinaciones de filtros -> JSON público
    storage.py      escritura local o gs://
    pipeline.py     orquestación
    main.py         GET /health, GET /api/dashboard, POST /etl/run (cabecera X-ETL-Token)
  run_local.py      ejecución local (con --guardar-extraccion / --desde-parquet para no repetir BigQuery)
  deploy/deploy.sh  despliegue Cloud Run + bucket + secreto + Cloud Scheduler
dashboard/    React + Vite + TypeScript; consume /api/dashboard (VITE_DATA_URL)
docs/         metodología y análisis de métricas
_archivo/     (ignorado por git) scripts legacy, Power BI, parquets y documentos históricos
```

## Comandos

```bash
# ETL (desde etl/)
pip install -r requirements-dev.txt
python -m pytest
python run_local.py --guardar-extraccion ../_archivo/cache/extraccion.parquet   # BigQuery -> parquet
python run_local.py --desde-parquet ../_archivo/cache/extraccion.parquet --output out
uvicorn app.main:app --reload --port 8080     # OUTPUT_URI=out para servir lo generado

# Dashboard (desde dashboard/)
npm install
npm run dev        # usa public/dashboard.json si VITE_DATA_URL no está definido
npm run build
```

## Reglas de negocio (no cambiar sin revisar docs/metricas.md)

1. Filtros: versión final del estudio, tipo de empresa ∈ {2,3,4}, sexo M/F, edad 18–100, antigüedad ≥ 0, cargos sin "JUBILAD/JUBILACION/JUBILAR", remuneración ≥ SBU del año. **`SBU_POR_ANIO` en config.py debe actualizarse cada año**; los años sin SBU no se procesan.
2. Sector = CIIU nivel 1 más reciente del RUC en SCVS; se excluyen sectores con ≤ 30 RUCs.
3. Tamaño = segmento SCVS del balance más cercano (≤ año del estudio); si falta, por nº de empleados del estudio.
4. Nivel de cargo: percentiles de remuneración en (sector, tamaño, año) (≤P55 operativo, ≤P95 táctico, resto estratégico); las palabras clave del cargo (sin tildes) lo sobrescriben.
5. Privacidad del JSON público: sin RUCs ni microdatos; celdas con < 3 empresas se omiten; remuneraciones de un sexo con < 10 personas se anulan.

## Convenciones

- Código, comentarios y columnas en español.
- El repositorio remoto es **público**: nunca versionar credenciales, datos (parquet/csv/xlsx) ni RUCs.
