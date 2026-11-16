#!/usr/bin/env bash
# Confere o Vacina em Dia no Google Cloud sem usar senha nem criar conta (ADR-035): se as rotinas
# protegidas exigem a chave, se a chave funciona, se o agendador e o Firestore estão de pé.
# Roda no Cloud Shell, depois de `scripts/gcp/implantar.sh`.
set -uo pipefail
REGIAO="${REGIAO:-us-central1}"
API="$(gcloud run services describe vacina-api --region="${REGIAO}" --format='value(status.url)')"
CHAVE="$(gcloud secrets versions access latest --secret=vacina-host-secrets |
  python3 -c "import sys,json;print(json.load(sys.stdin)['functionKeys'][0]['value'])")"
codigo() { curl -s -m 90 -o /dev/null -w '%{http_code}' "$@"; }

echo "API:                          ${API}"
echo "health:                       $(codigo "${API}/api/health")            (esperado 200)"
echo "rotina diária SEM chave:      $(codigo -X POST "${API}/api/jobs/daily-reminders")            (esperado 401)"
echo "rotina diária chave errada:   $(codigo -X POST "${API}/api/jobs/daily-reminders" -H 'x-functions-key: errada')            (esperado 401)"
printf 'rotina diária COM chave:      '; curl -s -m 90 -w ' -> %{http_code}  (esperado 200)\n' -X POST "${API}/api/jobs/daily-reminders" -H "x-functions-key: ${CHAVE}"
echo "vigia SEM chave:              $(codigo -X POST "${API}/api/calendar/watch/check")            (esperado 401)"
echo "vigia leitura pública:        $(codigo "${API}/api/calendar/watch")            (esperado 200)"
echo "rota de dados sem login:      $(codigo "${API}/api/members")            (esperado 401)"
echo
echo "Agendador:"
gcloud scheduler jobs list --location="${REGIAO}" --format='table(name.basename(),schedule,state)'
echo
echo "Firestore:"
gcloud firestore databases list --format='table(name.basename(),type,locationId,freeTier)'
echo
echo "Serviços (instâncias mínimas e máximas):"
gcloud run services list --region="${REGIAO}" \
  --format='table(metadata.name,spec.template.metadata.annotations."autoscaling.knative.dev/minScale",spec.template.metadata.annotations."autoscaling.knative.dev/maxScale")'
