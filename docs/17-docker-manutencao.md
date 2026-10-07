# Docker: execução e manutenção (SCRUM-25)

Seção de **manutenção do Docker** da Documentação Técnica (critério "Documentação Técnica: Docker, manutenção"). Tudo foi **verificado em 07/10/2026** no Windows com Docker 29.8.1 e Compose 5.5.1: o ambiente subiu, passou pelo login, pelo chatbot e pelos cabeçalhos de segurança, e foi derrubado.

## 1. O que roda

`docker compose up --build` sobe quatro contêineres, todos com a porta aberta **só para o próprio computador** (`127.0.0.1`):

| Serviço | Imagem | Porta local (padrão) | O que faz | Tamanho da imagem |
|---|---|---|---|---|
| `azurite` | `mcr.microsoft.com/azure-storage/azurite:3.37.0` | 10000, 10001, 10002 | Emulador local do Armazenamento do Azure (o host das Functions exige um) | 596 MB |
| `api` | Build de `apps/api/Dockerfile` sobre `mcr.microsoft.com/azure-functions/node:4-node24` | `API_PORT` (7071) | API (Azure Functions, Node 24): login, família, doses, assistente | 1,66 GB |
| `nlp` | Build de `apps/nlp/Dockerfile` sobre `mcr.microsoft.com/azure-functions/python:4-python3.13` | `NLP_PORT` (7072) | Chatbot e busca (scikit-learn); treina o modelo ao iniciar | 3,11 GB |
| `web` | Build de `apps/mobile/Dockerfile` sobre `nginx:1.31.6-alpine` | `WEB_PORT` (8080) | App web estático; o nginx repassa `/api` para a API (mesma origem, sem CORS) | 96,6 MB |

O `web` só inicia quando a `api` está saudável. Todos têm teste de saúde (`/api/health`), e `docker compose up --wait` espera por eles. Espaço em disco: reserve cerca de **6 GB** para as imagens e o cache de build.

**Fluxo de uma pergunta ao chatbot no ambiente local:** navegador → `web` (nginx) → `api` → `nlp`, que exige a chave da função. A chave local fica em `docker/nlp-host-secrets.json` e é repassada à API por variável de ambiente (ver seção 4).

## 2. Operação do dia a dia

| Quero... | Comando |
|---|---|
| Subir tudo (construindo o que mudou) | `docker compose up --build` (primeiro plano) ou `docker compose up -d --build --wait` (segundo plano, espera ficar saudável) |
| Ver o estado | `docker compose ps` |
| Ver os registros de um serviço | `docker compose logs -f api` (ou `nlp`, `web`, `azurite`); `--tail=100` limita |
| Reiniciar um serviço | `docker compose restart api` |
| Reconstruir só um serviço após mudar o código | `docker compose up -d --build api` |
| Abrir um terminal dentro do contêiner | `docker compose exec api bash` (no `web`, `sh`) |
| Parar e manter os dados do Azurite | `docker compose down` |
| Parar e apagar também o volume do Azurite | `docker compose down -v` |
| Usar outras portas | `API_PORT=7081 NLP_PORT=7082 WEB_PORT=8085 docker compose up -d --build` |

Endereços (portas padrão): app em http://localhost:8080; API em http://localhost:7071/api/health e Swagger em http://localhost:7071/api/docs; PLN em http://localhost:7072/api/health.

Tempos medidos: a primeira subida constrói tudo (alguns minutos, por causa do download das imagens-base e da instalação das dependências); as seguintes usam o cache e levam menos de um minuto. O `nlp` leva cerca de 30 s para ficar saudável (treina o classificador ao iniciar).

## 3. Dados e persistência

- **Azurite:** guarda o armazenamento que o host das Functions precisa, em um volume nomeado (`azurite-data`). Não contém dados do app. `docker compose down -v` o apaga sem prejuízo.
- **Dados do app (contas, famílias, doses):** no ambiente Docker ficam **em memória** na API (não há Azure SQL local). **Reiniciar ou recriar o contêiner da API apaga tudo**; é de propósito, para o ambiente local nascer limpo. Para persistir, use a API na nuvem (Azure SQL, `docs/15-persistencia-sql.md`).
- Nada de dado pessoal real deve ser cadastrado neste ambiente.

## 4. Configuração

As configurações vão em `environment` no `docker-compose.yml`. As variáveis marcadas como "local" são **constantes de desenvolvimento, públicas no repositório**; nunca as use na nuvem (lá as chaves reais ficam no Key Vault).

| Variável | Serviço | Valor no compose | Para quê |
|---|---|---|---|
| `AUTH_TOKEN_SECRET` | api | local (substituível: `AUTH_TOKEN_SECRET=... docker compose up`) | Chave de assinatura do login; sem ela as rotas `/auth` respondem 503 |
| `DEMO_SESSION_ENABLED` | api | `false` | Sem sessão de demonstração: o app exige login, como na nuvem |
| `NLP_BASE_URL` e `NLP_FUNCTION_KEY` | api | `http://nlp/api` e chave local | Chatbot por texto |
| `SPEECH_ENDPOINT` e `SPEECH_KEY` | api | **não definidas** | Voz (Azure AI Speech). Sem elas, só a pergunta por voz responde "assistente indisponível" |
| `BREVO_API_KEY`, `EMAIL_SENDER_ADDRESS`, `WEB_BASE_URL` | api | **não definidas** | E-mail de recuperação de senha; sem elas, o pedido responde 202 mas nenhum e-mail sai |
| `AzureWebJobsSecretStorageType` | nlp | `files` | Lê as chaves da função de `docker/nlp-host-secrets.json` |
| `API_PORT`, `NLP_PORT`, `WEB_PORT` | compose | 7071, 7072, 8080 | Portas no computador |
| `EXPO_PUBLIC_API_URL` | web (build) | `/api` | Endereço da API embutido no pacote (valor público, nunca segredo) |

Para testar a voz ou o e-mail no ambiente local, passe as variáveis ao subir (por exemplo, `SPEECH_ENDPOINT=... SPEECH_KEY=... docker compose up`) **sem gravá-las em arquivo versionado**; elas precisam de uma linha `environment` correspondente no compose para chegar ao contêiner.

## 5. Atualização de versões

As versões das imagens estão fixas, para a construção ser reproduzível (`docs/tech-versions.md`):

| O quê | Onde mudar |
|---|---|
| Node das imagens da API e do app | `FROM node:24.21.0-slim` e `azure-functions/node:4-node24` em `apps/api/Dockerfile` e `apps/mobile/Dockerfile` |
| Python do PLN | `azure-functions/python:4-python3.13` em `apps/nlp/Dockerfile` (mantenha igual ao do Azure) |
| nginx | `nginx:1.31.6-alpine` em `apps/mobile/Dockerfile` |
| Azurite | `image:` no `docker-compose.yml` |
| Bibliotecas Node | `package.json` + `package-lock.json` (o build usa `npm ci`) |
| Bibliotecas Python | `apps/nlp/requirements.txt` (versões exatas, inclusive as transitivas) |

Para atualizar uma versão: 1) conferir a versão estável atual no registro oficial (não de memória); 2) trocar no arquivo e em `docs/tech-versions.md`; 3) `docker compose build --no-cache <serviço>`; 4) `docker compose up -d --wait`; 5) rodar as verificações da seção 7; 6) abrir PR (o CI repete o teste de fumaça). Mantenha o Python e o Node das imagens iguais aos do Azure (Functions em Node 24 e Python 3.13), senão o ambiente local deixa de representar a nuvem.

**Sobre `amd64`:** as imagens oficiais do host das Functions só existem para `linux/amd64`. Por isso `api` e `nlp` têm `platform: linux/amd64` no compose; em Mac com Apple Silicon rodam emuladas (mais lentas na primeira subida).

## 6. Limpeza e problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `port is already allocated` ou o app abre outra coisa | Porta em uso (por exemplo, `npm run dev:api` em 7071 ou o Expo em 8081) | Subir com outras portas (`API_PORT`, `NLP_PORT`, `WEB_PORT`); conferir com `docker compose ps` |
| Login e cadastro respondem 503 | Falta `AUTH_TOKEN_SECRET` (por exemplo, compose antigo) | Atualizar o compose; ou definir a variável |
| O chatbot responde "assistente indisponível" | `nlp` ainda iniciando ou chave diferente | Esperar o `nlp` ficar `healthy` (cerca de 30 s); conferir `docker compose logs nlp`; a chave da API (`NLP_FUNCTION_KEY`) deve ser a de `docker/nlp-host-secrets.json` |
| A pergunta por voz dá "assistente indisponível" | Sem `SPEECH_ENDPOINT` e `SPEECH_KEY` | Esperado no ambiente local; usar texto ou configurar o Speech |
| `api` ou `nlp` não ficam saudáveis | Azurite fora do ar ou imagem desatualizada | `docker compose logs azurite api`; `docker compose up -d --build` |
| Alteração no código não aparece | Imagem antiga em uso | `docker compose up -d --build <serviço>` |
| Dados sumiram | A API reiniciou (dados em memória) | Esperado (seção 3) |
| Disco cheio | Imagens e cache de build acumulados | `docker compose down -v`, depois `docker image prune` e `docker builder prune` |
| Muito lento no Mac com Apple Silicon | Emulação `amd64` | Esperar a primeira subida; as seguintes usam cache |

Para limpar tudo do projeto: `docker compose down -v --rmi local` (para os contêineres, apaga o volume e as imagens construídas aqui).

## 7. Como conferir que está tudo certo

Com o ambiente no ar (ajuste as portas se mudou):

```bash
curl -fsS http://localhost:7071/api/health                          # API
curl -fsS http://localhost:8080/api/health                          # API pelo nginx (mesma origem)
curl -fsS http://localhost:7072/api/health                          # PLN
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/members)" = "401"   # exige login
test "$(curl -s -o /dev/null -w '%{http_code}' -X POST -d '{}' http://localhost:7072/api/chat)" = "401"   # PLN exige chave
```

O **CI repete isso a cada push** (job "Imagens Docker e teste de fumaça" em `.github/workflows/ci.yml`): sobe o compose, confere a API, o app, o PLN, o login (cadastro de uma conta) e uma pergunta ao chatbot de ponta a ponta (API chamando o PLN com a chave local), e derruba tudo. Se esse job falhar, os registros (`docker compose logs`) aparecem na própria execução.

## 8. Segurança do ambiente local

- As portas só aceitam o próprio computador (`127.0.0.1`); não exponha o ambiente na rede.
- As chaves `local` do compose e `docker/nlp-host-secrets.json` são **públicas** e valem só neste ambiente (que guarda tudo em memória). Na nuvem, as chaves vêm do Key Vault (ADR-008) e são outras.
- O app web servido pelo nginx já leva a política de segurança de conteúdo (CSP) e os cabeçalhos de segurança (`apps/mobile/nginx.conf`), iguais aos do Azure Static Web Apps.
- Os contêineres rodam com o usuário padrão das imagens oficiais (root, no caso do host das Functions); ponto a melhorar se o ambiente for exposto, o que **não** é o uso previsto.

## 9. Diferenças entre o ambiente local e a nuvem

| Aspecto | Docker local | Azure |
|---|---|---|
| Banco | Em memória (somem ao reiniciar) | Azure SQL |
| Chaves | Constantes locais públicas | Key Vault / configurações da aplicação |
| Voz | Desligada (sem Speech) | Azure AI Speech |
| E-mail de recuperação | Desligado (sem Brevo) | Brevo configurado |
| Armazenamento das Functions | Azurite | Conta de armazenamento |
| Escala | 1 instância de cada | Flex Consumption (PLN com 1 instância sempre pronta) |
| Endereço da API no app | `/api` (mesma origem, via nginx) | URL da Function App, com CORS restrito |
