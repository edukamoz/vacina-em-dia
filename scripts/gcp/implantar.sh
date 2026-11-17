#!/usr/bin/env bash
# Implanta o Vacina em Dia no Google Cloud (plano de contingência, ADR-035).
#
# Roda no Cloud Shell (https://shell.cloud.google.com), onde `gcloud` já está logado, depois de
# `git clone https://github.com/edukamoz/vacina-em-dia && cd vacina-em-dia`. É idempotente: pode
# rodar de novo para atualizar. Não pede senha nem chave: os segredos são gerados aqui e ficam só
# no Secret Manager.
#
#   PROJETO   projeto do Google Cloud (padrão: o configurado no gcloud)
#   REGIAO    região (padrão: us-central1, que está nas cotas gratuitas permanentes)
#   BREVO_API_KEY, EMAIL_SENDER_ADDRESS   opcionais: sem eles o app não envia e-mail
set -euo pipefail

PROJETO="${PROJETO:-$(gcloud config get-value project 2>/dev/null)}"
REGIAO="${REGIAO:-us-central1}"
[ -n "$PROJETO" ] || { echo "Defina o projeto: gcloud config set project <id>"; exit 1; }
REPO="${REGIAO}-docker.pkg.dev/${PROJETO}/vacina"
SA="vacina-run@${PROJETO}.iam.gserviceaccount.com"
echo ">> Projeto: ${PROJETO}  Região: ${REGIAO}"

# Depois de ativar uma API, o Google leva alguns minutos para propagá-la, e o primeiro comando que a
# usa falha com "SERVICE_DISABLED". Por isso estes passos tentam de novo, por até uns 4 minutos.
tentar() {
  local n
  for n in $(seq 1 16); do
    "$@" && return 0
    echo "   (tentativa ${n}/16 falhou; a API ainda deve estar propagando, nova tentativa em 15 s)"
    sleep 15
  done
  return 1
}

echo ">> 1/7 Ativando as APIs"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com cloudscheduler.googleapis.com --quiet

echo ">> 2/7 Firestore (modo nativo)"
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 ||
  tentar gcloud firestore databases create --database='(default)' --location="${REGIAO}" \
    --type=firestore-native --quiet

echo ">> 3/7 Conta de serviço e Artifact Registry"
gcloud iam service-accounts describe "${SA}" >/dev/null 2>&1 ||
  gcloud iam service-accounts create vacina-run --display-name="Vacina em Dia (Cloud Run)"
gcloud projects add-iam-policy-binding "${PROJETO}" --member="serviceAccount:${SA}" \
  --role=roles/datastore.user --condition=None --quiet >/dev/null
gcloud artifacts repositories describe vacina --location="${REGIAO}" >/dev/null 2>&1 ||
  tentar gcloud artifacts repositories create vacina --repository-format=docker --location="${REGIAO}"

echo ">> 4/7 Segredos (gerados aqui; nunca vão para o Git)"
criar_segredo() { # nome, conteúdo (stdin)
  if gcloud secrets describe "$1" >/dev/null 2>&1; then return; fi
  gcloud secrets create "$1" --replication-policy=automatic --quiet
  gcloud secrets versions add "$1" --data-file=- --quiet
}
aleatorio() { head -c 36 /dev/urandom | base64 | tr -d '/+=\n'; }
printf '%s' "$(aleatorio)$(aleatorio)" | criar_segredo vacina-auth-token
# Arquivo de chaves do host das Functions (a mesma estrutura de docker/nlp-host-secrets.json).
CHAVE_FUNCAO="$(aleatorio)"
cat <<JSON | criar_segredo vacina-host-secrets
{"masterKey":{"name":"master","value":"$(aleatorio)","encrypted":false},
 "functionKeys":[{"name":"default","value":"${CHAVE_FUNCAO}","encrypted":false}],
 "systemKeys":[],"hostName":"","instanceId":"","source":"runtime","decryptionKeyId":""}
JSON
for s in vacina-auth-token vacina-host-secrets; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:${SA}" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
done
if [ -n "${BREVO_API_KEY:-}" ]; then
  printf '%s' "${BREVO_API_KEY}" | criar_segredo vacina-brevo
  gcloud secrets add-iam-policy-binding vacina-brevo --member="serviceAccount:${SA}" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
fi
# A chave que o Cloud Scheduler e a API usam para chamar as rotas protegidas.
CHAVE_FUNCAO="$(gcloud secrets versions access latest --secret=vacina-host-secrets |
  python3 -c "import sys,json;print(json.load(sys.stdin)['functionKeys'][0]['value'])")"

echo ">> 5/7 Construindo as imagens (Cloud Build, alguns minutos)"
gcloud builds submit --config scripts/gcp/cloudbuild.yaml --substitutions "_REPO=${REPO}" .

COMUM=(--region="${REGIAO}" --service-account="${SA}" --allow-unauthenticated --min-instances=0
  --max-instances=2 --concurrency=40 --cpu-boost --quiet)
# O host das Functions guarda as chaves em arquivo (montado do Secret Manager) e não precisa do
# armazenamento do Azure; as rotinas de relógio ficam desligadas (quem as chama é o Cloud Scheduler).
FUNCOES=(--set-env-vars="AzureWebJobsSecretStorageType=files,AzureWebJobs.sendDailyReminders.Disabled=true,AzureWebJobs.runCalendarWatch.Disabled=true"
  --set-secrets="/azure-functions-host/Secrets/host.json=vacina-host-secrets:latest")

echo ">> 6/7 Publicando os serviços"
gcloud run deploy vacina-nlp --image="${REPO}/nlp:latest" --port=80 --memory=1Gi --cpu=1 \
  --timeout=60 "${COMUM[@]}" "${FUNCOES[@]}"
URL_NLP="$(gcloud run services describe vacina-nlp --region="${REGIAO}" --format='value(status.url)')"

ENV_API="FIRESTORE_PROJECT=${PROJETO},NLP_BASE_URL=${URL_NLP}/api,NLP_FUNCTION_KEY=${CHAVE_FUNCAO},DEMO_SESSION_ENABLED=false,TRUSTED_PROXY_HOPS=2,DOCS_ENABLED=false"
[ -n "${EMAIL_SENDER_ADDRESS:-}" ] && ENV_API="${ENV_API},EMAIL_SENDER_ADDRESS=${EMAIL_SENDER_ADDRESS}"
SEGREDOS_API="AUTH_TOKEN_SECRET=vacina-auth-token:latest"
gcloud secrets describe vacina-brevo >/dev/null 2>&1 && SEGREDOS_API="${SEGREDOS_API},BREVO_API_KEY=vacina-brevo:latest"
gcloud run deploy vacina-api --image="${REPO}/api:latest" --port=80 --memory=1Gi --cpu=1 --timeout=60 \
  "${COMUM[@]}" --set-env-vars="${ENV_API},AzureWebJobsSecretStorageType=files,AzureWebJobs.sendDailyReminders.Disabled=true,AzureWebJobs.runCalendarWatch.Disabled=true" \
  --set-secrets="${SEGREDOS_API},/segredos/host.json=vacina-host-secrets:latest"
URL_API="$(gcloud run services describe vacina-api --region="${REGIAO}" --format='value(status.url)')"

gcloud run deploy vacina-web --image="${REPO}/web:latest" --memory=256Mi --cpu=1 --max-instances=2 \
  --region="${REGIAO}" --allow-unauthenticated --quiet \
  --set-env-vars="API_URL=${URL_API},API_HOST=${URL_API#https://}"
URL_WEB="$(gcloud run services describe vacina-web --region="${REGIAO}" --format='value(status.url)')"
# Os links dos e-mails apontam para o app web.
gcloud run services update vacina-api --region="${REGIAO}" --quiet \
  --update-env-vars="WEB_BASE_URL=${URL_WEB}" >/dev/null

echo ">> 7/7 Rotinas agendadas (Cloud Scheduler: 3 tarefas gratuitas por conta)"
agendar() { # nome, cron, caminho
  local comum=(--location="${REGIAO}" --schedule="$2" --time-zone=UTC --uri="${URL_API}$3"
    --http-method=POST)
  # A saída do gcloud mostraria a chave das rotinas na tela; por isso vai para /dev/null.
  # O update usa --update-headers (o create usa --headers); por isso os dois caminhos são separados.
  if gcloud scheduler jobs describe "$1" --location="${REGIAO}" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "$1" "${comum[@]}" \
      --update-headers="x-functions-key=${CHAVE_FUNCAO}" --quiet >/dev/null
  else
    gcloud scheduler jobs create http "$1" "${comum[@]}" \
      --headers="x-functions-key=${CHAVE_FUNCAO}" --quiet >/dev/null
  fi
}
agendar vacina-lembretes "0 11 * * *" /api/jobs/daily-reminders      # 8h em Brasília
agendar vacina-vigia "0 12 * * 1" /api/calendar/watch/check          # segunda, 9h em Brasília

echo
echo "Pronto."
echo "  App web: ${URL_WEB}"
echo "  API:     ${URL_API}/api/health"
echo "Confira com: scripts/gcp/apresentacao.sh status"
