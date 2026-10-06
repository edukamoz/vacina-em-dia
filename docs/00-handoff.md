# Passagem de contexto: do chat para o Claude Code

Estado em **06/10/2026** (terça-feira). Este arquivo resume o que foi decidido e produzido no chat de planejamento, para que uma sessão nova do Claude Code continue do ponto certo. Leia junto com `CLAUDE.md`. Em caso de conflito, `CLAUDE.md` e os ADRs valem mais do que este resumo.

## 0. Estado da última sessão (leia primeiro; atualize ao pausar)

Este arquivo é o canal de continuidade entre computadores e sessões. A memória local do Claude **não** sincroniza entre máquinas; só o que está commitado e enviado ao GitHub (`origin`) chega ao outro computador.

**Última atualização:** 06/10/2026, computador do trabalho/faculdade.

**Feito:**
- Commit inicial na `main` (`0f64b2c`): `CLAUDE.md`, `README.md`, `.gitignore`, `LICENSE` e `docs/` (sem os PDFs de referência).
- Branch `docs/SCRUM-5-claude-md-word-e-pdf`: `CLAUDE.md` atualizado com a regra "Word (ABNT) durante o desenvolvimento, PDF só na entrega".
- Jira SCRUM-5: comentário com o commit e worklog de 2h 17m lançados. Status **não** alterado.

**Atualização de 06/10/2026 (SCRUM-31, UML e DER):**
- Branch `docs/SCRUM-31-uml-der` com casos de uso, classes, 3 sequências (login, registrar dose, lembrete), arquitetura, DER e dicionário de dados em `docs/03-uml/`. Todos os diagramas Mermaid foram validados e renderizados com o `@mermaid-js/mermaid-cli` (instalado só na pasta temporária da sessão, fora do projeto; reinstalar com `npm install @mermaid-js/mermaid-cli` num diretório de scratch se precisar validar de novo). PNGs não foram versionados; gerar na hora de montar os Word (SCRUM-34).
- Decisões de modelagem adotadas por padrão (autor delegou): lembrete por push do Expo + sinalização no app (sem e-mail); doses gravadas no banco ao cadastrar o membro; só a data de aplicação (sem lote e local); tabela de eventos da dose; exclusão em cascata; consentimento com versão do termo e declaração de responsável para menores.
- **Pendências do autor:** fornecer ou confirmar os dados oficiais do calendário do PNI (até lá, o seed é `FICTITIOUS`); validar a antecedência dos lembretes e a lista de grupos específicos.

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
- **Ainda não existe código.** O repositório acabou de ser criado.
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

**Já existem:** ADRs (`docs/05-adrs/`), plano de teste (`docs/07-testes/plano-de-teste.md`), UML, DER e dicionário de dados (`docs/03-uml/`). **Ainda não existem:** `docs/04-design-system.md`, `docs/06-seguranca-e-lgpd.md`, `docs/tech-versions.md`.

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

## 4. Próximos passos (ordem sugerida, Sprint 1)

1. Colocar este pacote no repositório e fazer o commit inicial (documentação apenas).
2. **SCRUM-27:** plano de teste (objetivo, itens, estratégia, critérios de entrada e saída, recursos, cronograma, papéis).
3. **SCRUM-33:** os 8 ADRs (ADR-001 a ADR-008, Quadro 6 da Fase 0).
4. **SCRUM-31:** UML restante (casos de uso, classes, sequência) e DER.
5. **SCRUM-32:** design system (tokens, componentes, acessibilidade, protótipo).
6. **SCRUM-35:** documentação de desenvolvimento, atualizada a cada dois dias; horas e datas são do autor.

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
