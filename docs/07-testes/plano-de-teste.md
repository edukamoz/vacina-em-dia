# Vacina em Dia: Plano de Teste

> Item do backlog: B24 (antes SCRUM-27 no Jira). Primeira entrega de Qualidade e Testes de Software (12/11/2026).
> Versão 0.1 (rascunho), 06/10/2026. Autores: Eduardo Kamo Iguei, Fernando Ribeiro dos Santos, Gustavo Lopes Ferreira, Iago Yuri Rossan e Lucas Vinicios Consani.
> Este arquivo é a fonte em Markdown. Na entrega, o conteúdo vai para Word (ABNT) e depois PDF.
> Documentos relacionados: `docs/02-requisitos.md`, `docs/03-uml/estados-dose.md`, `docs/07-testes/casos-teste-estados-dose.md`.

## 1 Introdução

### 1.1 Objetivo do teste

Verificar, de forma planejada e repetível, que o aplicativo **Vacina em Dia** atende aos requisitos funcionais e não funcionais mais relevantes do MVP (RF01 a RF09), com atenção especial a três riscos do domínio:

1. **Integridade dos dados vacinais:** o calendário e as respostas do chatbot não podem induzir ao erro (RNF10).
2. **Privacidade:** dados de vacinação são dados pessoais sensíveis (LGPD); um usuário nunca pode ver dados de outro (RNF02 e RNF03).
3. **Ciclo de vida da dose:** a máquina de estados deve aceitar apenas transições válidas (RF04).

Objetivos secundários: detectar defeitos cedo, manter 100% dos testes aprovados no pipeline e atingir cobertura de código de no mínimo 80% (meta própria de 90%).

### 1.2 Escopo

- **Dentro do plano:** MVP (RF01 a RF09), serviços de API, domínio compartilhado, serviço de PLN (voz e chatbot) e telas principais do app.
- **Fora do plano:** versão completa (RF10 a RF12), diagnóstico ou orientação médica, integração com sistemas oficiais, uso offline completo e IA generativa. Nada disso existe no escopo do produto.

### 1.3 Aviso de conteúdo

O app não substitui a caderneta oficial nem a orientação de profissionais de saúde. Os testes de conteúdo vacinal usam o calendário do PNI como dado versionado. Enquanto o dado oficial não for confirmado pelo autor, os testes usam um conjunto de exemplo marcado como `FICTITIOUS`.

## 2 Requisitos relevantes

A seleção parte do risco para o usuário e do impacto de uma falha. Os demais requisitos do MVP continuam sendo testados, mas com menos profundidade.

### 2.1 Requisitos funcionais

| ID | Requisito | Prioridade | Justificativa |
|---|---|---|---|
| RF04 | Registrar doses e ciclo de vida (5 estados) | Alta | Núcleo do produto; regras com muitas transições e datas. Funcionalidade escolhida para os testes de estados. |
| RF03 | Calendário vacinal por faixa etária (PNI) | Alta | Erro de idade ou de vacina passa informação errada à família (RNF10). |
| RF01 | Cadastro e login | Alta | Porta de entrada; falha compromete a segurança de todos os dados. |
| RF09 | Consentimento e exclusão de dados | Alta | Obrigação legal (LGPD); exclusão deve remover tudo. |
| RF02 | Membros da família (incluir, editar e excluir) | Média | Incluído por sugestão: concentra a verificação de propriedade dos dados (cada usuário só acessa os próprios membros). |
| RF05 | Lembretes e sinalização de doses atrasadas | Média | Incluído por sugestão: depende de tempo e é o gatilho de T4 e T7; exige relógio controlado nos testes. |
| RF06 | Busca semântica por voz | Média | Atende PE2 (idoso); depende de serviço externo e do limite de 3 s. |
| RF07 | Chatbot de intenções (TF-IDF e SVM) | Média | Respostas curadas; risco de resposta fora do escopo médico. |
| RF08 | Histórico de doses | Baixa | Leitura de dados já cobertos por RF04; testado de forma indireta. |

### 2.2 Requisitos não funcionais

| ID | Categoria | Como será verificado |
|---|---|---|
| RNF01 | Desempenho (90% das requisições em menos de 3 s) | Testes de carga leves e métricas do Application Insights |
| RNF02 | Segurança | Testes de autorização e entrada inválida; checklist OWASP Top 10; `npm audit` no pipeline |
| RNF03 | Privacidade e LGPD | Testes dos fluxos de consentimento e exclusão; revisão do modelo de dados (sem CPF nem CNS) |
| RNF04 | Usabilidade e acessibilidade (WCAG 2.1 AA) | Checklist nas telas principais: contraste, área de toque, fonte ampliável, rótulos |
| RNF07 | Testabilidade e qualidade | Relatório de cobertura do Jest no GitHub Actions |
| RNF10 | Integridade dos dados vacinais | Testes de conteúdo do calendário e das respostas do chatbot (fonte e aviso presentes) |

RNF05, RNF06, RNF08 e RNF09 são verificados por outros meios (alertas, pipeline de lint e build, subida em Docker e execução em emulador e navegador) e não geram casos de teste próprios neste plano.

## 3 Itens a testar

| Item | Camada | Requisitos | Nível de teste |
|---|---|---|---|
| Máquina de estados da dose | `packages/shared` (domínio puro) | RF04 | Unitário |
| Esquemas de validação (Zod) | `packages/shared` | RF01, RF02, RF04, RF09 | Unitário |
| Serviços e handlers da API | `apps/api` | RF01 a RF05, RF08, RF09 | Unitário e integração (Supertest) |
| Calendário vacinal (dados versionados) | `packages/shared` e API | RF03, RNF10 | Unitário e de conteúdo |
| Rotina de prazo (atraso) | `apps/api` | RF04, RF05 | Unitário com relógio controlado |
| Classificador de intenções e respostas | `apps/nlp` | RF07, RNF10 | pytest, com conjunto de teste separado |
| Busca por voz (transcrição e busca) | `apps/api` e `apps/nlp` | RF06 | Integração com cliente do Azure Speech simulado |
| Telas e fluxos do app | `apps/mobile` | RF01 a RF09, RNF04 | Testing Library e checklist de acessibilidade |
| Pipeline e contêiner | `.github/workflows`, Docker | RNF06, RNF07, RNF08 | Execução do próprio pipeline |

## 4 Estratégia de teste

### 4.1 Níveis e proporção

Pirâmide de testes: **muitos testes unitários** (domínio, serviços e validação), **alguns de integração** (API com Supertest; app com React Native Testing Library) e **poucos de ponta a ponta**, apenas nos fluxos críticos (cadastro, registrar dose, exclusão de conta). Os de ponta a ponta usam o **Playwright** sobre o app web, com uma API falsa, e incluem a verificação automática de acessibilidade com o **axe-core**; veja `ponta-a-ponta-e-acessibilidade.md`.

### 4.2 Técnicas

| Técnica | Onde se aplica | Observação |
|---|---|---|
| Caixa preta: **partição de equivalência e análise de valor limite** | Formulários e entradas da API (cadastro, membros, datas de dose) | 179 casos em `caixa-preta-casos.md` e tabela de execução em `caixa-preta-execucao.md` (SCRUM-28, feitos em 07/10/2026) |
| Cobertura de estados, de transições e de caminhos | Ciclo de vida da dose | 42 casos já escritos: CT-E (5), CT-T (12), CT-G (9), CT-I (9) e CT-C (7) |
| Teste de regressão (automatizado, seletivo, corretivo, progressivo e manual) | Todo o código | Estratégia na seção 4.5; a suíte inteira roda em cada push e PR |
| Caixa branca: cobertura de instruções, decisões, condições, caminhos e fluxo de dados | Funções críticas (máquina de estados, limitador de uso, filtro do Pix) | `caixa-branca.md`; cobertura medida pelo Jest com limite de 80% |
| Teste exploratório com charters e HICCUPPS | Fluxos de dose, assistente, conta e layout | `testes-exploratorios.md`; sessões ao fim de cada sprint (seção 4.5) |
| Teste de autorização | API | Para todo recurso: usuário A não acessa dado do usuário B |
| Teste de conteúdo | Calendário e chatbot | Fonte, versão e aviso presentes; resposta padrão quando a confiança é baixa |
| Teste de desempenho leve | API | Verifica o RNF01 sem ferramenta pesada |
| Inspeção de acessibilidade | Telas principais | Checklist WCAG 2.1 AA e verificação automática com axe-core (`ponta-a-ponta-e-acessibilidade.md`) |

### 4.3 Princípios

- Testes unitários **sem rede e sem Azure real**; clientes de SDK simulados.
- **Relógio injetável:** nada de `new Date()` em regra de negócio; datas e rotina de atraso (T4 e T7) testadas com relógio controlado.
- Testes **determinísticos**, sem dependência de ordem, hora real ou aleatoriedade sem semente.
- Testar também caminhos de erro e valores limite, não só o caminho feliz.
- **Rastreabilidade:** o nome do teste automatizado inclui o ID do caso (por exemplo, `CT-T04`).
- Dados de teste **fictícios**; nunca dados pessoais reais, nem em exemplos ou logs.

### 4.4 Gestão de defeitos

Defeitos são registrados como issues do tipo "Defeito" no GitHub Projects (projeto proj-vacina-em-dia, que substituiu o Jira em 10/10/2026), ligadas ao teste que os achou, com passos para reproduzir, resultado esperado e obtido, e severidade (crítica, alta, média ou baixa). Cada correção entra com um teste que a reproduz.

### 4.5 Estratégia de regressão e testes exploratórios

Regressão é reexecutar testes depois de uma mudança para provar que o que funcionava continua funcionando. Os tipos abaixo seguem o material da aula "Testes de regressão e exploratórios":

| Tipo | Como aparece no projeto |
|---|---|
| **Automatizada / total** | O CI roda a suíte inteira em todo push e PR: lint, formatação, tipos, build, Jest com cobertura (shared, API e app), pytest do PLN, Playwright com axe-core, TypeDoc e fumaça no Docker. Hoje não há seleção de testes: a suíte inteira roda sempre. |
| **Parcial / seletiva** | Durante o desenvolvimento, só o pacote ou o arquivo alterado (`npm test --workspace <pacote>` ou `npx jest <arquivo>`); a suíte inteira fica para o CI. |
| **Incremental** | PRs pequenos, um item por vez (CLAUDE.md §15); cada PR acrescenta os testes do próprio item e roda tudo. |
| **Unitária com regressão** | Domínio puro (`packages/shared`): a matriz de transições da dose, o calendário e os lembretes têm testes que falham se uma regra mudar. |
| **Corretiva** | Toda correção de defeito entra com um teste que a reproduz (seção 4.4). |
| **Progressiva** | Quando uma funcionalidade é reescrita, os testes antigos são substituídos, não remendados. Exemplo: no B61 o assistente passou de 20 para 39 intenções, o conjunto de teste foi refeito e o limiar de confiança mudou de 0,40 para 0,30, com a avaliação registrada em `avaliacao-chatbot.md`. |
| **Manual** | Aspectos visuais, de acessibilidade com leitor de tela e de aparelho físico, que a automação não cobre bem. Entram nas sessões exploratórias (charter CH-04) e no item B40, ainda pendente. |

**Análise de impacto (o que rodar quando algo muda).** A regra prática, em ordem de alcance:

| Mudou em | Pode afetar | Rodar, no mínimo |
|---|---|---|
| `packages/shared` (esquemas, domínio, calendário) | API, app e PLN (contratos) | Tudo (o CI já faz) |
| `apps/api` | Rotas, serviços, PDF, lembretes | Jest da API; fumaça no Docker |
| `apps/mobile` | Telas e fluxos | Jest do app; Playwright e axe |
| `apps/nlp` (intenções, respostas, entidades) | Assistente na API e no app | pytest do PLN; testes do assistente na API e no app (o campo `entities` é contrato do `packages/shared`) |
| `infra/` (Bicep) | Recursos Azure | Fluxo `infra.yml` |
| Dados do calendário vacinal | Doses geradas, PDF, painel | `CT-CAL-*`, `CT-G*`, `CT-PDF-*` |

A matriz requisito → tela → rota → teste está em `docs/19-rastreabilidade.md` e serve de apoio a essa análise.

**Pipeline ideal da aula, e onde estamos:**

1. Regressão automatizada a cada PR ou build: **feito** (CI).
2. Sessões exploratórias ao fim de cada sprint e em pontos críticos: **definidas** em `testes-exploratorios.md`; a execução é do autor.
3. Monitoramento depois da publicação: Application Insights ligado à Function App; painéis e alertas ainda **pendentes** (RNF05).

### 4.6 Ambientes de teste

Um ambiente de teste é uma configuração controlada de hardware, software, dados e rede onde o sistema é validado antes de chegar ao usuário real. Mapeamento do material da aula para o projeto:

| Ambiente da aula | No projeto | Quem usa | Observação |
|---|---|---|---|
| **DEV** | Máquina do autor: `npm run dev:api`, `npm run dev:mobile`, Azurite local | Desenvolvimento | Testes unitários e de integração sem rede e sem Azure real |
| **QA / Teste** | Máquina virtual limpa do GitHub Actions (Ubuntu) e `docker compose up` (API, PLN, web e Azurite) | CI e o autor | Playwright contra o app web com API falsa; fumaça no Docker contra a API real em contêiner |
| **Homologação (UAT)** | **Não existe.** Não há ambiente separado da produção | (cliente) | Criar um exigiria recursos Azure adicionais (custo), a aprovar com o autor. A demonstração e as sessões exploratórias fazem esse papel, com contas de teste |
| **PROD** | Azure: Function App da API e do PLN, Static Web Apps, Azure SQL, em Brazil South | Usuários finais | Só verificação manual dos serviços reais (voz, e-mail, SQL) |

**Boas práticas da aula e situação:**

| Prática | Situação |
|---|---|
| Isolar os ambientes | Cada execução do CI usa uma máquina nova; DEV e PROD não compartilham banco |
| Versionar dados e configurações | `.env.example` sem valores reais, `docs/tech-versions.md`, calendário vacinal versionado com fonte e data, Bicep em `infra/` |
| Dados de teste anônimos | Só dados fictícios; o conjunto de intenções do chatbot não tem dado pessoal (plano §4.3) |
| Monitorar logs e métricas | Application Insights; logs sem nome, e-mail ou texto de mensagem; relatórios de cobertura e do Playwright guardados como artefatos no CI |
| Automatizar a criação de ambientes | Docker Compose para o ambiente local e de CI; Bicep (`infra/`) para a Azure, validado pelo `infra.yml` |

## 5 Critérios de entrada e saída

### 5.1 Entrada (para começar a testar um item)

- Requisito e critérios de aceite do item no backlog (GitHub Projects) definidos.
- Casos de teste escritos (ou, no caso de domínio com regra clara, testes escritos antes do código).
- Código do item em uma branch, compilando, com `lint` e `typecheck` limpos.
- Ambiente de teste disponível (local ou contêiner) e dados fictícios prontos.

### 5.2 Saída (para considerar o teste concluído)

- **100% dos testes automatizados aprovados** no pipeline.
- **Cobertura de linhas e ramos de no mínimo 80%**, com o limite configurado no Jest para falhar o pipeline abaixo disso; meta própria de 90%.
- Todos os casos planejados do item executados e registrados na tabela de execução.
- Nenhum defeito crítico ou de severidade alta aberto.
- `npm audit` sem vulnerabilidade alta ou crítica não tratada.
- Checklist de acessibilidade concluído nas telas afetadas.

### 5.3 Suspensão e retomada

Os testes de um item são suspensos se o ambiente cair, se o pipeline estiver quebrado por motivo externo ao item, ou se um defeito crítico impedir a execução. Retomam quando a causa for resolvida.

## 6 Recursos necessários

| Tipo | Recurso |
|---|---|
| Ferramentas de teste | Jest, Supertest, React Native Testing Library, pytest, fake timers do Jest |
| Qualidade e automação | ESLint, Prettier, TypeScript estrito, GitHub Actions, TypeDoc |
| Ambientes | Máquina local; contêineres Docker com Azurite; pipeline no GitHub Actions; Azure só para verificação manual dos serviços reais |
| Dados | Calendário de exemplo `FICTITIOUS` e conjunto de intenções criado e revisado manualmente, sem dados pessoais |
| Dispositivos | Navegador, emulador Android e simulador iOS (RNF09) |
| Rastreamento | GitHub Projects (casos de teste, plano e execuções como issues; ver `gestao-de-testes-github.md`) e este repositório |
| Pessoas | Equipe de cinco pessoas; a divisão dos papéis entre elas é definida pelo grupo (ver seção 8) |

## 7 Cronograma estimado

As horas abaixo são **estimativas de planejamento**, não registros de horas trabalhadas. Os registros reais ficam na Documentação de Desenvolvimento (o Jira não é mais usado).

| Sprint | Período | Item | Atividade de teste | Estimativa |
|---|---|---|---|---|
| 1 | 06/10 a 12/10 | SCRUM-27 | Plano de teste, requisitos e papéis (este documento) | 6 h |
| 1 | 06/10 a 12/10 | SCRUM-29 | UML de estados e 42 casos de teste da dose | 8 h |
| 2 | 13/10 a 19/10 | SCRUM-24 | Pipeline no GitHub Actions com testes a cada push | 6 h |
| 3 | 20/10 a 26/10 | SCRUM-28 | Teste de caixa preta (partição e valor limite): casos e tabela de execução | 8 h |
| 4 | 27/10 a 02/11 | SCRUM-30 | Automação dos casos em Jest e cobertura de no mínimo 80% | 14 h |
| 5 | 03/11 a 09/11 | (folga) | Execução completa, correções e preenchimento da tabela de execução | 8 h |
| 6 | 10/11 a 12/11 | Entrega | Revisão final, conversão para Word (ABNT) e PDF, entrega de 12/11 | 4 h |

Marcos: plano e casos de estados prontos até 12/10; pipeline verde até 19/10; caixa preta até 26/10; automação e cobertura até 02/11; entrega em 12/11.

**Risco de cronograma:** a automação (SCRUM-30) termina em 02/11 e só a Sprint 5 serve de folga. O atraso em qualquer item anterior consome essa folga. A entrega de PLN (16/11) também depende da mesma pessoa.

## 8 Papéis do processo de teste

O projeto é feito por uma **equipe de cinco pessoas** (nomes e RAs em `docs/09-documentacao-de-desenvolvimento.md`). Os papéis abaixo são funções do ciclo de teste: uma pessoa pode acumular mais de um e um papel pode ser dividido. **A atribuição de cada papel não está registrada neste repositório; o grupo preenche a coluna "Responsável".**

| Papel | Responsabilidade | Quando atua | Responsável |
|---|---|---|---|
| Gerente de teste | Planeja, define critérios, acompanha cronograma e riscos | Início de cada sprint e na reunião de encerramento | [a definir] |
| Analista de teste | Interpreta requisitos e define o que testar | Antes de implementar o item | [a definir] |
| Projetista de casos | Escreve casos de teste e dados de entrada | Antes e durante a implementação | [a definir] |
| Automatizador | Escreve e mantém os testes em Jest e pytest | Durante a implementação | [a definir] |
| Executor | Roda os testes, registra resultados e abre defeitos | Depois da implementação e a cada push | [a definir] |
| Responsável pelo ambiente | Mantém pipeline, Docker e dados de teste | Sob demanda | [a definir] |

**Como reduzir o risco de um só olhar:** quando o mesmo código é escrito e testado pela mesma pessoa, falta um segundo par de olhos. Para reduzir o risco:

- o **pipeline é o executor independente**: nenhum item é concluído sem pipeline verde, mesmo que "funcione na minha máquina";
- os testes dos casos claros são escritos **antes** do código (domínio e máquina de estados), para não ajustar o teste ao que o código já faz;
- cada item passa por uma **autorrevisão em outro momento** (no dia seguinte, quando possível), com checklist da definição de pronto, antes do PR;
- o orientador valida o plano e os casos na reunião de encerramento da sprint.

## 9 Riscos do processo de teste

| Risco | Impacto | Mitigação |
|---|---|---|
| Dado oficial do PNI ainda não confirmado | Testes de calendário sem base real | Conjunto `FICTITIOUS` marcado; trocar pelos dados oficiais quando o autor confirmar |
| Pouco tempo de folga antes de 12/11 | Cobertura abaixo de 80% | Testes junto com o código; cobertura medida em cada PR |
| Serviço Azure indisponível ou com custo | Testes de integração presos à nuvem | Clientes simulados; Azure só em verificação manual |
| Python fora da meta de cobertura (a confirmar com o professor) | Dúvida sobre o que conta | O Jest cobre a parte TypeScript; o pytest do serviço Python entra na meta somente se o professor confirmar |
| Autor testando o próprio código | Vieses e defeitos não percebidos | Pipeline independente, testes antes do código e autorrevisão com checklist |

## 10 Rastreabilidade

| Requisito | Casos de teste | Situação |
|---|---|---|
| RF04 | CT-E01 a CT-E05, CT-T01 a CT-T12, CT-G01 a CT-G09, CT-I01 a CT-I09, CT-C01 a CT-C07 (42 casos) | Escritos (SCRUM-29) |
| RF01, RF02, RF03, RF05, RF06, RF07, RF08, RF09 | A criar na técnica de caixa preta | A fazer (SCRUM-28) |
| RNF01 a RNF04, RNF07, RNF10 | Casos derivados da seção 4.2 | A fazer (SCRUM-28 e SCRUM-30) |

## 11 Referências

- Enunciado de Qualidade e Testes de Software, 1ª e 2ª entregas (`docs/referencias-disciplinas/qualidade-e-testes_entregas.pdf`).
- `docs/02-requisitos.md`, `docs/03-uml/estados-dose.md` e `docs/07-testes/casos-teste-estados-dose.md`.
- Brasil. Lei nº 13.709, de 14 de agosto de 2018 (LGPD).
- World Wide Web Consortium. *Web Content Accessibility Guidelines (WCAG) 2.1*, 2018.
