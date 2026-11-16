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
4. (Recomendado) Em Faturamento > Orçamentos e alertas, crie um orçamento de R$ 5 com alerta a 50% e 100%, só para ser avisada de qualquer cobrança inesperada.

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
- Testado: o contêiner da API sobe em cerca de 3 s sem armazenamento do Azure, exige a chave nas rotinas e grava no Firestore (emulador). **Ainda não foi testado no Google Cloud real**; o primeiro `implantar.sh` é o teste. Anote aqui o resultado.
