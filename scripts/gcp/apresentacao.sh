#!/usr/bin/env bash
# Liga, desliga e confere o Vacina em Dia no Google Cloud para a apresentação (ADR-035).
#
#   scripts/gcp/apresentacao.sh ligar     mantém 1 instância da API e do PLN acordada (sem partida a frio)
#   scripts/gcp/apresentacao.sh desligar  volta a 0 instâncias (custo zero parado)
#   scripts/gcp/apresentacao.sh status    mostra os endereços e testa a API e o PLN
#
# Roda no Cloud Shell. Ligar custa só enquanto durar (uma instância de 1 vCPU por algumas horas cabe
# nas cotas gratuitas); lembre de desligar depois.
set -euo pipefail
REGIAO="${REGIAO:-us-central1}"
url() { gcloud run services describe "$1" --region="${REGIAO}" --format='value(status.url)'; }

case "${1:-status}" in
  ligar)
    for s in vacina-api vacina-nlp; do
      gcloud run services update "$s" --region="${REGIAO}" --min-instances=1 --quiet >/dev/null
    done
    echo "Ligado: 1 instância de cada. Espere cerca de 1 minuto e rode: $0 status" ;;
  desligar)
    for s in vacina-api vacina-nlp; do
      gcloud run services update "$s" --region="${REGIAO}" --min-instances=0 --quiet >/dev/null
    done
    echo "Desligado: 0 instâncias (as rotinas do Cloud Scheduler continuam)." ;;
  status)
    WEB="$(url vacina-web)"; API="$(url vacina-api)"; NLP="$(url vacina-nlp)"
    echo "App web: ${WEB}"
    echo "API:     ${API}/api/health"
    printf 'API (health):     '; curl -s -m 90 -o /dev/null -w '%{http_code} em %{time_total}s\n' "${API}/api/health"
    printf 'PLN (health):     '; curl -s -m 90 -o /dev/null -w '%{http_code} em %{time_total}s\n' "${NLP}/api/health"
    printf 'App web pela API: '; curl -s -m 90 -o /dev/null -w '%{http_code} em %{time_total}s\n' "${WEB}/api/health" ;;
  *) echo "Uso: $0 ligar|desligar|status"; exit 2 ;;
esac
