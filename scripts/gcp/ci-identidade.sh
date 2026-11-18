#!/usr/bin/env bash
# Cria a identidade que o GitHub Actions usa para publicar no Google Cloud (ADR-038), por
# Workload Identity Federation: nenhuma chave é criada nem guardada. A identidade só vale para este
# repositório e para a branch `main`. É idempotente: pode rodar de novo.
#
#   PROJETO   projeto do Google Cloud (padrão: o configurado no gcloud)
#   REGIAO    região do Artifact Registry (padrão: us-central1)
#   REPO_GH   repositório do GitHub (padrão: edukamoz/vacina-em-dia)
#
# No fim, imprime os três valores a cadastrar em GitHub > Settings > Secrets and variables >
# Actions > Variables: GCP_PROJECT, GCP_WORKLOAD_IDENTITY_PROVIDER e GCP_SERVICE_ACCOUNT.
set -euo pipefail

PROJETO="${PROJETO:-$(gcloud config get-value project 2>/dev/null)}"
REGIAO="${REGIAO:-us-central1}"
REPO_GH="${REPO_GH:-edukamoz/vacina-em-dia}"
[ -n "$PROJETO" ] || { echo "Defina o projeto: gcloud config set project <id>"; exit 1; }
NUMERO="$(gcloud projects describe "$PROJETO" --format='value(projectNumber)')"
SA="vacina-deploy@${PROJETO}.iam.gserviceaccount.com"
SA_RUN="vacina-run@${PROJETO}.iam.gserviceaccount.com"
SA_BUILD="vacina-build@${PROJETO}.iam.gserviceaccount.com"
POOL=github
PROVEDOR=github-actions

echo ">> 1/4 APIs necessárias"
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --quiet

echo ">> 2/4 Conta de serviço do deploy"
gcloud iam service-accounts describe "${SA}" >/dev/null 2>&1 ||
  gcloud iam service-accounts create vacina-deploy --display-name="Vacina em Dia (deploy pelo GitHub)"
for papel in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer \
  roles/serviceusage.serviceUsageConsumer roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "${PROJETO}" --member="serviceAccount:${SA}" \
    --role="${papel}" --condition=None --quiet >/dev/null
done
# O `gcloud builds submit` envia o código para o balde do Cloud Build e precisa ler os dados do balde
# (`storage.buckets.get`), que o papel de objetos não inclui; por isso o papel vale só neste balde.
BALDE="gs://${PROJETO}_cloudbuild"
gcloud storage buckets describe "${BALDE}" >/dev/null 2>&1 ||
  gcloud storage buckets create "${BALDE}" --location=us --quiet
gcloud storage buckets add-iam-policy-binding "${BALDE}" --member="serviceAccount:${SA}" \n  --role=roles/storage.admin >/dev/null
# O Cloud Build roda numa conta própria e mínima: grava logs, envia as imagens e lê o código no balde.
gcloud iam service-accounts describe "${SA_BUILD}" >/dev/null 2>&1 ||
  gcloud iam service-accounts create vacina-build --display-name="Vacina em Dia (Cloud Build)"
for papel in roles/logging.logWriter roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "${PROJETO}" --member="serviceAccount:${SA_BUILD}" \n    --role="${papel}" --condition=None --quiet >/dev/null
done
gcloud storage buckets add-iam-policy-binding "${BALDE}" --member="serviceAccount:${SA_BUILD}" \n  --role=roles/storage.objectViewer >/dev/null
gcloud iam service-accounts add-iam-policy-binding "${SA_BUILD}" --member="serviceAccount:${SA}" \n  --role=roles/iam.serviceAccountUser --quiet >/dev/null
# Para trocar a imagem de um serviço, a conta de deploy precisa poder "agir como" a conta do Cloud Run.
gcloud iam service-accounts add-iam-policy-binding "${SA_RUN}" --member="serviceAccount:${SA}" \
  --role=roles/iam.serviceAccountUser --quiet >/dev/null

echo ">> 3/4 Pool e provedor do GitHub (só este repositório, só a main)"
gcloud iam workload-identity-pools describe "${POOL}" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "${POOL}" --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers describe "${PROVEDOR}" --location=global \
  --workload-identity-pool="${POOL}" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "${PROVEDOR}" --location=global \
    --workload-identity-pool="${POOL}" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${REPO_GH}' && assertion.ref=='refs/heads/main'"

echo ">> 4/4 Permissão de usar a conta de serviço"
gcloud iam service-accounts add-iam-policy-binding "${SA}" --quiet >/dev/null \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${NUMERO}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO_GH}"

echo
echo "Cadastre em GitHub > Settings > Secrets and variables > Actions > Variables:"
echo "  GCP_PROJECT                    = ${PROJETO}"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = projects/${NUMERO}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVEDOR}"
echo "  GCP_SERVICE_ACCOUNT            = ${SA}"
