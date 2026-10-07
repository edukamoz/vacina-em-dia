# Rastreabilidade: requisito → tela → API → teste

Item do Jira: SCRUM-28 e SCRUM-30 (critério 4 da banca: requisitos funcionais e não funcionais mais relevantes). Estado em 07/10/2026. Mostra, para cada requisito do `docs/02-requisitos.md`, onde ele aparece no app, qual rota da API o atende e quais testes o cobrem. Cada ID `CT-...` aparece no nome do teste; o arquivo está indicado para localizar.

Legenda de pastas: `api` = `apps/api/src`, `app` = `apps/mobile/src`, `shared` = `packages/shared/src`, `nlp` = `apps/nlp/tests`.

## Requisitos funcionais (MVP)

| RF | Onde o usuário vê | Rotas da API | Testes (ID e arquivo) |
|---|---|---|---|
| RF01 Cadastro e login | Apresentação, Entrar, Criar conta, Esqueci a senha, Redefinir senha | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` | `CT-AUTH-*` (`api/services/auth-service.test.ts`, `api/handlers/auth.test.ts`, `shared/schemas/auth-api.test.ts`); `CT-RST-*` (`api/services/auth-reset.test.ts`, `app/features/auth/reset-screens.test.tsx`); `CT-SES-*` (`app/session/`); `CT-APP-L*` (`app/features/auth/auth-screens.test.tsx`); `CT-RL-*` limite de tentativas (`api/services/rate-limiter.test.ts`); caixa preta `CT-CP-C*`, `CT-CP-L*`, `CT-CP-R*` |
| RF02 Família | Aba Família, Nova pessoa, Editar pessoa (inclui parentesco) | `GET/POST /members`, `GET/PUT/DELETE /members/{id}` | `CT-FAM-*` (`api/services/member-service.test.ts`, `shared/schemas/family-api.test.ts`); `CT-APP-M*` (`app/features/onboarding-flows.test.tsx`); caixa preta `CT-CP-M*`, `CT-CP-P*`, `CT-CP-F*` |
| RF03 Calendário por faixa etária | Aba Doses (por pessoa), fonte e versão do calendário | `GET /members/{id}/doses` | `CT-CAL-*` (`shared/calendar/rules.test.ts`); `CT-G*` (`shared/domain/dose-generation.test.ts`); `CT-API-V*` (`api/services/dose-service.test.ts`); `CT-APP-K*` aba Doses (`app/features/dose-flows.test.tsx`); `CT-DATA-*` (`app/lib/dates.test.ts`) |
| RF04 Doses e ciclo de vida | Detalhe da dose (agendar, aplicar, cancelar, reagendar), Nova dose avulsa | `GET /doses/{id}`, `POST /doses/{id}/events`, `POST /members/{id}/doses` | `CT-E*`, `CT-T*`, `CT-G*`, `CT-I*`, `CT-C*` (42 casos de estados: `shared/domain/dose-state.test.ts`, `docs/07-testes/casos-teste-estados-dose.md`); `CT-AV-*` (`api/handlers/handlers.test.ts`, `app/features/dose-flows.test.tsx`); caixa preta `CT-CP-D*`, `CT-CP-V*` |
| RF05 Lembretes | Cartão "Lembretes" na aba Doses; opção de e-mail na aba Conta | `GET /reminders`, `PUT /reminders/preferences`; função agendada `sendDailyReminders` | `CT-LEM-*` (`shared/domain/reminders.test.ts`, `api/services/reminder-service.test.ts`); `CT-SQL-20` a `22` (`api/repositories/sql/sql-repositories.test.ts`); `CT-APP-LEM*` (`app/features/doses/lembretes-card.test.tsx`) |
| RF06 Voz | Aba Assistente, botão "Falar a pergunta" | `POST /assistant/voice` | `CT-AST-*` (`api/services/assistant-service.test.ts`); `CT-CLI-1*` (`api/clients/clients.test.ts`); `CT-WAV-*` (`app/lib/wav.test.ts`); `CT-VOZ-*` (`app/features/assistant/voice-recorder*.test.*`); `CT-APP-V*` (`app/features/assistant/assistant-screen.test.tsx`); caixa preta `CT-CP-A*` |
| RF07 Chatbot | Aba Assistente (texto), balão flutuante | `POST /assistant/message` | `CT-AST-*`, `CT-AST-H*` (`api/handlers/assistant.test.ts`); `CT-APP-I*`; pytest do PLN (`nlp/test_classifier.py`, `nlp/test_chatbot.py`, `nlp/test_evaluate.py`, `nlp/test_handlers.py`); avaliação em `docs/07-testes/avaliacao-chatbot.md` e `avaliacao-busca-semantica.md` |
| RF08 Histórico | Aba Histórico | `GET /members/{id}/doses` (mesma rota do calendário) | `CT-APP-H*` (`app/features/dose-flows.test.tsx`) |
| RF09 Consentimento e exclusão | Tela de consentimento, aba Conta (exclusão), Termos de uso e Política de privacidade | `GET/PUT /consent`, `DELETE /account` | `CT-APP-C*` tela de consentimento e `CT-APP-X*` aba Conta (`app/features/onboarding-flows.test.tsx`); `CT-FAM-01` e `CT-FAM-03` (sem consentimento não cadastra; menor exige declaração); `CT-APP-L30`, `L31` (`app/features/auth/auth-screens.test.tsx`); `CT-APP-LG*` (`app/features/legal/legal-screen.test.tsx`); caixa preta `CT-CP-K*` |

RF10 a RF12 (versão completa) não foram iniciados, como previsto no escopo.

## Requisitos não funcionais

| RNF | Como é verificado hoje | Onde está a evidência |
|---|---|---|
| RNF01 Desempenho | Carga leve com `scripts/carga-leve.mjs`: API local 100% abaixo de 3 s; `GET /health` real 99% a 100% abaixo de 3 s e 0 falhas com 1 instância sempre pronta (sem ela, havia 503 intermitentes); medição pontual do PLN e da voz | `docs/21-seguranca-owasp-e-carga.md` (parte 2), `docs/11-assistente-pln.md`. Pendente: rotas autenticadas reais e telemetria no Application Insights |
| RNF02 Segurança | Hash scrypt, tokens de curta duração, limite de tentativas, propriedade de dados verificada em todo acesso, `npm audit` e GitGuardian no CI | `CT-AUTH-*`, `CT-SEG-*` (cabeçalho da sessão de demonstração, `api/identity.test.ts`), `CT-RL-*`; teste de que um usuário não alcança dado de outro (`CT-LEM-23`, `CT-FAM-*`); `.github/workflows/ci.yml`. Pendente: checklist OWASP Top 10 |
| RNF03 Privacidade e LGPD | Sem CPF nem CNS; consentimento registrado; exclusão apaga tudo; logs sem dado pessoal | `CT-CP-K*`, `CT-APP-LG*`, `CT-LEM-40`/`41` (e-mail de lembrete só com quantidades); `docs/18-termos-e-privacidade.md` |
| RNF04 Usabilidade e acessibilidade | Tokens com contraste calculado (WCAG 2.1 AA), área de toque de 48 dp, rótulos e papéis testados; contraste medido no navegador nos temas Escuro e Alto contraste | `CT-UI-*`, `CT-LAY-*` (`app/components/`); `docs/04-design-system/tokens.json`; handoff, item 4. Pendente: leitor de tela e conferência visual |
| RNF05 Monitoramento | Application Insights ligado à Function App | `docs/08-infraestrutura-azure.md`. Pendente: painéis e alertas |
| RNF06 Manutenibilidade | TypeScript estrito, ESLint, Prettier, TSDoc, TypeDoc, 17 ADRs | CI (`ci.yml`), `docs/05-adrs/` |
| RNF07 Testabilidade | Jest com limite de 80% de cobertura no pipeline; todos os testes passam | Relatório de cobertura no CI; `docs/07-testes/plano-de-teste.md` |
| RNF08 Portabilidade | `docker compose up` sobe API, PLN, web e Azurite; teste de fumaça no CI | `docs/17-docker-manutencao.md`, job "Imagens Docker e teste de fumaça" |
| RNF09 Multiplataforma | Mesma base em web, Android e iOS; web e emulador Android executados | Web: todas as telas; Android: emulador (login, telas e voz). **iOS não foi executado** |
| RNF10 Integridade dos dados vacinais | Calendário versionado com fonte e data; respostas do chatbot curadas; aviso de que o app não substitui a caderneta | `CT-CAL-*`, `CT-AST-*`, pytest do PLN (`test_ct_nlp_60`, `test_ct_nlp_61`); `docs/10-calendario-vacinal.md` |

## Lacunas conhecidas

- RNF01: carga medida só na API local e no `GET /health` real; 503 intermitentes da produção resolvidos com 1 instância sempre pronta (`docs/21`); rotas autenticadas reais ainda não medidas. RNF02: checklist OWASP escrito, com lacunas abertas (auditoria do Python, Key Vault, regra `AllowAzureServices`).
- Painéis e alertas do Application Insights ainda não criados (RNF05).
- Acessibilidade com leitor de tela e iOS sem execução (RNF04 e RNF09).
- A tabela de execução (resultado obtido) existe para a caixa preta e para os estados da dose; os demais testes automatizados têm só o resultado do CI.
