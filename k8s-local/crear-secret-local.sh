#!/bin/bash
# Crea (o actualiza) el Secret de Kubernetes para la copia LOCAL de ReportaGT (Docker Desktop),
# tomando como base tu .env pero con BASE_URL apuntando a localhost.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No encontré .env en $(pwd). Copia .env.example a .env y llena los valores primero."
  exit 1
fi

TMP=$(mktemp)
grep -v '^#' .env | grep -v '^$' | grep -v '^BASE_URL=' > "$TMP"
echo "BASE_URL=http://localhost:8080" >> "$TMP"

kubectl create namespace reportagt --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic reportagt-secrets -n reportagt \
  --from-env-file="$TMP" --dry-run=client -o yaml | kubectl apply -f -

rm -f "$TMP"
echo "Listo: Secret 'reportagt-secrets' creado/actualizado en el namespace reportagt (local)."
