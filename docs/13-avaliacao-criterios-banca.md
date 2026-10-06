# Avaliação do projeto contra os critérios da banca (PI-VI, 26s1)

Fonte: `26s1)LabDM-V-Criterios_de_avaliacao.pdf`. Cada critério vale de 0 a 5 pontos, exceto **PLN (busca semântica), de 0 a 20**. Total possível: 16 × 5 + 20 = **100 pontos**. Estado em 07/10/2026. A coluna "Nota estimada" é uma **autoavaliação** para priorizar o trabalho, não a nota da banca.

| # | Critério | Disciplina | Situação hoje | Nota estimada | O que falta |
|---|---|---|---|---|---|
| 1 | Estado inicial (semestres anteriores) | CN2 | Não documentado | 0 | Descrever o ponto de partida (o que existia antes do semestre). **Depende do autor** |
| 2 | Proposta para o semestre (problemas e expectativas) | LDM | `docs/01-visao-e-escopo.md` (Fase 0) completo | 4 | Resumo de 1 slide |
| 3 | Relacionamento com o Product Owner | LDM | Reuniões simuladas, autor nos dois papéis (`docs/09`) | 2 | Definir quem é o PO e registrar as interações reais. **Depende do autor** |
| 4 | Requisitos funcionais e não funcionais mais relevantes | QTS | `docs/02-requisitos.md` (RF01–RF12, RNF01–RNF10) | 4 | Mapa de rastreio requisito → tela → teste |
| 5 | Funcionalidades por persona | PI | Personas na Fase 0; app navegável | 3 | Roteiro de demonstração por persona (Mariana, Sr. José, Carla) |
| 6 | Product Backlog (Kanban) | LDM | Jira com épicos e itens | 3 | Exportar o quadro (print) e conferir status |
| 7 | Reuniões de planejamento e encerramento (sprints feitas) | PI | Sprint 1 em curso; registros com `[a informar]` | 2 | Registrar datas e tempos reais. **Depende do autor** |
| 8 | Expectativa das próximas sprints | PI | Cronograma em `docs/09` | 4 | Slide com as sprints 2 a 6 |
| 9 | Documentação técnica (Docker, manutenção) | PI | `docker-compose.yml`, `README`, `docs/08` | 3 | **Seção de manutenção do Docker** (subir, parar, logs, atualizar imagem, problemas comuns) |
| 10 | Documentação de desenvolvimento (totalização categorizada) | LDM | Esqueleto em `docs/09` | 2 | Totais por categoria; **depende dos tempos reais do autor** |
| 11 | Conversão de serviços (AWS para Azure) | CN2 | **Não existe** | 0 | Tabela AWS → Azure com o que o projeto usa (ver §2) |
| 12 | Custos dos serviços no Azure | CN2 | Só menção (SCRUM-26) | 1 | Estimativa na calculadora de preços, por serviço e total mensal |
| 13 | Infraestrutura como código (Bicep) | CN2 | **Não existe** (recursos criados por CLI) | 0 | Templates Bicep dos recursos reais, validados com `az bicep build` e `what-if` |
| 14 | Teste da aplicação e tabela de execução | QTS | Testes automatizados (541 TS + 162 Python); sem tabela de execução | 2 | Casos de caixa preta (partição e valor limite) e tabela de execução com resultado real |
| 15 | UML de estados de uma funcionalidade | QTS | `docs/03-uml/estados-dose.md` (5 estados, 12 transições) | 5 | Nada essencial |
| 16 | Casos de teste (estados, transições, sequências) | QTS | 42 casos em `docs/07-testes/casos-teste-estados-dose.md`, automatizados | 4 | Gerar a tabela de execução a partir do Jest (resultado real) |
| 17 | **PLN: sistema de busca semântica (0–20)** | PLN | Busca TF-IDF + cosseno; chatbot TF-IDF + SVM; voz | 12 | Ver §1 |

Soma estimada: cerca de **51 de 100**. Os maiores ganhos por esforço: Bicep, AWS→Azure e custos (15 pontos hoje zerados ou quase), a tabela de execução (3), e a busca semântica (até 8).

## 1. PLN, o critério de 20 pontos

A ementa e o roteiro da disciplina falam em **análise semântica** e **reconhecimento de voz**; o projeto prático tem três notas: voz (40%), chatbot (40%) e apresentação presencial (20%). O que existe:

- Voz: Azure AI Speech (pt-BR) transcreve e a transcrição vira uma busca. Funciona na web, testado só com áudio sintetizado.
- Busca: TF-IDF (palavras e caracteres) com similaridade do cosseno sobre nome, apelidos e doenças evitadas. Isso é **busca lexical por similaridade**; "semântica" no sentido estrito (entender sinônimos que não compartilham palavras) é mais do que isso.
- Chatbot: TF-IDF + SVM, 20 intenções, F1 macro 0,93 no teste separado.

**Risco:** a banca pode entender "busca semântica" como representação por significado (embeddings). Duas formas de reduzir o risco, que o autor deve escolher:

1. **Defender o que existe**, explicando a progressão (léxico → TF-IDF → semântico) e mostrando exemplos em que a busca acha a vacina por apelido ou por doença ("paralisia infantil" → VIP/VOP). Custo: zero. Risco: nota menor se a banca exigir embeddings.
2. **Adicionar uma camada semântica** (por exemplo, LSA/SVD sobre o TF-IDF, que capta coocorrência de termos e é leve e determinística, ou embeddings de um modelo). LSA cabe no scikit-learn já usado; embeddings pedem modelo, memória e custo de Azure, e precisam de aprovação (CLAUDE.md §3). Recomendação: **LSA primeiro**, medir contra o teste atual e só então avaliar embeddings.

**Pergunta ao professor de PLN:** o que a banca espera por "busca semântica" e se TF-IDF + SVM com LSA atende.

## 2. Conversão AWS → Azure (CN2)

Rascunho da tabela para a documentação; o autor confirma se a disciplina pede os serviços da arquitetura anterior (AWS) ou equivalências gerais. Equivalências comuns e conferíveis na documentação de comparação da Microsoft:

| Função | AWS | Azure (neste projeto) |
|---|---|---|
| Funções sem servidor | Lambda | Azure Functions (Flex Consumption) |
| API HTTP | API Gateway | Azure Functions com gatilho HTTP |
| Hospedagem do site | S3 + CloudFront / Amplify | Static Web Apps |
| Banco relacional | RDS | Azure SQL Database (oferta gratuita) |
| Segredos | Secrets Manager | Key Vault |
| Identidade | Cognito | Microsoft Entra External ID |
| Logs e métricas | CloudWatch | Application Insights |
| Fala para texto | Transcribe | Azure AI Speech |
| Infraestrutura como código | CloudFormation | Bicep |
| CI/CD | CodePipeline | GitHub Actions (OIDC) |

## 3. Plano proposto (para o autor aprovar)

Ordem pelo ganho de pontos e pelas dependências. Itens com **(autor)** só o autor pode fazer.

1. **Bicep** (`infra/`): templates dos recursos reais (grupo, planos Flex, Function Apps, SWA, SQL, Key Vault, App Insights, Speech), validados com `az bicep build` e `az deployment group what-if`. **Sem aplicar** nada sem aviso, para não recriar recursos existentes. Doc em `docs/08`.
2. **Custos**: estimativa por serviço, preços conferidos na calculadora oficial (inclui a instância sempre pronta do PLN). Só valores confirmados; o que não for confirmado fica marcado.
3. **AWS → Azure**: tabela do §2 em `docs/08` após a sua confirmação do que a disciplina pede.
4. **Testes**: casos de caixa preta (partição de equivalência e valor limite) para cadastro de membro e datas de dose; **tabela de execução** gerada do Jest com resultado real.
5. **Docker, manutenção**: seção no `README`/`docs/08`.
6. **Busca semântica**: opção 2 do §1, se aprovada.
7. **Roteiro de demonstração por persona** e slides.
8. **(autor)** estado inicial (CN2), Product Owner, tempos reais, atas das reuniões, tenant do Entra, revisão do conteúdo do chatbot.

## 4. Login: bloqueio no tenant

O erro 401 "Insufficient privileges" ao abrir o Entra indica que o diretório da faculdade (Centro Paula Souza) não dá ao aluno permissão para criar tenants. Opções, na ordem que recomendo:

1. Criar o tenant externo com uma **conta Microsoft pessoal** (fora do diretório da faculdade), pelo fluxo de teste gratuito do Entra External ID (`docs/12-guia-tenant-entra.md`); o tenant não precisa ficar ligado à assinatura da faculdade para funcionar.
2. Se também não for possível, **adiar o login** e apresentar com a sessão de demonstração (ADR-013) já implementada, dizendo claramente que o login real é a próxima sprint. O login não aparece como critério da banca.

A decisão é do autor. Não depende de nada que eu possa fazer pelo código.
