# Documentação de Desenvolvimento: Vacina em Dia

> Item do Jira: SCRUM-35. Fonte em Markdown; vira Word (ABNT) durante o desenvolvimento e PDF na entrega de 19/11/2026 (`doctos/`). Estrutura baseada em `docs/referencias-disciplinas/Modelo-Documentacao_desenvolvimento.pdf`. O modelo pula da seção 3 para a 6; aqui a numeração foi tornada contínua (as seções 6, 7 e 8 do modelo são as 4, 5 e 6 deste documento).
>
> **Regra deste documento:** datas, horários, durações e tempos são **registros do autor** e só entram quando ele os informa (`CLAUDE.md` §13). Campos marcados `[a informar]` esperam esse dado. Os textos de descrição, materiais e itens do backlog vêm de fatos verificáveis (commits, Jira, decisões documentadas).
>
> **Atualização:** a cada dois dias, no mínimo (critério do SCRUM-35). Última atualização: 06/10/2026.

## 1 Identificação do projeto

| Campo | Valor |
|---|---|
| Nome do projeto | Vacina em Dia: carteira de vacinação digital com lembretes e assistente por voz |
| Projeto | Projeto Interdisciplinar VI (PI-VI) |
| Grupo | Individual |
| Integrante | Eduardo Kamo Iguei, RA [a informar] |
| Curso | Tecnologia em Desenvolvimento de Software Multiplataforma, Fatec Votorantim |
| Semestre | 6º semestre, 2026 |
| Professor orientador | Prof. Dr. Cassio R. F. Riedo |
| Data de criação do documento | 06/10/2026 |
| Versão | 0.1 |

## 2 Descrição geral do projeto

O **Vacina em Dia** é um aplicativo para Android, iOS e web com o qual famílias organizam o calendário vacinal de seus membros, registram doses, recebem lembretes e tiram dúvidas por busca por voz e por um chatbot de intenções. O sistema roda inteiramente na Microsoft Azure e integra as disciplinas Laboratório de Desenvolvimento Multiplataforma, Computação em Nuvem II, Processamento de Linguagem Natural e Qualidade e Testes de Software. Atende aos ODS 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades). O escopo, os requisitos e as decisões técnicas estão em `docs/01-visao-e-escopo.md`, `docs/02-requisitos.md` e `docs/05-adrs/`.

O projeto é individual: o autor acumula os papéis de dono do produto, Scrum Master e desenvolvedor, e usa um assistente de programação (Claude Code) como par de programação, com as decisões sempre do autor.

## 3 Registro de atividades

### 3.1 Registro de atividades individuais

Todas as atividades abaixo ocorreram em 06/10/2026 (datas dos commits no repositório), exceto quando indicado. Tempo e horário são do autor.

**3.1.1 Fundação do repositório (SCRUM-5)**

- **Data:** 06/10/2026
- **Tempo gasto:** 2 h 17 min (registrado pelo autor no Jira, SCRUM-5)
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** organização do repositório com `README.md`, `.gitignore` (Node, Expo, Azure Functions e Python, sem segredos), licença MIT e commit inicial; versionamento dos PDFs de referência; regra de documentação em Word durante o desenvolvimento e PDF na entrega.
- **Materiais e ferramentas:** Git e GitHub, Claude Code, Jira.
- **Itens do backlog:** SCRUM-5.
- **Ocorrências:** o commit inicial foi direto na `main`; a partir daí, uma branch por tarefa.

**3.1.2 Plano de teste (SCRUM-27)**

- **Data:** 06/10/2026
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** plano de teste com objetivo, escopo, requisitos relevantes (RF e RNF), itens a testar, estratégia (partição de equivalência, valor limite e cobertura de estados), critérios de entrada e saída, recursos, cronograma estimado e papéis acumulados por uma pessoa (`docs/07-testes/plano-de-teste.md`).
- **Materiais e ferramentas:** enunciado de Qualidade e Testes, `docs/02-requisitos.md`, Jira, Claude Code.
- **Itens do backlog:** SCRUM-27.
- **Ocorrências:** o enunciado em PDF só pôde ser lido por um extrator próprio, pois não havia leitor de PDF instalado.

**3.1.3 Decisões técnicas e verificações no Azure (SCRUM-33)**

- **Data:** 06/10/2026
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** 10 registros de decisão de arquitetura (ADR-001 a ADR-010), incluindo a decisão de não usar Express, o armazenamento do token na web e a limitação de taxa. Verificações somente de leitura no Azure com a CLI: oferta gratuita do Azure SQL compatível com a assinatura, regiões permitidas, disponibilidade do Entra External ID e dos serviços de voz e Functions em Brazil South.
- **Materiais e ferramentas:** Azure CLI, documentação da Microsoft Learn, Claude Code, Jira.
- **Itens do backlog:** SCRUM-33 (RNF06).
- **Ocorrências:** a sessão do `az login` expira a cada 3 dias por política de acesso condicional do diretório da instituição; o autor refaz o login no navegador.

**3.1.4 UML e DER (SCRUM-31)**

- **Data:** 06/10/2026
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** diagramas de casos de uso, classes, sequência (login, registrar dose, lembrete) e arquitetura; DER do Azure SQL com 11 tabelas e dicionário de dados com classificação LGPD (`docs/03-uml/`).
- **Materiais e ferramentas:** Mermaid, mermaid-cli (validação e renderização), Claude Code.
- **Itens do backlog:** SCRUM-31.
- **Ocorrências:** a validação revelou um erro de sintaxe real no diagrama de lembretes (ponto e vírgula dentro de uma nota), corrigido; o diagrama de casos de uso foi reorganizado para ficar legível.

**3.1.5 UML de estados e casos de teste da dose (SCRUM-29)**

- **Data:** [a informar] (produzido antes do repositório e versionado em 06/10/2026)
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** diagrama de estados do ciclo de vida da dose (5 estados, 12 transições) e 42 casos de teste de estados, transições, guardas, inválidas e caminhos (`docs/03-uml/estados-dose.md` e `docs/07-testes/casos-teste-estados-dose.md`).
- **Materiais e ferramentas:** Mermaid, enunciado de Qualidade e Testes.
- **Itens do backlog:** SCRUM-29 (RF04).
- **Ocorrências:** o diagrama em Mermaid foi validado com o mermaid-cli em 06/10/2026 e renderiza sem erro.

**3.1.6 Design system (SCRUM-32)**

- **Data:** 06/10/2026
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** documento do design system (tokens, três temas, tipografia, componentes, telas, checklist de acessibilidade e microcopy), fonte única de tokens em JSON e ADR-011. Protótipo no Figma parcialmente construído: variáveis por tema, estilos de texto, 14 componentes e 4 telas de celular.
- **Materiais e ferramentas:** Figma (via integração com o Claude Code), cálculo de contraste do WCAG 2.1, Atkinson Hyperlegible, Claude Code.
- **Itens do backlog:** SCRUM-32 (RNF04 e RNF09).
- **Ocorrências:** o plano gratuito do Figma permite um modo por coleção e três páginas, e atingiu o limite de chamadas da integração; por isso os temas são coleções separadas e as telas restantes ficam para depois.

**3.1.7 Documentação de desenvolvimento (SCRUM-35)**

- **Data:** 06/10/2026
- **Tempo gasto:** [a informar]
- **Membro:** Eduardo Kamo Iguei
- **Descrição:** criação deste documento a partir do modelo da disciplina.
- **Materiais e ferramentas:** modelo de Documentação de Desenvolvimento, Claude Code.
- **Itens do backlog:** SCRUM-35.

### 3.2 Registro de reuniões

As reuniões do Scrum são **simuladas** (projeto individual): o autor acumula os papéis. Data, horário, duração e local são do autor.

**3.2.1 Planejamento da Sprint 1**

- **Tipo:** Planejamento
- **Data:** [a informar]
- **Horário:** [a informar]
- **Local:** [a informar]
- **Membros presentes:** Eduardo Kamo Iguei (dono do produto, Scrum Master e desenvolvedor)
- **Pauta:** objetivo e itens da Sprint 1; critérios de aceite de cada item.
- **Resumo das discussões e decisões:** a Sprint 1 vai de 06/10 a 12/10 e cobre a fundação: plano de teste, ADRs, UML e DER, UML de estados e casos de teste, design system e documentação de desenvolvimento. Decidiu-se usar um repositório único, Jest como ferramenta de testes e o calendário do PNI sempre de fonte oficial.
- **Itens do backlog:** SCRUM-27, SCRUM-29, SCRUM-31, SCRUM-32, SCRUM-33 e SCRUM-35.
- **Critérios de aceite:** os critérios de pronto de cada item no Jira (resumo na seção 3.2.3).
- **Próximos passos:** executar os itens na ordem SCRUM-27, 33, 31, 32 e 35.

**3.2.2 Reuniões diárias**

[Cada diária ocorrida deve ser registrada aqui, com data, horário, o que foi feito, o que será feito e os impedimentos.]

**3.2.3 Critérios de aceite dos itens da Sprint 1 (situação em 06/10/2026)**

| Item | Critério de pronto (resumo) | Situação |
|---|---|---|
| SCRUM-27 | Requisitos relevantes, plano de teste completo e papéis listados | Atendido; status "Em análise" |
| SCRUM-29 | Diagrama de estados e casos de teste de estados, transições e caminhos | Atendido; status "Em análise" |
| SCRUM-31 | Casos de uso, classes, sequências, arquitetura e DER com descrição | Atendido; status "Em análise" |
| SCRUM-33 | Um ADR por decisão, status atualizado, pendências do Azure verificadas e decisão sobre Express | Atendido; status "Em análise" |
| SCRUM-32 | Tokens, componentes base, contraste e toque conforme WCAG 2.1 AA, protótipo no Figma, `04-design-system.md` | Parcial: documento e tokens prontos; protótipo incompleto; tokens ainda não aplicados no `tailwind.config` (SCRUM-23) |
| SCRUM-35 | Registro mantido ao longo do projeto, atualizado a cada dois dias | Em andamento |

**3.2.4 Encerramento da Sprint 1**

- **Tipo:** Encerramento
- **Data:** [a realizar até 12/10/2026; informar]
- **Resumo e decisões:** [a preencher após a reunião: itens aceitos e movidos para "Concluído", motivos de qualquer item não aceito.]

### 3.3 Registro de atividades de aprendizagem

Registrar apenas o que o autor de fato estudou, com tempo e tipo (curso, aula, leitura, experimentação). Os temas abaixo foram **pesquisados durante a Sprint 1** e ficam como candidatos; o autor confirma quais registrar e o tempo de cada um.

| Tema | Data | Tempo | Tipo | Conteúdo aprendido |
|---|---|---|---|---|
| Ofertas gratuitas do Azure (SQL, Functions, Speech, Application Insights) | 06/10/2026 | [a informar] | [a informar] | Limites e condições de cada oferta e a compatibilidade com a assinatura de estudante |
| Microsoft Entra External ID | 06/10/2026 | [a informar] | [a informar] | Cobrança por usuário ativo, tenant externo e a ausência de região no Brasil |
| Acessibilidade WCAG 2.1 e alvos de toque para idosos | 06/10/2026 | [a informar] | [a informar] | Contraste mínimo, texto a 200% e tamanho de alvo |
| Modelagem UML e DER com Mermaid | 06/10/2026 | [a informar] | [a informar] | Tipos de diagrama e limitações da sintaxe |
| Variáveis, modos e componentes no Figma | 06/10/2026 | [a informar] | [a informar] | Limites do plano gratuito e organização de um design system |

## 4 Integração com a metodologia Scrum

### 4.1 Visão geral da aplicação do Scrum

O projeto é dividido em **seis sprints semanais**, planejadas de trás para frente a partir das entregas de 12/11, 16/11 e 19/11. A Sprint 1 (06/10 a 12/10) trata da fundação. O Jira (projeto SCRUM) guarda o backlog, os épicos SCRUM-5 a SCRUM-12 e as sprints. A convenção de status exigida é: **A fazer** (a planejar), **Em andamento** (sprint iniciada), **Em análise** (item finalizado dentro da sprint) e **Concluído** (somente depois de analisado na reunião de encerramento). As reuniões são simuladas, com o autor acumulando os papéis.

### 4.2 Trabalhos realizados

Sprint 1 (parcial, em 06/10/2026): plano de teste, decisões técnicas em ADRs, UML e DER, UML de estados com casos de teste, documento de design system e esqueleto desta documentação. Os itens SCRUM-27, 29, 31 e 33 estão em "Em análise".

### 4.3 Impedimentos e desafios comuns

- Sessão do Azure expira a cada 3 dias por política de acesso condicional do diretório institucional.
- Plano gratuito do Figma: um modo por coleção, três páginas e limite de chamadas da integração.
- Recursos antigos de outro projeto (DelBicos) na mesma assinatura, a decidir antes de provisionar o novo ambiente.
- Falta do calendário oficial do PNI em formato utilizável; até lá, o conjunto de dados de exemplo é marcado como fictício.

### 4.4 Lições aprendidas

[A preencher na retrospectiva da Sprint 1.]

## 5 Quadro geral de consolidação

Os valores vêm dos registros das seções 3.1 e 3.3. Campos `[a informar]` dependem dos tempos do autor.

| Categoria | Horas dedicadas (h:min) | Materiais e recursos utilizados | Custo estimado (R$) |
|---|---|---|---|
| Atividades individuais | [a informar] (já registrado: 2:17 no SCRUM-5) | Git e GitHub, Jira, Mermaid, Azure CLI, Figma (plano gratuito), Claude Code | 0,00 |
| Reuniões do grupo | [a informar] | Reuniões simuladas | 0,00 |
| Atividades de aprendizagem | [a informar] | Documentação da Microsoft Learn, WCAG | 0,00 |
| **Total geral** | [a informar] | | **0,00** |

**Custos de nuvem:** nenhum recurso foi criado no Azure para este projeto até 06/10/2026, e o autor confirma custo zero até o momento. A assinatura Azure for Students tem crédito de US$ 100 e limite de gastos ativado. A estimativa mensal de custo da solução fica na Documentação Técnica (SCRUM-26).

## 6 Orientações finais

- **Frequência de atualização:** atividades individuais e reuniões em dia, no mínimo a cada dois dias; integração com o Scrum e quadro de consolidação ao fim de cada sprint.
- **Honestidade dos registros:** tempos, datas e reuniões são os efetivamente realizados; este documento serve de evidência do trabalho e do aprendizado.
- **Clareza:** linguagem simples e objetiva, compreensível por quem não participou do projeto.
- **Versionamento:** o documento fica no repositório, em Markdown, para controle de versão; o Word é gerado a partir dele e o PDF só na entrega.
