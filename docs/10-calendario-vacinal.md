# Calendário vacinal, família e doses (RF02, RF03, RF04, RF08 e RF09)

Itens do Jira: SCRUM-16 (calendário), SCRUM-15 (família) e SCRUM-18 (doses). Este documento é a referência rápida; a especificação completa da API está em `GET /api/docs` (Swagger).

O app usa o **Calendário Nacional de Vacinação 2026**, do Ministério da Saúde (PNI), transcrito dos cinco arquivos oficiais obtidos em 06/10/2026 em <https://www.gov.br/saude/pt-br/vacinacao/calendario>:

| Faixa | Arquivo | Linhas |
|---|---|---|
| Criança (0 a 9 anos, 11 meses e 29 dias) | `Calendário Nacional de Vacinação - Criança.pdf` | 34 |
| Adolescente e jovem (10 a 24 anos, 11 meses e 29 dias) | `... - Adolescentes e jovens.pdf` | 10 |
| Adulto (25 a 59 anos, 11 meses e 29 dias) | `... - Adulto.pdf` | 6 |
| Idoso (60 anos ou mais) | `... - Idoso.pdf` | 8 |
| Gestante | `... - Gestante.pdf` | 7 |

Os dados ficam em `packages/shared/src/calendar/pni-2026.ts`, com fonte, versão e data de obtenção. Nada foi preenchido de memória (CLAUDE.md §8). Quando sair uma nova versão, cria-se um novo conjunto e mantém-se o anterior.

## Como o calendário vira doses

- **Faixa do membro:** definida pela idade em meses completos na data de hoje (limites acima). Cada membro recebe as linhas da sua faixa; a **gestante** soma as linhas da gestação.
- **Quem já passou da infância ao cadastrar** não recebe as doses da faixa infantil: esse histórico só consta na caderneta.
- **Linha por idade** (ex.: "12 meses"): a data prevista é o nascimento mais a idade em meses (se o dia não existe no mês, usa o último dia do mês).
- **"Conforme histórico vacinal"** e **gestação**: o calendário não fixa idade nem prazo; a dose aparece com data prevista de hoje, como lembrete de conferir a caderneta, e **nunca fica atrasada** sozinha.
- **Linha condicional** (trabalhador de saúde, povos indígenas, área de risco, casos excepcionais): mostrada com aviso e **nunca fica atrasada** sozinha.
- **Atraso automático** (rotina de prazo, T4 e T7): só para linha por idade e sem condição.
- **"3 doses" numa linha** vira uma única dose no ciclo de vida do app (simplificação assumida).
- **Notas de rodapé oficiais** acompanham cada linha e são exibidas na tela.

## Pontos a conferir pelo autor

- O rotavírus aparece como "sorotipos G1" na imagem do PDF da criança e como "G11" na camada de texto do arquivo. Foi usado **G1** (a imagem).
- Os textos das notas foram copiados dos PDFs; o asterisco de "área de risco epidemiológico" foi omitido e a definição da área (circulação viral comprovada...) não está reproduzida.
- Os 4 meses trazem "pneumocócica 10-valente" e os 2 meses e 12 meses trazem "20-valente", como está no PDF oficial.

## Casos de teste

Automatizados em `packages/shared/src/calendar/rules.test.ts` e `packages/shared/src/domain/civil-date.test.ts`:

| ID | O que verifica |
|---|---|
| CT-CAL-01 a 05 | Integridade dos dados: ids únicos, notas existentes e usadas, total de linhas por faixa, fonte oficial e versionada, idades válidas |
| CT-CAL-06 e 07 | Limites das faixas etárias (119/120, 299/300, 719/720 meses) |
| CT-CAL-08 a 12 | Regras indicadas para bebê, adulto, gestante, não gestante e idoso |
| CT-CAL-13 e 14 | Cálculo da data prevista (inclusive fim de mês) e regras sem prazo fixo |
| CT-CAL-15 | Quais regras podem atrasar |
| CT-CAL-16 e 17 | Notas de rodapé de cada regra |
| CT-CAL-D01 a D04 | Soma de meses e idade em meses (limites, fim de mês, ano bissexto, data inválida) |

## API (registrada no OpenAPI, em `/api/docs`)

| Método e rota | O que faz | Códigos de erro |
|---|---|---|
| `GET /api/consent`, `PUT /api/consent` | Consulta e registra o consentimento (versão do termo, horário e declaração de responsável) | 400, 401 |
| `DELETE /api/account` | Exclui a conta e **todos** os dados do usuário | 401 |
| `GET /api/members`, `POST /api/members` | Lista e cadastra pessoas; o cadastro gera as doses do calendário | 400, 401, 403 (sem consentimento), 422 (nascimento no futuro, sem declaração de responsável para menor, limite de 20 pessoas) |
| `GET`, `PUT`, `DELETE /api/members/{id}` | Consulta, edita (gera as doses que passarem a ser indicadas, sem duplicar) e exclui (em cascata) | 400, 401, 403, 404, 422 |
| `GET /api/members/{id}/doses` | Calendário da pessoa, com fonte e versão; aplica a rotina de prazo (atraso) ao ler | 400, 401, 404 |
| `GET /api/doses/{id}`, `POST /api/doses/{id}/events` | Consulta e muda o estado da dose pela máquina de estados (RF04) | 400, 401, 404, 409 (transição inválida), 422 (regra de data ou de confirmação) |

- **Propriedade:** todo acesso confere o dono; recurso de outro usuário responde 404 (ADR-013).
- **Rotina de prazo:** o atraso (T4 e T7) é aplicado pelo ator `SCHEDULER` do domínio sempre que as doses são lidas. O cliente nunca envia `MARK_OVERDUE` (o esquema o recusa). Uma rotina agendada por tempo, para sinalizar atrasos com o app fechado, entra com os lembretes (SCRUM-19).
- **Provisório:** dados em memória e sessão de demonstração (ADR-013) até o banco e o login.

## Telas do app (Expo, web, Android e iOS)

| Tela | Rota | Requisito |
|---|---|---|
| Consentimento (termo em linguagem simples, aceite, declaração de responsável) | `/consentimento` | RF09 |
| Família (lista, adicionar, editar, excluir pessoa) | aba Família, `/membro/novo`, `/membro/[id]` | RF02 |
| Calendário (atrasadas, agendadas, a fazer; fonte e versão) | aba Calendário | RF03, RF04 |
| Detalhe da dose (para que serve, quando, notas oficiais, registrar, agendar, reagendar, desmarcar, cancelar com confirmação) | `/dose/[id]` | RF04 |
| Histórico (aplicadas e canceladas) | aba Histórico | RF08 |
| Assistente | aba Assistente (chatbot e voz no próximo item) | RF06, RF07 |
| Conta (aparência, privacidade, excluir tudo) | aba Conta | RF09 |

## Casos de teste automatizados (resumo)

| IDs | Onde | O que verifica |
|---|---|---|
| CT-FAM-01 a 10 | `apps/api/src/services/member-service.test.ts` | Consentimento, declaração de responsável, limites, propriedade, edição sem duplicar, exclusão em cascata |
| CT-API-V01 a V08, CT-T02 a T12 via API | `apps/api/src/services/dose-service.test.ts` | Calendário do membro, rotina de prazo, transições, guardas e propriedade |
| CT-API-H01 a H12 | `apps/api/src/handlers/handlers.test.ts` | Validação de entrada (400), códigos HTTP e esquemas de resposta |
| CT-PRIV-01 a 04 | `apps/api/src/services/consent-account.test.ts` | Consentimento e exclusão da conta |
| CT-REP-01 a 04, CT-SEG-01 a 03 | `apps/api/src/repositories`, `identity.test.ts` | Isolamento por dono, limite de donos e formato da sessão |
| CT-API-O01 a O08 | `apps/api/src/openapi/build-spec.test.ts` | Toda rota registrada e documentada com seus códigos de erro |
| CT-APP-A, E, C, F, M, X, K, H, D, I e CT-T02, T03, T05, T08, T10 no app | `apps/mobile/src` | Cliente da API, fluxos de cada tela e ações do ciclo de vida da dose |
