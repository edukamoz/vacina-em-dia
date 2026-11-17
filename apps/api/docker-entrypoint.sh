#!/bin/sh
# Entrada da imagem da API. No Cloud Run o Secret Manager monta as chaves do host das Functions
# em /segredos/host.json, uma pasta somente leitura. O host precisa gravar na pasta Secrets (cria
# o arquivo de chaves de cada função na primeira chave desconhecida); sem isso, uma chave errada
# responde 500 em vez de 401 (ADR-035). Por isso as chaves são copiadas para a pasta gravável.
# Fora do Cloud Run (Azure, Docker local) não há /segredos e nada muda.
set -e
if [ -f /segredos/host.json ]; then
  mkdir -p /azure-functions-host/Secrets
  # cat e não cp: o volume de segredos do Cloud Run é virtual e o cp aborta com "replaced while
  # being copied". O -s confere que o arquivo não ficou vazio.
  cat /segredos/host.json > /azure-functions-host/Secrets/host.json
  [ -s /azure-functions-host/Secrets/host.json ] || { echo "chaves do host vazias" >&2; exit 1; }
fi
exec /opt/startup/start_nonappservice.sh "$@"
