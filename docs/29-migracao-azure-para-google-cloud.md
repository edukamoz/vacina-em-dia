# Migração da Azure para o Google Cloud (B79 e B80)

Registro do motivo, do que pesou no orçamento da Azure e do que mudou de fornecedor. Os documentos da Azure (`docs/08`, `docs/16`, `infra/`) continuam no repositório como **histórico**; este arquivo explica por que o ambiente de produção hoje é outro. Decisão formal: `docs/05-adrs/ADR-038-producao-no-google-cloud.md`.

> **Regra do projeto:** só entra aqui valor conferido. O que depende de um número que só o autor vê (portal da Azure) está marcado **[a informar]**.

## 1. Resumo

- Em **17/11/2026** os créditos de estudante da Azure acabaram: o app web respondia 404 e as duas Function Apps respondiam 403.
- O Google Cloud já rodava o app inteiro como reserva desde **16/11/2026** (ADR-035), com o teste gratuito de US$ 300. Em 17/11 a reserva virou a **produção** (ADR-038).
- A apresentação foi remarcada para **01/12/2026 às 19:00**.
- O deploy a cada merge na `main` passou a publicar no Google Cloud (Cloud Build e Cloud Run), com login federado do GitHub, sem chave guardada.
- A voz trocou o Azure AI Speech pelo Google Cloud Speech-to-Text, com teto mensal de áudio para ficar na faixa gratuita (B80).

## 2. Linha do tempo

| Data | O que aconteceu |
|---|---|
| Semestre anterior | Projeto na AWS (Lambda, S3, RDS etc.) |
| 06 e 07/10/2026 | Este projeto nasce na Azure: Functions, Azure SQL, Static Web Apps, Key Vault, Speech (`docs/08`) |
| 07/10/2026 | Instância sempre pronta ligada na API para acabar com 503 intermitentes (`docs/21`) |
| 12/11/2026 | O alerta do orçamento da Azure previu R$ 604 para o ano; as instâncias sempre prontas são desligadas; o banco religado para aplicar migrações |
| 16/11/2026 | Contingência no Google Cloud implantada e respondendo (ADR-035); orçamento de alerta de R$ 5 criado no Google |
| 17/11/2026 | Créditos da Azure acabam; ADR-038; deploy automático e voz no Google Cloud; segundo orçamento de alerta e limpeza do registro de imagens |
| 01/12/2026, 19:00 | Apresentação |

## 3. Por que migramos

1. **Os créditos acabaram.** Sem crédito, a Azure não roda de graça, e o projeto não tem orçamento para pagar.
2. **O Google Cloud já estava pronto.** A reserva usava as mesmas imagens Docker e o mesmo código; o único trabalho novo foi tornar o Google Cloud o destino do deploy automático e trocar o serviço de voz.
3. **Cabe nas cotas gratuitas.** Cloud Run, Firestore, Secret Manager, Cloud Scheduler e Cloud Build têm camada gratuita permanente, e há ainda o teste de US$ 300 por 90 dias.

## 4. O que fez estourar o orçamento da Azure

Fatos registrados em `docs/16-custos-azure.md` e `docs/00-handoff.md` (seção 0.15):

| Causa | O que aconteceu |
|---|---|
| **Instâncias sempre prontas** (API e PLN) | O PLN custa cerca de US$ 6,50 por mês só pela instância parada; a da API foi ligada em 07/10 por causa dos 503 e somou outros cerca de US$ 6,50. Juntas, cerca de US$ 13 por mês, e o alerta de 12/11 mostrou R$ 88,98 gastos desde 01/10 (cerca de R$ 2,41 por dia) para um orçamento anual de R$ 100, com previsão de R$ 604 |
| **Banco Azure SQL gratuito esgotou a franquia** | A franquia gratuita é de 100 mil vCore-segundos por mês. O banco acordava com o app aberto (`GET /api/warmup`) e com as rotinas diárias (lembretes e vigia); o `docs/16` já alertava que mantê-lo acordado esgotaria a franquia em poucas semanas, e ele chegou a ficar pausado por isso |
| **Religar o banco foi irreversível** | Para aplicar as migrações 008 e 009, o banco passou de `AutoPause` para `BillOverUsage`, e a Azure não deixa voltar. Cada despertar passou a custar cerca de 0,5 vCore por 15 minutos |
| **Serviço de PLN com partida lenta** | O Python carrega bibliotecas de ML na partida (cerca de 50 s), o que justificou deixar a instância sempre pronta em vez de escalar a zero |

**Saldo final do crédito e valor total gasto na Azure: [a informar]** (leitura do Cost Management; este documento não estima esses números). O que o repositório prova é a causa dos gastos acima, não o valor final.

**O que se aprende disso:** serviço que "dorme" mas acorda toda hora (banco com rotinas diárias, instância sempre pronta) não é gratuito; e uma ação irreversível (`BillOverUsage`) deve ser pesada antes do custo, não depois.

## 5. O que foi migrado: AWS → Azure → Google Cloud

| Função | AWS (semestre anterior) | Azure (até 17/11/2026) | Google Cloud (hoje) |
|---|---|---|---|
| Código sem servidor (API) | Lambda | Azure Functions (Flex Consumption) | **Cloud Run** (mesma imagem Docker, host das Functions) |
| Entrada HTTP | API Gateway | Gatilho HTTP das Functions | O mesmo, atrás do Cloud Run |
| Site | S3 + CloudFront / Amplify | Static Web Apps (Free) | **Cloud Run** (`nginx`, repassa `/api` para a API) |
| Banco | RDS / Aurora Serverless | Azure SQL (serverless, oferta gratuita) | **Firestore** (modo nativo) |
| Segredos | Secrets Manager | Key Vault | **Secret Manager** |
| Identidade e login | Cognito | Login próprio (ADR-014) | O mesmo |
| Logs e monitoramento | CloudWatch | Application Insights + Log Analytics | **Cloud Logging e Cloud Monitoring** |
| Fala para texto | Transcribe | Azure AI Speech (F0) | **Cloud Speech-to-Text** (API V1) |
| Arquivos (fotos, estado do vigia) | S3 | Blob Storage | Documentos no **Firestore** |
| Rotinas agendadas | EventBridge | Gatilhos de relógio das Functions | **Cloud Scheduler** |
| Imagens de contêiner | ECR | (não usado em produção) | **Artifact Registry** |
| Infraestrutura como código | CloudFormation | Bicep (`infra/`, histórico) | Roteiros `scripts/gcp/*.sh` |
| Permissões | IAM | Entra ID + RBAC | **IAM** com três contas de serviço (`vacina-run`, `vacina-build`, `vacina-deploy`) |
| CI/CD | CodePipeline / CodeBuild | GitHub Actions com login OIDC | GitHub Actions com **Workload Identity Federation** e Cloud Build |

Fonte da coluna Google Cloud: os serviços do próprio projeto, listados com o `gcloud` em 17/11/2026. As colunas AWS e Azure vêm de `docs/08-infraestrutura-azure.md`; as linhas "Rotinas agendadas" e "Imagens de contêiner" e os equivalentes AWS delas foram acrescentados neste documento (EventBridge e ECR são citados por comparação, como equivalentes na AWS).

## 6. O que mudou no projeto

- **Deploy** (`.github/workflows/deploy.yml`): o Cloud Build constrói as três imagens (etiqueta do commit e `latest`) e o `gcloud run services update` troca a imagem de cada serviço; o teste de fumaça confere API, PLN e app web. O login do GitHub usa Workload Identity, restrito a este repositório e à branch `main`; o roteiro `scripts/gcp/ci-identidade.sh` cria tudo.
- **Contas de serviço:** `vacina-run` executa os três serviços; `vacina-build` só grava logs, envia imagens e lê o código; `vacina-deploy` só publica e troca imagens.
- **Voz** (`apps/api/src/clients/google-speech-client.ts`): chama a API V1 com o token da conta de serviço do Cloud Run, sem chave; o áudio não é guardado.
- **Endereços:** o APK e o mapa do celular apontam para o app no Cloud Run; o arquivo do Static Web Apps foi removido.
- **Imagens:** política de limpeza no Artifact Registry (mantém `latest` e as 3 mais recentes por imagem).
- **Fica como histórico:** `infra/` (Bicep), cliente do Azure SQL e do Blob, cliente do Azure AI Speech.

## 7. Custos e alertas no Google Cloud

**Uso até 17/11/2026** (relatório de faturamento, projeto `upheld-now-478722-h8`): gasto líquido **R$ 0,00**; uso bruto de **R$ 0,17** no Cloud Run, coberto pela cota gratuita; crédito do teste **R$ 1.830,53 restantes de R$ 1.830,55**.

| Serviço | Controle de custo |
|---|---|
| Cloud Run (3 serviços) | Máximo de 2 instâncias, 0 instâncias paradas; 1 instância só nas horas da apresentação (`scripts/gcp/apresentacao.sh`) |
| Firestore | Camada gratuita ligada (1 GiB, 50 mil leituras e 20 mil escritas por dia, segundo o ADR-035) |
| Voz (Speech-to-Text V1) | Teto de 50 minutos por mês, abaixo dos 60 gratuitos |
| Artifact Registry | Limpeza automática; estava com 1,8 GB, acima da cota gratuita de armazenamento (centavos por mês) |
| Cloud Build, Secret Manager, Cloud Scheduler | Dentro das cotas gratuitas (2 das 3 tarefas do Scheduler) |

**Preço da voz, conferido na página oficial do Google em 17/11/2026:** V1 gratuita nos primeiros 60 minutos por mês por conta, depois US$ 0,016 por minuto; V2 sem faixa gratuita (US$ 0,016 por minuto); cobrança por segundo.

**Alertas** (só avisam, não bloqueiam nada; e-mails aos administradores do faturamento):

| Orçamento | Valor | Avisos | Para que serve |
|---|---|---|---|
| `vacinaemdia-gcp-reserva` | R$ 5 por mês, **descontando créditos** | 50%, 90% e 100% | Cobrança de verdade: dispara quando o crédito do teste acaba e algo começa a ser cobrado |
| `vacinaemdia-gcp-uso-bruto` | R$ 50 por mês, **sem descontar créditos** | 20%, 50% e 100% | Consumo anormal durante o teste gratuito, que o primeiro não enxergaria |

O Google leva até 24 horas para registrar os custos, então o alerta não é instantâneo.

**Valor mensal da estimativa na calculadora do Google: [a informar]** (a Documentação Técnica pede o print ou o link da calculadora).

## 8. Riscos e limites

- **Os dados da Azure não vieram.** O Firestore começou vazio; para a apresentação cria-se uma conta de demonstração com `scripts/gcp/semear.sh`.
- **O teste gratuito acaba por volta de 14/02/2027** (90 dias a partir de 16/11/2026). Depois, os serviços só ficam grátis dentro das cotas permanentes; reavaliar antes disso.
- **Partida a frio:** parado, a API leva alguns segundos e o PLN cerca de 25 s a 1 minuto na primeira chamada. Ligar `apresentacao.sh ligar` cerca de 30 minutos antes da apresentação.
- **O contador da voz não é atômico:** duas chamadas simultâneas podem passar do teto por alguns segundos; a folga de 10 minutos cobre.
- **Voz acima do teto:** o app responde "voz indisponível" e a pessoa digita a pergunta.

## 9. O que ainda não foi verificado

- Uma chamada real ao Speech-to-Text com áudio de verdade (depende da conta de demonstração, que tem senha do autor). Se devolver 403, o ajuste é de permissão da conta `vacina-run`.
- O fluxo completo na nuvem com a conta de demonstração.
- Celular real e leitor de tela contra o Google Cloud (B40).

## 10. Onde ler mais

`ADR-035` (a reserva), `ADR-038` (a produção), `docs/26-contingencia-google-cloud.md` (ligar, desligar e conferir), `docs/16-custos-azure.md` e `docs/08-infraestrutura-azure.md` (histórico da Azure).
