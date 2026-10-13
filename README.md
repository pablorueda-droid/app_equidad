# ACTUAR por la Equidad

Indicadores públicos de equidad de género (participación y brecha salarial) en las empresas del Ecuador, construidos a partir de los estudios actuariales de Actuaria y los datos de la Superintendencia de Compañías.

```
BigQuery (act-actuafast)  ──►  ETL FastAPI (Cloud Run, act-automations-stage)  ──►  GCS (JSON agregado)
                                        │
                                        └── sirve el dashboard React + GET /api/dashboard
Cloud Scheduler (mensual) ── POST /etl/run ──┘
```

- [`etl/`](etl): extracción, depuración, clasificación y cálculo de indicadores (Python).
- [`dashboard/`](dashboard): tablero público (React + Vite + TypeScript + Recharts).
- [`docs/metricas.md`](docs/metricas.md): análisis de las métricas del Power BI anterior, correcciones y métricas nuevas.

## Desarrollo local

```bash
# ETL
cd etl
pip install -r requirements-dev.txt
python -m pytest
python run_local.py --guardar-extraccion ../_archivo/cache/extraccion.parquet   # consulta BigQuery (≈5 min)
python run_local.py --desde-parquet ../_archivo/cache/extraccion.parquet --output out

# Dashboard (copiar out/publico/dashboard.json descomprimido a dashboard/public/dashboard.json,
# o definir VITE_DATA_URL apuntando al servicio desplegado)
cd dashboard
npm install
npm run dev
```

Requiere credenciales de Google Cloud con lectura en `act-actuafast.actuafastv2` (`gcloud auth application-default login`).

## Despliegue

```bash
gcloud auth login
PRIMERA_VEZ=1 bash etl/deploy/deploy.sh   # bucket, cuenta de servicio, permisos BigQuery, secreto, Cloud Run y Scheduler
bash etl/deploy/deploy.sh                 # despliegues posteriores
gcloud scheduler jobs run equidad-etl-mensual --project act-automations-stage --location us-central1   # primera carga
```

El servicio queda público (el dashboard y `/api/dashboard` son de lectura) y `POST /etl/run` exige la cabecera `X-ETL-Token` (secreto `equidad-etl-token`).

Para incrustarlo en la web: `<iframe src="https://<url-del-servicio>/" style="width:100%;height:100vh;border:0"></iframe>` o enlace directo.

## Mantenimiento anual

1. Agregar el SBU del nuevo año en `etl/app/config.py` (`SBU_POR_ANIO`); sin él, el año no se procesa.
2. Desplegar y ejecutar el ETL.

## Privacidad

El repositorio es público: no contiene datos. El JSON publicado solo tiene agregados; se omiten las combinaciones con menos de 3 empresas y los sueldos de grupos con menos de 10 personas.
