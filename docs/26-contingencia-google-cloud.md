# Contingência no Google Cloud: como preparar, ligar e desligar

Plano de reserva para a apresentação, caso a Azure não possa rodar (decisão e motivos no ADR-035). **Custo zero:** conta com o teste gratuito de US$ 300 e serviços dentro das cotas gratuitas.

## O que vai para o Google Cloud

| Peça | Serviço | Observação |
|---|---|---|
| App web | Cloud Run (`vacina-web`, nginx) | Repassa `/api` para a API (mesma origem, sem CORS) |
| API | Cloud Run (`vacina-api`, host das Functions) | A mesma imagem da Azure; `FIRESTORE_PROJECT` liga o Firestore |
| Chatbot (PLN) | Cloud Run (`vacina-nlp`) | A mesma imagem da Azure |
| Dados, fotos e estado do vigia | Firestore (modo nativo) | Começa **vazio**; não copia o Azure SQL |
| Rotinas diárias e semanais | Cloud Scheduler | Chama `POST /api/jobs/daily-reminders` e `/api/calendar/watch/check` |
| Segredos | Secret Manager | Gerados na implantação; nada vai para o Git |
| Voz | não replicada | A API responde "indisponível" só na voz |

## 1. Criar a conta (você, uma vez)

O Google exige cartão para verificar a identidade; **só o autor pode fazer isso** (o Claude não digita dados de cartão).

1. Entre em <https://console.cloud.google.com> com a conta Google que será usada.
2. Aceite o **teste gratuito** ("Free trial", US$ 300 por 90 dias). Ele **não cobra sozinho**: ao fim do teste os recursos param, a não ser que você faça "Ativar conta completa". Só vale para quem ainda não usou o teste.
3. Crie um projeto (por exemplo, `vacina-em-dia-reserva`) e anote o **ID do projeto**.
4. (Recomendado) Em Faturamento > Orçamentos e alertas, crie um orçamento de R$ 5 com alerta a 50% e 100%, só para ser avisada de qualquer cobrança inesperada. **Feito em 16/11/2026:** orçamento `vacinaemdia-gcp-reserva`, mensal, R$ 5, só alertas (não bloqueia nada), avisos por e-mail a 50% (R$ 2,50), 90% (R$ 4,50) e 100% (R$ 5) aos administradores do faturamento. O Google leva até 24 horas para registrar os custos, então o alerta não é instantâneo.

## 2. Implantar (Cloud Shell, cerca de 15 minutos)

No Cloud Shell (ícone `>_` no topo do console):

```bash
git clone https://github.com/edukamoz/vacina-em-dia && cd vacina-em-dia
gcloud config set project <ID-DO-PROJETO>
# Opcional, para o app enviar e-mail (recuperar senha, lembretes):
# export BREVO_API_KEY='...' EMAIL_SENDER_ADDRESS='...'
scripts/gcp/implantar.sh
```

O script é idempotente (pode rodar de novo para atualizar), liga as APIs, cria o Firestore, a conta de serviço, os segredos, constrói as três imagens no Cloud Build, publica os três serviços e agenda as duas rotinas. No fim, mostra o endereço do app.

Para conferir o que não depende de senha (rotinas exigem a chave, agendador e Firestore de pé):

```bash
scripts/gcp/verificar.sh
```

## 3. Criar a conta de demonstração

```bash
SENHA='uma senha só da demonstração' scripts/gcp/semear.sh demo@exemplo.com
```

Cria a conta, aceita o consentimento e cadastra uma pessoa. Entre no app web com esse e-mail e senha.

## 4. No dia da apresentação

```bash
scripts/gcp/apresentacao.sh ligar     # 1 instância da API e do PLN acordadas (sem partida a frio)
scripts/gcp/apresentacao.sh status    # espere cerca de 1 minuto; deve mostrar 200 nos três testes
# ...apresentação...
scripts/gcp/apresentacao.sh desligar  # volta a 0 instâncias
```

Parado (0 instâncias), a primeira chamada leva alguns segundos na API e cerca de 1 minuto no PLN. Ligue **cerca de 30 minutos antes**.

## 5. Conferir o custo

Faturamento > Relatórios, filtrando pelo projeto. Esperado: R$ 0. Para zerar tudo depois do evento, exclua o projeto (Configurações do IAM > Encerrar).

## Limites e cuidados

- Cada serviço tem no máximo **2 instâncias**, para o custo nunca crescer sem controle.
- O Firestore só é acessado pela API (conta de serviço); confira em Firestore > Regras que não há regra aberta ao cliente (o padrão é negar tudo).
- Dados criados no Google Cloud **não** voltam para a Azure, e o inverso também.
- **Primeira implantação real: 16/11/2026**, no projeto `upheld-now-478722-h8` (teste gratuito de US$ 300, região `us-central1`). Endereços: o app web, a API e o PLN ficam em `https://vacina-*-mdqonfxhra-uc.a.run.app`/`vacina-nlp-338206538250.us-central1.run.app` (o `apresentacao.sh status` mostra os atuais). Resultado: API 200 em 12,9 s (partida a frio), PLN 200 em 7,8 s, app web repassando `/api` em 0,18 s. O Firestore foi criado no modo nativo com `freeTier: true`.
- **O que a primeira implantação ensinou (já corrigido no roteiro):** (1) a API recém-ativada leva alguns minutos para propagar e o primeiro uso falhava com `SERVICE_DISABLED`; o script agora tenta de novo por até 4 minutos; (2) o Cloud Build usa por padrão o construtor antigo do Docker, que não conhece `$BUILDPLATFORM`; os passos agora ligam o BuildKit (`DOCKER_BUILDKIT=1`). (3) o host das Functions grava um arquivo de chaves por função na pasta `Secrets` ao receber uma chave desconhecida, e o Cloud Run monta segredos somente leitura; a API respondia **500 em vez de 401** para chave errada (a chave certa e a ausência de chave não eram afetadas, e o acesso nunca foi liberado). Agora o segredo é montado em `/segredos/host.json` e o `apps/api/docker-entrypoint.sh` o copia para a pasta gravável antes de iniciar o host; fora do Cloud Run nada muda. Para aplicar na nuvem já implantada, rode `scripts/gcp/implantar.sh` de novo e confira com `scripts/gcp/verificar.sh` (chave errada deve dar 401).
- **Falta fazer (depende de uma senha, então é do autor):** criar a conta de demonstração com `scripts/gcp/semear.sh` e entrar no app web uma vez, para ver o fluxo completo na nuvem. O `scripts/gcp/verificar.sh` confere o que não depende de senha.
