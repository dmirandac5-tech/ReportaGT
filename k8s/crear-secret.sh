#!/bin/bash
# Crea (o actualiza) el Secret de Kubernetes con las variables de entorno de ReportaGT,
# tomando como base tu .env local pero con BASE_URL apuntando al dominio público.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No encontré .env en $(pwd). Copia .env.example a .env y llena los valores primero."
  exit 1
fi

DOMINIO="${1:-reportagt.duckdns.org}"
TMP=$(mktemp)
grep -v '^#' .env | grep -v '^$' | grep -v '^BASE_URL=' | sed -E 's/^([A-Za-z_]+)="(.*)"$/\1=\2/' > "$TMP"
echo "BASE_URL=https://${DOMINIO}" >> "$TMP"

kubectl create secret generic reportagt-secrets -n dmirandac5 \
  --from-env-file="$TMP" --dry-run=client -o yaml | kubectl apply -f -

rm -f "$TMP"
echo "Listo: Secret 'reportagt-secrets' creado/actualizado en el namespace dmirandac5 (dominio: ${DOMINIO})."
