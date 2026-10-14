#!/usr/bin/env bash
# Despliegue del microservicio ETL en Cloud Run (proyecto act-automations-stage).
# Requiere: gcloud autenticado (gcloud auth login) con permisos de admin en ambos proyectos.
# Uso:  bash etl/deploy/deploy.sh            (desde la raíz del repositorio; usa el Dockerfile raíz)
#       PRIMERA_VEZ=1 bash etl/deploy/deploy.sh   (crea bucket, cuenta de servicio, secreto, permisos y scheduler)
set -euo pipefail
cd "$(dirname "$0")/../.."

# gcloud necesita Python. Si este shell no tiene "python" en el PATH (p. ej. Git Bash abierto desde
# PowerShell), se usa el Python que trae el propio Cloud SDK.
if [[ -z "${CLOUDSDK_PYTHON:-}" ]] && ! command -v python >/dev/null 2>&1; then
  SDK_BIN="$(dirname "$(command -v gcloud)")"
  for CAND in "$SDK_BIN/../platform/bundledpython/python.exe" "$SDK_BIN/../platform/bundledpython/bin/python3"; do
    if [[ -x "$CAND" ]]; then
      export CLOUDSDK_PYTHON="$CAND"
      break
    fi
  done
fi
PYTHON_BIN="${CLOUDSDK_PYTHON:-python}"

PROJECT="${PROJECT:-act-automations-stage}"
BQ_PROJECT="${BQ_PROJECT:-act-actuafast}"
BQ_DATASET="${BQ_DATASET:-actuafastv2}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-equidad-etl}"
BUCKET="${BUCKET:-${PROJECT}-equidad}"
# Cuenta con lectura de BigQuery ya otorgada en act-actuafast (compartida con backend-actuafast)
SA_NAME="${SA_NAME:-sa-backend-actuafast}"
SA="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
SECRET="${SECRET:-equidad-etl-token}"
CORS_ORIGINS="${CORS_ORIGINS:-*}"
SCHEDULE="${SCHEDULE:-0 3 1 * *}"   # día 1 de cada mes, 03:00

if [[ "${PRIMERA_VEZ:-0}" == "1" ]]; then
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
    secretmanager.googleapis.com cloudscheduler.googleapis.com --project "$PROJECT"

  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT" \
    --display-name "ETL ACTUAR por la Equidad" || true

  # Bucket privado para salidas (el JSON público se sirve a través del servicio)
  gcloud storage buckets create "gs://${BUCKET}" --project "$PROJECT" --location "$REGION" \
    --uniform-bucket-level-access || true
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
    --member "serviceAccount:${SA}" --role roles/storage.objectAdmin

  # Lectura de BigQuery en act-actuafast (requiere ser admin allí; si no, debe otorgarlo quien lo sea)
  for ROLE in roles/bigquery.jobUser roles/bigquery.readSessionUser roles/bigquery.dataViewer; do
    gcloud projects add-iam-policy-binding "$BQ_PROJECT" --member "serviceAccount:${SA}" --role "$ROLE"       --condition=None >/dev/null 2>&1 || echo "AVISO: no se pudo otorgar $ROLE en $BQ_PROJECT (se asume ya otorgado)"
  done

  # Token para disparar el ETL
  if ! gcloud secrets describe "$SECRET" --project "$PROJECT" >/dev/null 2>&1; then
    "$PYTHON_BIN" -c "import secrets; print(secrets.token_urlsafe(32), end='')" | \
      gcloud secrets create "$SECRET" --project "$PROJECT" --data-file=-
  fi
  gcloud secrets add-iam-policy-binding "$SECRET" --project "$PROJECT" \
    --member "serviceAccount:${SA}" --role roles/secretmanager.secretAccessor
fi

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --source . \
  --service-account "$SA" \
  --memory 8Gi --cpu 2 --timeout 3600 --concurrency 20 \
  --min-instances 0 --max-instances 3 \
  --allow-unauthenticated \
  --set-env-vars "OUTPUT_URI=gs://${BUCKET},BQ_PROJECT=${BQ_PROJECT},BQ_DATASET=${BQ_DATASET},CORS_ORIGINS=${CORS_ORIGINS}" \
  --set-secrets "ETL_TOKEN=${SECRET}:latest"

URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')
echo "Servicio: $URL"

if [[ "${PRIMERA_VEZ:-0}" == "1" ]]; then
  TOKEN=$(gcloud secrets versions access latest --secret "$SECRET" --project "$PROJECT")
  gcloud scheduler jobs create http "${SERVICE}-mensual" \
    --project "$PROJECT" --location "$REGION" \
    --schedule "$SCHEDULE" --time-zone "America/Guayaquil" \
    --uri "${URL}/etl/run" --http-method POST \
    --headers "X-ETL-Token=${TOKEN}" \
    --attempt-deadline 1800s || true
  echo "Scheduler creado. Ejecución manual: gcloud scheduler jobs run ${SERVICE}-mensual --project $PROJECT --location $REGION"
fi
