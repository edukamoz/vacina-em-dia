# CLAUDE.md: Vacina em Dia

Este arquivo é lido a cada sessão. Siga-o à risca. Quando algo aqui conflitar com um pedido pontual, avise o autor antes de agir. Quando faltar informação, pergunte; não invente.

## 1. Visão do projeto

**Vacina em Dia** (título de trabalho: *Carteira de Vacinação Digital com Lembretes e Assistente por Voz*) é um aplicativo multiplataforma (Android, iOS e web) para famílias organizarem o calendário vacinal de seus membros, registrarem doses, receberem lembretes e tirarem dúvidas por **busca por voz** e por um **chatbot** de intenções. Roda inteiramente na **Microsoft Azure**.

- **Contexto acadêmico:** Projeto Interdisciplinar VI (PI-VI), Fatec Votorantim, Curso de Desenvolvimento de Software Multiplataforma. Disciplina-chave: Laboratório de Desenvolvimento Multiplataforma. Satélites: Computação em Nuvem II, Processamento de Linguagem Natural, Qualidade e Testes de Software. Orientador: Prof. Dr. Cassio R. F. Riedo.
- **Equipe:** uma pessoa (o autor, Eduardo Kamo Iguei). Você atua como par de programação; as decisões são do autor.
- **ODS atendidos:** 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades); o 11 apenas na versão completa (mapa de unidades de saúde).
- **Problemas atacados:** doses esquecidas ou atrasadas, caderneta de papel perdida, dúvida sobre o que é indicado por idade e barreiras de acesso (idosos, baixa familiaridade digital).
- **Personas:** PE1 Mariana (mãe, 32), PE2 Sr. José (idoso, 68, usa voz) e PE3 Carla (cuidadora de vários familiares, 45).

### Datas (fixas)

| Data | Entrega |
|---|---|
| 12/11 | Qualidade e Testes: plano de teste, caixa preta, UML de estados, pipeline no GitHub, Jest |
| 16/11 | PLN: busca por voz e chatbot (TF-IDF + SVM) |
| 19/11 | Entrega total (Laboratório): projeto na Azure, Docker, 3 documentações (Word durante o desenvolvimento, PDF na entrega), panfleto, zip, apresentação |

A data de Computação em Nuvem II ainda será confirmada.

## 2. Leia antes de codar

Consulte sempre estes arquivos antes de implementar algo (se não existirem, avise):

- `docs/00-handoff.md`: estado atual do projeto, Jira, sprints, pendências e próximos passos.
- `docs/referencias-disciplinas/`: PDFs da faculdade (PI-VI, modelos das 3 documentações, exigências de Qualidade e Testes e de PLN). São somente leitura e definem o que é cobrado.
- `docs/01-visao-e-escopo.md` e `docs/02-requisitos.md`: requisitos RF01 a RF12 e RNF01 a RNF10.
- `docs/03-uml/`: diagramas (estados da dose em `estados-dose.md`).
- `docs/04-design-system.md`: tokens, componentes, acessibilidade.
- `docs/05-adrs/`: decisões técnicas. Nova decisão relevante exige novo ADR.
- `docs/06-seguranca-e-lgpd.md`: regras de privacidade e segurança.
- `docs/07-testes/`: plano de teste e casos de teste (IDs `CT-...`).

## 3. Escopo

- **MVP (RF01 a RF09):** cadastro e login; membros da família; calendário vacinal por faixa etária; registro de doses e ciclo de vida; lembretes; busca por voz; chatbot; histórico; consentimento e exclusão de dados.
- **Versão completa (RF10 a RF12):** mapa de UBS, exportar PDF e compartilhar com cuidador. **Só se o cronograma permitir.** Não comece sem pedido explícito.
- **Fora do escopo:** diagnóstico ou orientação médica individual; substituir a caderneta oficial; integração com sistemas oficiais de registro; agendamento em unidades; IA generativa; uso offline completo.
- **Não adicione funcionalidade, dependência ou serviço Azure fora do escopo sem aprovar com o autor.**

## 4. Stack

| Camada | Tecnologia |
|---|---|
| App | React Native com **Expo**, **NativeWind**, **Expo Router**, TypeScript |
| Estado | **Context API** (sessão e tema) + **TanStack Query** (dados do servidor); ver §14 |
| API | **Azure Functions** (Node.js + TypeScript), **sem Express** |
| PLN | Azure Function em **Python** (scikit-learn, TF-IDF + SVM); voz com **Azure AI Speech** |
| Banco | **Azure SQL Database** |
| Identidade | **Microsoft Entra External ID** (ver §14) |
| Segredos | **Azure Key Vault** (acesso por identidade gerenciada) |
| Observabilidade | **Application Insights** |
| Validação | **Zod**, compartilhado entre app e API |
| Testes | **Jest** (+ Supertest na API, React Native Testing Library no app); **pytest** no serviço Python |
| Qualidade | ESLint, Prettier, Husky, commitlint, TypeScript **strict** |
| Docs de código | **TSDoc** + **TypeDoc** |
| Docs da API | **OpenAPI 3.1** gerado dos esquemas Zod (`@asteasolutions/zod-to-openapi`) + **Swagger UI** em `/api/docs`; ver ADR-012 |
| CI/CD | **GitHub Actions** |
| Contêineres | **Docker** (com Azurite para armazenamento local das Functions) |
| Gerenciador | **npm** com workspaces |

**Versões:** use as versões estáveis atuais, fixe-as nos `package.json` e no `pyproject`/`requirements` e **registre a versão exata de cada tecnologia em `docs/tech-versions.md`** (a Documentação Técnica exige versões). Não use versões de memória: confira no registro (`npm view`, `pip index`) ou na documentação oficial.

## 5. Estrutura do repositório (monorepo único)

```
vacina-em-dia/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── .github/workflows/ci.yml
├── doctos/                  # técnica, desenvolvimento, usuário (.docx; PDF só na entrega) + panfleto A4
├── docs/                    # fonte em Markdown (visão, requisitos, UML, ADRs, testes...)
├── apps/
│   ├── mobile/              # Expo (Android, iOS e web)
│   ├── api/                 # Azure Functions (TypeScript)
│   └── nlp/                 # Azure Function (Python): chatbot e classificação de intenções
└── packages/
    └── shared/              # tipos, esquemas Zod e domínio puro (máquina de estados da dose)
```

O `apps/nlp` é Python e **não** é workspace npm; tem ambiente e testes próprios. Tudo em um único repositório porque o autor é uma pessoa só, os tipos são compartilhados, um único pipeline cobre tudo e a entrega final exige uma pasta `doctos/` na raiz e um zip do repositório.

## 6. Comandos

Estes nomes são o contrato; crie os scripts com eles no setup (SCRUM-23) e mantenha-os estáveis:

```bash
npm install                 # instala todos os workspaces
npm run dev:mobile          # Expo (app)
npm run dev:api             # Functions locais (+ Azurite)
npm run lint                # ESLint
npm run format              # Prettier
npm run typecheck           # tsc --noEmit em todos os workspaces
npm test                    # Jest (todos os workspaces)
npm run test:coverage       # Jest com cobertura; falha abaixo do limite
npm run docs                # TypeDoc
docker compose up --build   # sobe API, app web, Azurite (e PLN quando existir)
# nlp: dentro de apps/nlp -> pytest
```

## 7. Convenções de código

- **TypeScript strict**, sem `any` (use `unknown` e estreite o tipo); sem `@ts-ignore` sem comentário justificando.
- **Idioma:** identificadores de código em **inglês**; comentários TSDoc, mensagens de commit, textos de interface e documentação em **português do Brasil**.
- **TSDoc** em todo símbolo exportado (funções, tipos, classes, módulos), explicando o quê, parâmetros, retorno e erros. É o que o TypeDoc publica.
- **Camadas na API:** `handlers` (HTTP, finos) → `services` (casos de uso) → `domain` (regras puras) → `repositories` (acesso a dados). Regras de negócio nunca ficam no handler.
- **Validação nas bordas:** toda entrada externa (HTTP, formulário, resposta de serviço externo) passa por esquema Zod do `packages/shared`.
- **Documentação da API (Swagger):** todo endpoint novo ou alterado é registrado na especificação OpenAPI da API, com os **mesmos esquemas Zod** da validação, descrição em português, exemplos e todos os códigos de resposta (inclusive erros 401, 403, 404, 409, 422 e 429). A especificação sai em `GET /api/openapi.json` e a interface Swagger UI em `GET /api/docs`. Endpoint sem registro na especificação não está pronto. Não escreva a documentação à mão em outro lugar.
- **Erros:** tipos de erro de domínio explícitos, mapeados para códigos HTTP em um único ponto. Nunca engula exceção; nunca devolva mensagem interna ao cliente.
- **Funções pequenas e puras** sempre que possível; injete dependências (relógio, repositórios, clientes Azure) para testar sem rede.
- **Data e hora:** nunca chame `new Date()` dentro de regra de negócio; receba o "agora" por parâmetro ou por um relógio injetável.
- **UI:** componentes do design system (`docs/04-design-system.md`); acessibilidade desde o início (contraste e áreas de toque WCAG 2.1 AA, fonte ampliável, rótulos de acessibilidade, linguagem simples). O público inclui idosos.
- **Nomes de arquivo:** `kebab-case`; componentes React em `PascalCase`.
- Sem comentários óbvios; comente o *porquê*.

## 8. Domínio: ciclo de vida da dose (RF04)

Fonte: `docs/03-uml/estados-dose.md`. A máquina de estados vive em `packages/shared` como **função pura** (`estado + evento + hoje` resulta em novo estado ou erro).

| Estado (código) | Rótulo na interface | Final? |
|---|---|---|
| `PENDING` | Pendente | não |
| `SCHEDULED` | Agendada | não |
| `OVERDUE` | Atrasada | não |
| `APPLIED` | Aplicada | sim |
| `CANCELLED` | Cancelada | sim |

Transições válidas: T1 inicial→Pendente; T2 Pendente→Agendada; T3 Pendente→Aplicada; T4 Pendente→Atrasada (prazo vencido); T5 Pendente→Cancelada; T6 Agendada→Aplicada; T7 Agendada→Atrasada (agendamento vencido); T8 Agendada→Pendente; T9 Agendada→Cancelada; T10 Atrasada→Agendada; T11 Atrasada→Aplicada; T12 Atrasada→Cancelada.

Regras: agendar exige data ≥ hoje; aplicar exige data ≤ hoje; reagendar exige data ≥ hoje; cancelar exige confirmação; **atrasar (T4 e T7) só pela rotina de prazo** (gatilho por tempo), nunca pelo cliente; uma dose vencida só pode ser reagendada, aplicada ou cancelada; qualquer outra transição é rejeitada com erro de transição (HTTP 409) e o estado permanece.

### Calendário vacinal (crítico)

- A fonte é o calendário oficial do **PNI (Ministério da Saúde)**, guardado como **dados versionados** com fonte e data/versão.
- **Nunca preencha vacinas, idades ou intervalos de memória.** Os dados do calendário devem vir de uma fonte oficial fornecida ou confirmada pelo autor. Se não houver dado confirmado, use um conjunto de exemplo claramente marcado como `FICTITIOUS` e avise o autor.
- Toda tela e resposta com conteúdo vacinal indica a fonte e a versão, e avisa que **o app não substitui a caderneta oficial nem a orientação de profissionais de saúde**.

## 9. PLN: voz e chatbot (RF06 e RF07)

- **Voz:** Azure AI Speech transcreve; a transcrição alimenta uma busca semântica sobre vacinas e calendário. Resultado em até 3 s para 90% das requisições. Falha de reconhecimento mostra mensagem clara e permite digitar. Use a API de áudio do Expo vigente (confira a documentação) e trate as diferenças entre mobile e web.
- **Chatbot:** baseado em **regras + classificação de intenções com TF-IDF + SVM** (scikit-learn). **Sem IA generativa.** Respostas **curadas**, com fonte oficial citada.
- Dataset de intenções criado e revisado manualmente, com exemplos por intenção; avaliação documentada (acurácia, F1; meta de F1 ≥ 0,85, a validar) com conjunto de teste separado.
- **Confiança baixa** (abaixo de um limiar documentado) devolve resposta padrão que orienta procurar um profissional ou uma unidade de saúde. O chatbot **nunca** dá orientação médica individual, doses de medicamento ou diagnóstico.
- Dados de treino não contêm dados pessoais reais.

## 10. Segurança e LGPD (regras duras)

Dados de vacinação são dados pessoais sobre saúde, portanto **sensíveis** (LGPD, Lei 13.709/2018).

- **Não colete CPF nem Cartão Nacional de Saúde.** Colete o mínimo: nome (ou apelido), data de nascimento e, opcional, grupo específico (como gestante).
- **Consentimento explícito** no primeiro acesso, em linguagem simples, registrado. Dados de crianças e adolescentes exigem consentimento de responsável.
- **Exclusão de conta** remove todos os dados do usuário e dos membros (e compartilhamentos, se existirem).
- **Segredos nunca no repositório** (nem em histórico, testes, exemplos ou logs). Use Key Vault; mantenha um `.env.example` sem valores reais; `.env` no `.gitignore`.
- **Logs sem dados pessoais** (sem nome, data de nascimento, e-mail ou conteúdo de mensagem). Use identificadores opacos.
- HTTPS em todo tráfego; CORS restrito; cabeçalhos de segurança; **limitação de taxa** nos endpoints sensíveis (login, voz, chatbot); mecanismo a definir em ADR.
- Cada usuário só acessa os próprios dados; **verifique a propriedade em todo acesso** (não confie em IDs vindos do cliente).
- Token de sessão no app em armazenamento seguro (`expo-secure-store`). **Atenção:** esse módulo não funciona na web; defina em ADR a estratégia para a web antes de implementar o login.
- Rodar `npm audit` no CI; não adicionar dependência sem necessidade.
- Entradas validadas com Zod; consultas parametrizadas (sem concatenar SQL).

## 11. Testes e qualidade

- **Meta:** 100% dos testes passando no pipeline; cobertura **mínima exigida de 80%**, **meta própria de 90%**. Configure o limite no Jest para **falhar o pipeline abaixo de 80%** (e acompanhe os 90%).
- Pirâmide: muitos testes unitários (domínio, serviços, validação), alguns de integração (API com Supertest; app com Testing Library) e poucos de ponta a ponta.
- **Rastreabilidade:** o nome do teste inclui o ID do caso (por exemplo, `CT-T04`). Casos de estados, transições, guardas, inválidas e caminhos estão em `docs/07-testes/casos-teste-estados-dose.md` (42 casos); a automação deve cobri-los.
- Use `test.each` para a matriz de transições. Controle o relógio (fake timers) para T4, T7 e limites de data.
- Testes unitários **sem rede e sem Azure real**; mocke clientes de SDK.
- Teste também os caminhos de erro e os valores limite, não só o caminho feliz.
- Testes devem ser determinísticos (sem dependência de ordem, hora real ou aleatoriedade sem semente).
- O serviço Python usa pytest. **Em aberto:** confirmar com o professor se o código Python entra na meta de cobertura (a disciplina cita Jest).

## 12. Git, CI e Jira

- **Branches:** `feature/SCRUM-<n>-descricao-curta`, `fix/SCRUM-<n>-...`, `docs/SCRUM-<n>-...`.
- **Commits** (Conventional Commits, em português): `feat(api): registrar aplicação de dose (SCRUM-18)`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
- Um commit por mudança lógica; PRs pequenos referenciando a chave do Jira.
- **CI (GitHub Actions)** em todo push e PR: instalar, lint, typecheck, build, testes com cobertura, TypeDoc e `npm audit`. O pipeline deve falhar se algum teste falhar ou a cobertura ficar abaixo do limite.
- **Jira (projeto SCRUM)** segue a convenção exigida pelo professor:
  - **A fazer:** item ainda a planejar (reunião inicial da sprint).
  - **Em andamento:** a sprint foi iniciada e o item está sendo feito.
  - **Em análise:** o item foi finalizado, mas ainda estamos dentro da data da sprint.
  - **Concluído:** só depois de analisado e confirmado na reunião de encerramento da sprint.
  - **Você nunca marca um item como Concluído.** Pode sugerir "Em análise" quando terminar; quem decide é o autor.
- Backlog: épicos SCRUM-5 a SCRUM-12; trabalhe **um item por vez**, na ordem da sprint ativa.

## 13. Documentação e entregas

- **Três documentações** em `doctos/`, **editadas em Word (`.docx`) durante o desenvolvimento**, formatadas fielmente pela norma ABNT e atualizadas junto com o projeto. **A entrega é em PDF**, convertido do Word apenas no momento da entrega (não versione PDF intermediário). Conteúdo: Técnica (modelo do PI-VI, com tecnologias e versões, DER, APIs, serviços Azure, custos, testes, PLN, riscos), de Desenvolvimento (horas, atividades, reuniões e aprendizados, Scrum) e do Usuário (linguagem simples, passo a passo, FAQ). Mais o **panfleto A4**.
- **Nunca invente horas, datas de reunião ou atividades** na Documentação de Desenvolvimento: tempos e registros são do autor. Você pode preparar o texto e o formato, deixando os valores para ele preencher.
- Mantenha a documentação **atualizada junto com o código**: mudou comportamento, mudou doc e, se for decisão, ADR.
- Referências em ABNT; a Fase 0 já existe em Word (`docs/Fase0_Documento_de_Visao_e_Escopo.docx`) e em Markdown (`docs/01-visao-e-escopo.md`).
- Estimativa de custo mensal na Azure vai na Documentação Técnica (calculadora de preços da Azure).
- **Docker:** o projeto precisa subir em contêiner (`docker compose up`).

## 14. Decisões em aberto (não assuma)

Decididas em 06/10/2026 (ver `docs/05-adrs/`):

- **Entra External ID** (ADR-005): aceito; 50.000 usuários ativos por mês gratuitos. Pendente no SCRUM-22: criar o tenant externo (o diretório é do Centro Paula Souza) e tratar a ausência de região no Brasil na política de privacidade.
- **Azure SQL** (ADR-004): aceito, na oferta gratuita (a assinatura Azure for Students é compatível), região Brazil South, pausa automática ao esgotar a franquia.
- **Context API + TanStack Query** (ADR-006): aceito.
- **Token na web** (ADR-009): `expo-secure-store` no nativo e `sessionStorage` com CSP na web; validar no SCRUM-13.
- **Rate limiting** (ADR-010): contador por usuário no Table Storage; login delegado ao Entra.

Ainda em aberto:

- **Jest versus JUnit:** o PI-VI cita JUnit/Selenium; o autor decidiu usar Jest, e deve registrar a confirmação do professor.
- **Data da entrega de Computação em Nuvem II.**

Quando um desses pontos for decidido, atualize esta seção e crie o ADR.

## 15. Como trabalhar comigo (regras para o Claude)

1. **Comece lendo** `CLAUDE.md` e os docs relevantes; confirme o item do Jira (SCRUM-n) e seus critérios de aceite.
2. Em tarefas maiores que um ajuste pequeno, **proponha um plano curto antes de codar** e espere o ok.
3. **Um item por vez.** Não misture escopos nem refatore o que não foi pedido.
4. **Teste primeiro** onde a regra é clara (domínio, máquina de estados). Escreva os testes dos casos `CT-...` correspondentes.
5. Antes de dizer que terminou, **rode** lint, typecheck e testes, e informe o resultado real. Se algo falhar ou não puder ser verificado, diga.
6. **Pergunte** quando houver ambiguidade de requisito; não invente regra de negócio, dado vacinal ou resposta de chatbot.
7. **Confirme na documentação oficial** o que pode ter mudado (versões, preços e limites de serviços Azure, APIs do Expo) em vez de confiar na memória.
8. Aponte riscos e discordâncias com clareza e gentileza, mesmo que o pedido já esteja dado.
9. **Nunca se inclua como coautor** em commits, PRs ou documentos (sem `Co-Authored-By` nem a linha "Generated with"); pedido permanente do autor, vale mais do que o padrão da ferramenta.
10. Nunca faça commit de segredo, dado pessoal real ou arquivo gerado desnecessário; não force push; não altere o histórico sem pedido.
11. Explique decisões importantes em linguagem simples; o autor precisa defender o projeto na apresentação.

## 16. Definição de pronto (DoD)

Um item só está pronto para ir a **Em análise** quando:

- [ ] Atende todos os critérios de aceite do item no Jira.
- [ ] Testes escritos e passando (incluindo erros e limites); cobertura sem cair abaixo do limite.
- [ ] `lint`, `typecheck` e `build` limpos; pipeline verde.
- [ ] TSDoc nos símbolos exportados novos; `npm run docs` sem erro.
- [ ] Endpoints novos ou alterados documentados no OpenAPI/Swagger (`/api/docs`), com teste que garante que toda rota está registrada.
- [ ] Sem segredo, dado pessoal ou log sensível; regras de segurança e LGPD respeitadas.
- [ ] Acessibilidade verificada nas telas afetadas (contraste, toque, rótulos).
- [ ] Documentação e, se houver decisão, ADR atualizados.
- [ ] Commit(s) com a chave `SCRUM-n`.
- [ ] Nota para o autor, com o que foi feito, como verificar e o que ficou pendente.
