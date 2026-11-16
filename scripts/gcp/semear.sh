#!/usr/bin/env bash
# Cria uma conta de demonstração, com o consentimento dado e uma pessoa cadastrada, para a
# apresentação no Google Cloud (ADR-035). A senha vem da variável SENHA, nunca de um arquivo.
#
#   SENHA='...' scripts/gcp/semear.sh <email-da-demo>
set -euo pipefail
EMAIL="${1:?Informe o e-mail da conta de demonstração}"
: "${SENHA:?Defina a variável SENHA (mínimo de 8 caracteres)}"
REGIAO="${REGIAO:-us-central1}"
API="$(gcloud run services describe vacina-api --region="${REGIAO}" --format='value(status.url)')/api"
JSON='Content-Type: application/json'
post() { curl -s -m 90 -X "$1" "${API}$2" -H "${JSON}" ${4:+-H "Authorization: Bearer $4"} -d "$3"; }
token() { python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])"; }

# A versão do termo vem do app, para ficar igual à que a tela de consentimento envia.
VERSAO="$(grep -o "TERMS_VERSION = '[^']*'" apps/mobile/src/features/consent/terms.ts | cut -d"'" -f2)"
TOKEN="$(post POST /auth/register "{\"email\":\"${EMAIL}\",\"password\":\"${SENHA}\"}" | token 2>/dev/null ||
  post POST /auth/login "{\"email\":\"${EMAIL}\",\"password\":\"${SENHA}\"}" | token)"
post PUT /consent "{\"acceptedTerms\":true,\"termVersion\":\"${VERSAO}\",\"guardianDeclaration\":true}" "${TOKEN}" >/dev/null
post POST /members '{"name":"Ana","birthDate":"2020-05-20","isPregnant":false,"relationship":"DAUGHTER"}' "${TOKEN}" |
  python3 -c "import sys,json;print('Pessoa criada:', json.load(sys.stdin)['name'])"
echo "Conta pronta: ${EMAIL}"
