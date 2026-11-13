#!/bin/bash
# Configura el envío de correos con Gmail: pregunta el correo y la contraseña de aplicación,
# los guarda en .env (que no se sube a GitHub), actualiza el Secret y reinicia la app en el cluster.
set -euo pipefail
cd "$(dirname "$0")/.."

read -r -p "Tu correo de Gmail (el que envía): " CORREO
read -r -s -p "Contraseña de aplicación de 16 letras (no se verá al escribir): " CLAVE
echo
CLAVE="${CLAVE// /}"
read -r -p "Correo que recibe los reportes como municipalidad [Enter = el mismo]: " MUNI
MUNI="${MUNI:-$CORREO}"

if [ "${#CLAVE}" -ne 16 ]; then
  echo "La clave debe tener 16 letras (tiene ${#CLAVE}). No se cambió nada."
  exit 1
fi

sed -i.bak \
  -e "s|^MAIL_FROM=.*|MAIL_FROM=\"ReportaGT <${CORREO}>\"|" \
  -e "s|^SMTP_HOST=.*|SMTP_HOST=smtp.gmail.com|" \
  -e "s|^SMTP_PORT=.*|SMTP_PORT=465|" \
  -e "s|^SMTP_SECURE=.*|SMTP_SECURE=true|" \
  -e "s|^SMTP_USER=.*|SMTP_USER=${CORREO}|" \
  -e "s|^SMTP_PASS=.*|SMTP_PASS=${CLAVE}|" \
  -e "s|^MUNI_EMAIL=.*|MUNI_EMAIL=${MUNI}|" .env
rm -f .env.bak
echo "Listo: .env actualizado (envía: ${CORREO}, recibe la muni: ${MUNI})."

./k8s/crear-secret.sh
kubectl rollout restart deployment/reportagt -n dmirandac5
kubectl rollout status deployment/reportagt -n dmirandac5 --timeout=120s
