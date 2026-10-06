# Passagem de contexto: do chat para o Claude Code

Estado em **06/10/2026** (terça-feira, fim da sessão). Este arquivo resume o que foi decidido e produzido, para que uma sessão nova do Claude Code continue do ponto certo. Leia junto com `CLAUDE.md`. Em caso de conflito, `CLAUDE.md` e os ADRs valem mais do que este resumo.

## 0. Retomar daqui (leia primeiro; atualize ao pausar)

Este arquivo é o canal de continuidade entre computadores e sessões. A memória local do Claude **não** sincroniza entre máquinas; só o que está commitado e enviado ao GitHub (`origin`) chega ao outro computador.

**Última atualização:** 06/10/2026, ao fim da sessão no computador do trabalho/faculdade. A `main` está em dia (último PR mesclado: #16, Docker). Nenhuma branch aberta.

### 0.1 Como retomar em casa

```bash
git checkout main && git pull
nvm install 24 && nvm use          # o .nvmrc pede o Node 24
npm install
npm run build                      # o app e a API leem o @vacina/shared compilado (dist)
cp apps/api/local.settings.example.json apps/api/local.settings.json   # arquivo local, fora do Git
```

- Rodar sem contêiner: `npm run dev:api` (terminal 1) e `npm run dev:mobile` (terminal 2). Rodar tudo em contêineres: `docker compose up --build` (app web em http://localhost:8080, API em http://localhost:7071/api/docs). Detalhes no `README.md`.
- Para falar com o Azure: `az login` no navegador (o acesso condicional do diretório expira o login a cada 3 dias). Para o Jira, o Claude usa o conector (site `vacinaemdia.atlassian.net`; transição "Em análise" tem id `31`).
- Ferramentas que o Claude pode precisar em casa (o autor decide instalar): Docker Desktop, `poppler`, `pandoc` e `libreoffice` (Word e PDF), `gh` (opcional; o autor abre e mescla os PRs).
- Peça ao Claude de casa para **ler o `CLAUDE.md` e este arquivo** e, **antes de mexer em qualquer coisa**, salvar na memória dele as "Regras permanentes do autor" (0.4), porque a memória não veio junto.

### 0.2 O que existe e funciona hoje

| Parte | Estado |
|---|---|
| Monorepo | npm workspaces (`packages/shared`, `apps/api`, `apps/mobile`); TypeScript 6 estrito; ESLint, Prettier, Husky, commitlint, Jest, TypeDoc; Node 24 |
| `packages/shared` | Máquina de estados da dose (T1 a T12), datas civis, geração de doses, esquemas Zod de entrada e de resposta (98 testes) |
| `apps/api` | Azure Functions: `GET /api/health`, `GET /api/doses`, `GET /api/doses/{id}`, `POST /api/doses/{id}/events`, `GET /api/openapi.json`, `GET /api/docs` (Swagger). Dados **em memória** com seed `FICTITIOUS`, sem login (64 testes) |
| `apps/mobile` | Expo (Android, iOS e web), NativeWind com os tokens, 3 temas, fonte Atkinson, componentes base e estados de carregando, erro e vazio; a tela busca as doses na API (77 testes). Android e iOS foram verificados pelo autor só até o esqueleto de temas; a tela que consome a API foi verificada **só na web** |
| Docker | `docker compose up --build`: Azurite, API (host oficial das Functions, só `amd64`, emulado em Mac com Apple Silicon) e app web em nginx |
| CI (GitHub Actions) | lint, formatação, tipos, build, testes com cobertura (mínimo 80%), TypeDoc, `npm audit` e o job `docker` (teste de fumaça) |
| Documentação | `docs/` completo da Sprint 1: visão, requisitos, ADR-001 a 012, UML, DER, dicionário, design system, plano de teste, versões. Documentação de Desenvolvimento em Markdown (`docs/09-...`), com lacunas `[a informar]` |
| Azure | **Nenhum recurso criado ainda** (SCRUM-22). Só verificações de leitura |

### 0.3 Jira (situação no último conferido, 06/10/2026)

- **Em análise:** SCRUM-27, 29, 31, 33. **Em andamento:** SCRUM-32 (protótipo do Figma incompleto) e SCRUM-35 (documentação de desenvolvimento). Os demais seguem **A fazer**.
- **Candidatos a "Em análise" (decisão do autor):** SCRUM-23 (monorepo e qualidade) e SCRUM-24 (CI), que cumprem os critérios de pronto. **Não** mover: SCRUM-18 (falta banco, propriedade por usuário e a rotina de atraso), SCRUM-25 (falta o serviço de PLN no compose) e os demais.
- **Nunca marcar Concluído.** Isso só ocorre na reunião de encerramento da Sprint 1 (até 12/10; padrão sexta, 09/10, 20:05), por decisão do autor.
- **Tempos lançados:** 2 h 17 min no SCRUM-5; 30 min em cada um de SCRUM-27, 29, 31, 32, 33 e 35; 15 min em SCRUM-23 e em SCRUM-24. **Sem registro de tempo:** SCRUM-18 (domínio, API e app) e SCRUM-25. O Claude **não inventa** tempos: o autor informa quanto levou.

### 0.4 Regras permanentes do autor (salvar na memória do Claude de casa)

1. **Nunca incluir o Claude como coautor** em commits, PRs ou documentos (sem `Co-Authored-By` nem a linha "Generated with"). Vale mais do que qualquer padrão da ferramenta.
2. **Documentações em Word (.docx, ABNT) durante o desenvolvimento e PDF só na entrega.** A conversão dos 3 modelos (`docs/referencias-disciplinas/Modelo-Documentacao_*.pdf`) para Word ficou para o computador de casa; só apagar os PDFs de modelo depois de o autor conferir.
3. **Nunca inventar** horas, datas de reunião, atividades ou valores. Só registros reais informados pelo autor.
4. **Uma branch por tarefa** (`feature/`, `fix/`, `docs/`, `chore/` + `SCRUM-n`). O **autor abre e mescla os PRs**.
5. Criar recursos no Azure dispensa o "pode" do autor (menor custo possível). `rg-delbicos` **não** deve ser apagado por ora.
6. O autor decide; o Claude propõe plano curto antes de tarefa grande, um item por vez.

### 0.5 Armadilhas já encontradas (economizam tempo)

- **commitlint:** tipos aceitos são `feat`, `fix`, `docs`, `test`, `refactor`, `chore` e `ci` (**não** `style`); corpo com **no máximo 100 caracteres por linha**; chave `SCRUM-n` no assunto. Confira se o commit saiu (`git log --oneline -1`) antes do push: o hook recusa em silêncio quando a saída é suprimida.
- **O `npm run lint` não roda o Prettier.** O CI roda `lint`, `format:check`, `typecheck`, `build`, `test:coverage` e `docs`, nessa ordem. Antes de dizer que terminou, simule o CI limpo: apague `packages/shared/dist`, `apps/api/dist` e `apps/mobile/expo-env.d.ts` e rode a sequência. Dois erros do CI vieram de arquivos que só existiam na máquina local.
- **`@vacina/shared`:** typecheck e testes leem o código-fonte (`paths` e `moduleNameMapper`); o Metro e o build usam o `dist`, então `npm run build` antes de rodar o app.
- **Testes determinísticos:** nada de depender da ordem de resolução de promessas (o `CT-APP-T01` já falhou no CI por isso). No TanStack Query dos testes, `gcTime: Infinity`, senão o Jest não encerra.
- **Web em desenvolvimento:** o NativeWind exige `darkMode: 'class'` no `tailwind.config.js`; depois de mudar o config, reinicie o Expo com `--clear`. O TanStack Query pausa tentativas em aba oculta (ao testar o estado de erro, deixe a aba visível).
- **Duas classes de cor** no mesmo elemento disputam pela ordem do CSS gerado; o `Texto` só aplica a cor padrão se não houver outra.
- macOS não tem o comando `timeout`. A imagem das Functions no Docker só tem `amd64`.
- **Figma (SCRUM-32):** arquivo `lZboLAlTDtA2cJQRyKtcdW`; o plano Starter limita chamadas, modos e páginas. Estratégia econômica: poucos scripts grandes, temas por regravação das variáveis ligadas, uma única captura no fim. Detalhes e IDs no bloco "SCRUM-32, Figma" do histórico (0.9).

### 0.6 Próximos passos, em ordem sugerida

1. **Autor:** (a) decidir se SCRUM-23 e SCRUM-24 vão a "Em análise"; (b) informar o tempo de SCRUM-18 e SCRUM-25; (c) decidir o que fazer com os recursos do DelBicos no Azure; (d) conferir o plano Education do Figma; (e) informar a fonte oficial do calendário do PNI (links em `https://www.gov.br/saude/pt-br/vacinacao/calendario`) para o Claude extrair um seed "pendente de validação"; até lá tudo é `FICTITIOUS`.
2. **SCRUM-22, Azure mínimo** (próximo item técnico): `az login`; registrar os provedores `Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory`; grupo `rg-vacinaemdia` na Brazil South; Static Web Apps Free (Central US, pois a Brazil South não tem), Function App, Key Vault, Application Insights, SQL gratuito; o **Claude gera o token de deploy do Static Web Apps e o autor cola nos secrets do GitHub** (o Claude não guarda segredo). Depois, o fluxo de deploy no GitHub Actions. O tenant do Entra External ID fica para o SCRUM-13.
3. **Figma (SCRUM-32):** terminar telas restantes, tablet e web, temas Escuro e Alto contraste, dentro do limite de créditos (150 de 500 já usados na conta do autor).
4. **Sprint 2 (13/10 a 19/10):** SCRUM-22, 23, 24, 13 (23 e 24 já adiantados). Depois, pelo quadro do §3: SCRUM-15, 16, 18 (banco, propriedade por usuário e rotina de atraso), 28; e assim por diante. O **SCRUM-25** só fecha quando o serviço de PLN entrar no compose (SCRUM-20 e 21).
5. **SCRUM-35:** atualizar a cada 2 dias, só com datas e tempos reais informados pelo autor (planejamento da Sprint 1, estudos diários, reuniões).
6. **Word:** converter os 3 modelos (ver 0.4, item 2) e, mais adiante, montar a Documentação Técnica a partir do Markdown e da especificação OpenAPI.

### 0.9 Histórico detalhado das sessões (referência; a retomada está em 0.1 a 0.6)

Este arquivo é o canal de continuidade entre computadores e sessões. A memória local do Claude **não** sincroniza entre máquinas; só o que está commitado e enviado ao GitHub (`origin`) chega ao outro computador.

**Última atualização:** 06/10/2026, computador do trabalho/faculdade.

**Feito:**
- Commit inicial na `main` (`0f64b2c`): `CLAUDE.md`, `README.md`, `.gitignore`, `LICENSE` e `docs/` (sem os PDFs de referência).
- Branch `docs/SCRUM-5-claude-md-word-e-pdf`: `CLAUDE.md` atualizado com a regra "Word (ABNT) durante o desenvolvimento, PDF só na entrega".
- Jira SCRUM-5: comentário com o commit e worklog de 2h 17m lançados. Status **não** alterado.

**Atualização de 06/10/2026 (SCRUM-35 e status do Jira):**
- Itens movidos para **Em análise** pelo Claude, a pedido do autor, por terem cumprido os critérios de pronto: SCRUM-27, SCRUM-29, SCRUM-31 e SCRUM-33. SCRUM-32 segue em andamento (protótipo do Figma incompleto). Nada está Concluído; isso só ocorre na reunião de encerramento da Sprint 1 (até 12/10).
- `docs/09-documentacao-de-desenvolvimento.md` criado com a estrutura do modelo (o modelo pula da seção 3 para a 6; a numeração aqui é contínua). Foram preenchidos só os fatos verificáveis. **Tempos, horários e durações ficam `[a informar]`**: o autor precisa informá-los; o Claude não os inventa (CLAUDE.md §13 e critério "tempos reais" do SCRUM-35). Já registrado de verdade: 2 h 17 min no SCRUM-5. Custo de nuvem: zero, confirmado pelo autor.
- `poppler` instalado via Homebrew (`pdftotext` e `pdftoppm` disponíveis).
- Dados informados pelo autor em 06/10/2026: RA 3011392413005; tempo médio de 30 min por item (já lançado como worklog em SCRUM-27, 29, 31, 32, 33 e 35); reuniões às sextas, 20:05, de 30 a 40 min; rotina de estudo de segunda a sexta, 19:00 às 21:45 (PLN segunda, Nuvem terça, Mineração de Dados quarta, Qualidade quinta, reunião com o professor sexta). Registros de aprendizagem e de reuniões só entram **depois de ocorrerem**, com a data real.
- Pendências do autor para o SCRUM-35: data da reunião de planejamento da Sprint 1 e o local; informar após cada reunião e cada estudo a data e o tempo efetivos.

**Atualização de 06/10/2026 (SCRUM-32, Figma):**
- Doc do design system e `tokens.json` já estão na `main`. O arquivo do Figma (chave `lZboLAlTDtA2cJQRyKtcdW`, link em `docs/04-design-system.md` §8) foi construído até o limite de chamadas do Figma MCP no plano Starter (também só 1 modo por coleção e 3 páginas).
- **Feito no Figma:** coleções de cor por tema (Claro `4:2`, Escuro `4:24`, Alto contraste `4:46`) e Medidas (`4:68`); 8 estilos de texto Atkinson; 14 componentes na página `0:1`: Selo `5:32`, Botão `6:20` (props `Texto#6:0`, `Tipo`, `Estado`), Campo `6:36` (`Rotulo#6:10`, `Valor#6:14`, `Estado`), Cartão de dose `7:77` (`Vacina#7:0`, `Detalhe#7:6`, `Estado`), Voz `7:96`, Aviso `7:103`, Vazio `8:27`, Erro `8:37`, Carregando `8:46`, Navegação `8:149`, Membro `9:65` (`Nome#9:0`, `Idade#9:3`, `Situacao`) e Mensagem `9:72` (`Mensagem#9:6`, `Autor`). Nomes de variantes são em ASCII (por exemplo `Tipo=Principal, Estado=Padrao`).
- **Telas de celular criadas na página `4:104` e ainda não conferidas visualmente:** Entrar `10:39`, Consentimento `10:58`, Família `10:71`, Calendário `10:138`. Conferir com `get_screenshot` antes de continuar.
- **Falta:** celular (Detalhe da dose, Confirmação de cancelamento, Voz, Assistente, Histórico, Conta); tablet 768 e web 1280 na página `4:105`; cópias do Calendário nos temas Escuro e Alto contraste (trocar as variáveis ligadas pelas de mesmo nome na outra coleção); títulos de seção na página de componentes; amostra das cores por tema.
- **Como continuar:** esperar a renovação do limite do Figma MCP ou ampliar o plano e o assento (o plano Education do Figma, para estudantes, costuma liberar o Professional; conferir). Para continuar, carregar as skills `figma-use`, `figma-generate-library` e `figma-generate-design` e reutilizar os IDs acima. Os arquivos de Figma não ficam no repositório; este bloco e o §8 do design system são o registro.

**Atualização de 06/10/2026 (SCRUM-31, UML e DER):**
- Branch `docs/SCRUM-31-uml-der` com casos de uso, classes, 3 sequências (login, registrar dose, lembrete), arquitetura, DER e dicionário de dados em `docs/03-uml/`. Todos os diagramas Mermaid foram validados e renderizados com o `@mermaid-js/mermaid-cli` (instalado só na pasta temporária da sessão, fora do projeto; reinstalar com `npm install @mermaid-js/mermaid-cli` num diretório de scratch se precisar validar de novo). PNGs não foram versionados; gerar na hora de montar os Word (SCRUM-34).
- Decisões de modelagem adotadas por padrão (autor delegou): lembrete por push do Expo + sinalização no app (sem e-mail); doses gravadas no banco ao cadastrar o membro; só a data de aplicação (sem lote e local); tabela de eventos da dose; exclusão em cascata; consentimento com versão do termo e declaração de responsável para menores.
- **Pendências do autor:** fornecer ou confirmar os dados oficiais do calendário do PNI (até lá, o seed é `FICTITIOUS`); validar a antecedência dos lembretes e a lista de grupos específicos.

**Atualização de 06/10/2026 (SCRUM-23, Fase C, app):**
- Branch `feature/SCRUM-23-app-temas-e-tokens`: NativeWind 4.2.7 + Tailwind 3.4.19 lendo `tokens.json`, `ThemeProvider` com 3 temas, fonte Atkinson (verificada na web), componentes base, tela provisória com doses de exemplo `FICTITIOUS` e testes do app (jest-expo + Testing Library, cobertura de linhas 100%). Detalhes em `docs/04-design-system.md` §6.
- **Falta da Fase C:** API de doses de exemplo + OpenAPI/Swagger (ADR-012; depende do PR da branch `docs/SCRUM-23-openapi-swagger` estar na `main`), depois `docker-compose.yml` (SCRUM-25) e a Fase D (Azure, SCRUM-22).
- Para o app achar `@vacina/shared`, rode `npm run build` na raiz antes de `npm run dev:mobile` (o pacote aponta para `dist`); nos testes o Jest lê o código-fonte direto.

**Atualização de 06/10/2026 (SCRUM-18 e SCRUM-23, API de doses e Swagger):**
- Branch `feature/SCRUM-18-api-doses-swagger`: `GET /api/doses`, `GET /api/doses/{id}`, `POST /api/doses/{id}/events` (usa a máquina de estados; erros 400, 404, 409, 422, 500), `GET /api/openapi.json` e `GET /api/docs` (Swagger UI, só com `DOCS_ENABLED=true`). Dados em memória com seed `FICTITIOUS` (ids `ex-1` a `ex-5`), sem login e sem dados pessoais. O "hoje" das regras é o dia civil de Brasília.
- Camadas: `handlers` → `services` → `domain` (`@vacina/shared`) → `repositories` (em memória; o banco entra no SCRUM-22). A montagem com `new Date()` fica só em `src/functions/composition.ts`.
- Código 401, 403 e 429 só constam na especificação quando existirem login e rate limit (SCRUM-13).
- O app **ainda não chama a API** (decisão do autor: PR separado). Próximo passo: TanStack Query + `EXPO_PUBLIC_API_URL` + CORS, depois `docker-compose` (SCRUM-25) e Azure mínimo (SCRUM-22).
- Node 24 LTS adotado (`.nvmrc`); no computador de casa, `nvm install 24 && nvm use`.

**Atualização de 06/10/2026 (SCRUM-18, app consome a API):**
- Branch `feature/SCRUM-18-app-consome-api`: a tela de doses busca `GET /api/doses` com TanStack Query (`src/api`, `src/features/doses`), valida a resposta com o mesmo esquema Zod, mostra carregando, erro (com "Tentar de novo") e vazio, e exibe fonte e versão do calendário vindas da API. O conjunto de exemplo interno do app foi removido.
- `EXPO_PUBLIC_API_URL` define a API (padrão `http://localhost:7071/api`). Para celular real: `npm run dev:api:rede` (a API escuta em `0.0.0.0`) e o IP do computador. Emulador de Android: `10.0.2.2`.
- Corrigido bug de contraste: `text-texto` e `text-sobrePrimaria` disputavam no CSS e o botão selecionado ficava com texto quase invisível (cerca de 1,6:1 no tema Escuro). Agora o mínimo medido é 6,5:1.
- Verificado no navegador com API e app reais (dados ao vivo, erro com a API desligada, recuperação). Nota: o TanStack Query pausa tentativas em aba oculta; ao testar o erro, deixe a aba visível.
- Ainda **não** verificado: celular real e emuladores com esta versão. Próximos passos: `docker-compose` (SCRUM-25) e Azure mínimo (SCRUM-22).

**Atualização de 06/10/2026 (SCRUM-25, Docker):**
- Branch `feature/SCRUM-25-docker`: `docker compose up --build` sobe Azurite 3.37.0, a API (host oficial `azure-functions/node:4-node24`, só amd64, emulada em Mac M1/M2) e o app web (build do Expo servido por nginx 1.31.6, que repassa `/api` para a API: mesma origem, sem CORS). Dockerfiles em `apps/api/` e `apps/mobile/`, contexto de build é a raiz. Portas só em `127.0.0.1`: web 8080, API 7071, Azurite 10000 a 10002.
- O app aceita `EXPO_PUBLIC_API_URL=/api` (caminho na mesma origem; `//host` é rejeitado). A imagem web usa esse valor por padrão.
- Validado aqui: build das duas imagens, subida do zero com `down -v` e `up --build --wait`, API direta, via nginx, Swagger, POST, Azurite recebendo requisições do host e o app aberto no navegador pelo contêiner. Novo job `docker` no CI faz o mesmo (em amd64 nativo); ainda não rodou no GitHub.
- **O SCRUM-25 ainda não está completo:** o critério pede o serviço de PLN no compose, que só existe com SCRUM-20 e SCRUM-21. Não mover para "Em análise" antes disso (ou combinar com o autor a divisão do item).

**Lembretes por item (revisar com o autor quando o item começar):**

| Item | O que revisar |
|---|---|
| SCRUM-22 | Registrar os provedores `Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory`; criar o tenant externo (diretório do Centro Paula Souza); recursos antigos do DelBicos no Azure (inventário feito em 06/10/2026: `rg-delbicos` e `DefaultResourceGroup-CQ`; nada foi apagado e é preciso decidir com o autor, pois podem consumir o crédito) |
| SCRUM-13 | Bloqueio de tentativas de login no Entra; validar o ADR-009 (token) com o fluxo real e escolher entre MSAL e `expo-auth-session` |
| SCRUM-14 | Texto de consentimento mencionando a transferência de dados para fora do Brasil (Entra sem região no Brasil) |
| SCRUM-19 | Antecedência dos lembretes; texto genérico da notificação |
| SCRUM-20 e 21 | Calibrar os limites do ADR-010; rede entre API e PLN |
| SCRUM-26 | Confirmar custos na calculadora oficial (Speech F0, Functions, Application Insights) |

**Atualização de 06/10/2026 (fim da sessão):**
- SCRUM-5: PR #1 já mesclado na `main`.
- SCRUM-27 (plano de teste): `docs/07-testes/plano-de-teste.md`, branch `docs/SCRUM-27-plano-de-teste`, enviada ao GitHub; PR a abrir pelo autor.
- SCRUM-33 (ADRs): `docs/05-adrs/` com ADR-001 a ADR-010, todos **Aceita**, branch `docs/SCRUM-33-adrs`, enviada ao GitHub; PR a abrir pelo autor. O autor deve revisar os ADRs (em especial os valores iniciais de limite de taxa no ADR-010 e a nota de residência de dados no ADR-005).
- Verificações no Azure (somente leitura, via `az`): assinatura `Azure for Students` compatível com o SQL gratuito; política de regiões permitidas (Central US, Brazil South, Chile Central, South Africa North, North Central US); provedores `Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory` ainda **não registrados** (registrar no SCRUM-22). O `az login` expira a cada 3 dias por acesso condicional do diretório (Centro Paula Souza); o autor refaz o login no navegador.
- Nenhum recurso foi criado no Azure. Jira: SCRUM-27 e SCRUM-33 estão "Em andamento"; nada marcado como Concluído.
- Próximo item da ordem da Sprint 1: SCRUM-31 (UML restante e DER), depois SCRUM-32 (design system) e SCRUM-35.

**Pendente (em andamento): converter os 3 modelos de documentação para Word**
- Arquivos: `docs/referencias-disciplinas/Modelo-Documentacao_tecnica.pdf`, `..._desenvolvimento.pdf` e `..._usuario.pdf`.
- Objetivo: gerar `.docx` editáveis em `doctos/`, formatados fielmente pela ABNT (a formatação do PDF original pode ser perdida), já com a estrutura do modelo para preencher. Horas, datas e reuniões da Documentação de Desenvolvimento ficam em branco (são do autor).
- Só apagar os 3 PDFs de modelo depois que o autor conferir os Word. Os outros 3 PDFs de `referencias-disciplinas/` permanecem como PDF.
- Ferramentas que faltavam na máquina onde isso foi tentado (autor decide instalar): `poppler` (ler PDF), `pandoc` e `libreoffice` (renderizar e conferir o Word), via Homebrew.
- Os 6 PDFs de `docs/referencias-disciplinas/` estão versionados na branch `docs/SCRUM-5-claude-md-word-e-pdf`, então chegam ao outro computador com `git pull`.

**Próximo passo depois disso:** abrir PR da branch `docs/SCRUM-5-...` para a `main` e seguir a Sprint 1 (ver §4).

**Regras do autor desta fase:** nunca se incluir como coautor em commits/PRs; a partir de agora, uma branch por tarefa (`feature/SCRUM-n-...`, `docs/SCRUM-n-...`); nunca marcar Jira como Concluído; não inventar horas.

**Como retomar em outro computador:** `git fetch`, trocar para a branch indicada acima, ler `CLAUDE.md` e este arquivo, e confirmar o estado com `git status` e `git log --oneline -5`. Ao pausar: atualizar esta seção, commitar e dar push da branch.

## 1. Onde estamos

- Projeto: **Vacina em Dia** (carteira de vacinação digital com lembretes, busca por voz e chatbot), solo, na Azure. PI-VI da Fatec Votorantim.
- Fase 0 (fundação) concluída em rascunho: visão e escopo, requisitos, backlog no Jira, diagrama de estados da dose, casos de teste e `CLAUDE.md`. Tudo isso está **em análise do autor**, ainda não aprovado em reunião de sprint.
- Já existe código: monorepo, domínio da dose, API de exemplo, app com temas, Docker e CI (ver 0.2). Ainda **não há** Azure provisionado, login, banco, PLN nem calendário oficial do PNI.
- Datas: **12/11** Qualidade e Testes, **16/11** PLN (voz e chatbot), **19/11** entrega total. A data de Computação em Nuvem II está a confirmar.

## 2. O que já existe (neste pacote)

| Arquivo | Conteúdo | Situação |
|---|---|---|
| `CLAUDE.md` | Regras de trabalho, stack, convenções, segurança, DoD | Pronto; revisar §14 (decisões em aberto) |
| `docs/Fase0_Documento_de_Visao_e_Escopo.docx` | Documento formal em ABNT | Rascunho; falta RA na folha de rosto |
| `docs/01-visao-e-escopo.md` | Mesma Fase 0 em Markdown | Gerado do .docx |
| `docs/02-requisitos.md` | RF01 a RF12 e RNF01 a RNF10 | Extraído da Fase 0 |
| `docs/03-uml/estados-dose.*` | Diagrama de estados da dose (Mermaid, PNG, SVG) e tabelas | Rascunho; Mermaid validado com o mermaid-cli em 06/10/2026 (renderiza sem erro) |
| `docs/07-testes/casos-teste-estados-dose.md` | 42 casos de teste (CT-...) | Rascunho (SCRUM-29) |
| `docs/referencias-disciplinas/` | PDFs do PI-VI, modelos de documentação, Qualidade e Testes, PLN | Material da faculdade, só leitura |

**Já existem:** ADRs (`docs/05-adrs/`), plano de teste (`docs/07-testes/plano-de-teste.md`), UML, DER e dicionário de dados (`docs/03-uml/`). `docs/04-design-system.md` e `docs/tech-versions.md` também existem agora. **Ainda não existe:** `docs/06-seguranca-e-lgpd.md`.

## 3. Jira (projeto SCRUM, site vacinaemdia.atlassian.net)

**Convenção de status (exigida pelo professor):** A fazer, Em andamento (sprint iniciada), Em análise (terminou dentro da data da sprint) e Concluído (só após análise na reunião de encerramento). **Nunca marcar Concluído.** As metas de sprint ficam vazias de propósito.

**Épicos:** SCRUM-5 Fundação e documentação; SCRUM-6 Infraestrutura, Azure e DevOps; SCRUM-7 Conta e privacidade; SCRUM-8 Família e calendário vacinal; SCRUM-9 Doses e lembretes; SCRUM-10 PLN (voz e chatbot); SCRUM-11 Qualidade e testes; SCRUM-12 Versão completa.

**Itens:**

| Chave | Item |
|---|---|
| SCRUM-13 / 14 | Cadastro e login (RF01) / Consentimento e exclusão (RF09) |
| SCRUM-15 / 16 / 17 | Membros (RF02) / Calendário (RF03) / Histórico (RF08) |
| SCRUM-18 / 19 | Registro e ciclo de vida da dose (RF04) / Lembretes (RF05) |
| SCRUM-20 / 21 | Busca por voz (RF06) / Chatbot (RF07) |
| SCRUM-22 / 23 / 24 | Provisionar Azure / Monorepo e qualidade / Pipeline CI |
| SCRUM-25 / 26 | Docker / Estimativa de custo e alertas |
| SCRUM-27 / 28 / 29 / 30 | Plano de teste / Caixa preta / UML de estados e casos / Jest |
| SCRUM-31 / 32 / 33 | UML e DER / Design system / ADRs |
| SCRUM-34 / 35 / 36 / 37 | Doc. técnica / Doc. de desenvolvimento / Doc. do usuário / Panfleto |
| SCRUM-38 / 39 / 40 | Mapa de UBS / Exportar PDF / Compartilhar (versão completa) |

**Sprints semanais:**

| Sprint | Período | Itens |
|---|---|---|
| 1 (ativa) | 06/10 a 12/10 | SCRUM-31, 33, 27, 29, 32, 35 |
| 2 | 13/10 a 19/10 | SCRUM-22, 23, 24, 13 |
| 3 | 20/10 a 26/10 | SCRUM-15, 16, 18, 28 |
| 4 | 27/10 a 02/11 | SCRUM-14, 17, 19, 20, 30 |
| 5 | 03/11 a 09/11 | SCRUM-21, 25, 26, 34 |
| 6 | 10/11 a 19/11 | SCRUM-36, 37 e ajustes |

O SCRUM-35 (documentação de desenvolvimento) corre em todas as sprints.

Os itens que alimentam a entrega de **12/11** (SCRUM-27, 29, 24, 28 e 30) estão nas Sprints 1 a 4, que terminam em 02/11. A Sprint 5 (03/11 a 09/11) serve de folga antes do prazo. A entrega de PLN (16/11) depende do SCRUM-20 (Sprint 4) e do SCRUM-21 (Sprint 5), ou seja, sem muita margem; vigiar esse prazo.

## 4. Próximos passos

A ordem atual está em **0.6**. A lista original da Sprint 1 (itens 1 a 6: commit inicial, plano de teste, ADRs, UML e DER, design system, documentação de desenvolvimento) já foi cumprida, salvo o protótipo do Figma e a atualização contínua do SCRUM-35.

## 5. Decisões já tomadas (resumo)

- Um único repositório (monorepo): `apps/mobile`, `apps/api`, `apps/nlp`, `packages/shared`, `docs`, `doctos`.
- API em **Azure Functions (Node/TS), sem Express**; PLN em Function Python; voz com Azure AI Speech; **Azure SQL**; Key Vault e Application Insights.
- Testes em **Jest** (decisão do autor, apesar de o PI-VI citar JUnit/Selenium); 100% de aprovação, cobertura mínima de 80% e meta de 90%.
- Chatbot por regras com TF-IDF + SVM, **sem IA generativa**.
- Calendário vacinal sempre de **fonte oficial (PNI)**, nunca de memória.
- Sem coleta de CPF nem Cartão Nacional de Saúde.

## 6. Pendências e pontos em aberto

- **Autor:** preencher o RA na folha de rosto da Fase 0; revisar o nome "Vacina em Dia"; completar as datas das referências de web (`[s. d.]`); revogar o token de API do Jira que foi colado no chat.
- Confirmar com o professor: Jest como ferramenta, se o código Python entra na meta de cobertura, e a data de Computação em Nuvem II.
- Verificar no portal da Azure: Entra External ID (ADR-005) e camada gratuita do Azure SQL.
- Definir: armazenamento seguro de token na web (o `expo-secure-store` não funciona na web), mecanismo de limitação de taxa e a confirmação de Context API + TanStack Query (ADR-006).
- Validar as decisões de modelagem do ciclo da dose (estados finais, atraso pela rotina de prazo).

## 7. Divisão de trabalho sugerida

- **Claude Code (neste repositório):** código, testes, CI, Docker, ADRs, diagramas e documentos em Markdown.
- **Chat de planejamento:** documentos formais em Word ou PDF (Fase 0, documentações técnica, de desenvolvimento e do usuário, panfleto) e operações no Jira (criar e editar itens), se o conector estiver disponível.

## 8. Prompts para a primeira sessão

**Sessão 1: organizar o repositório (sem código)**

```text
Leia CLAUDE.md e docs/00-handoff.md. Depois confira se os arquivos de docs/ estão
no lugar. Crie o README.md inicial (visão curta, estrutura de pastas, como contribuir),
um .gitignore adequado a Node, Expo e Python (sem segredos) e faça o commit inicial
em português seguindo Conventional Commits. Não crie código de aplicação ainda.
Me mostre o que vai fazer antes e peça confirmação.
```

**Sessão 2: SCRUM-27 (plano de teste)**

```text
Leia CLAUDE.md, docs/00-handoff.md, docs/01-visao-e-escopo.md, docs/02-requisitos.md
e docs/07-testes/casos-teste-estados-dose.md. Estamos na Sprint 1. Vou trabalhar o
SCRUM-27 (plano de teste, requisitos relevantes e papéis do processo de teste) para
a entrega de Qualidade e Testes de 12/11; os requisitos da entrega estão em
docs/referencias-disciplinas. Antes de escrever, proponha a estrutura do documento e
liste suas dúvidas. Não mova nada no Jira para Concluído.
```
