# Vacina em Dia: backlog do produto

Backlog organizado em épicos, com prioridade (MoSCoW), critérios de aceite, requisitos e personas de cada item. Gerado de `docs/backlog/dados.py` (rode `python docs/backlog/dados.py` depois de editar). A versão viva fica no projeto "proj-vacina-em-dia" do GitHub Projects, que substitui o Jira; a ligação problema, requisito e item está em `docs/23-do-problema-ao-backlog.md`.

**Convenção de estados (professor):** A fazer, Em andamento, Em análise (terminou dentro da data da sprint) e Concluído (só depois de analisado na reunião de encerramento da sprint). Nenhum item aqui está como Concluído; quem decide é a autora. **Prioridade (MoSCoW):** Must (deve), Should (deveria), Could (poderia) e Won't (não agora). As prioridades são uma proposta a ser confirmada pela autora.

| Sprint | Período |
|---|---|
| Sprint 1 | 06/10 a 12/10 |
| Sprint 2 | 13/10 a 19/10 |
| Sprint 3 | 20/10 a 26/10 |
| Sprint 4 | 27/10 a 02/11 |
| Sprint 5 | 03/11 a 09/11 |
| Sprint 6 | 10/11 a 19/11 |

## E1 Fundação e documentação (SCRUM-5)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B29 | SCRUM-31 | Como equipe, quero a modelagem UML (casos de uso, classes, sequência) e o DER, para documentar o sistema | Must | Em análise | Sprint 1 |
| B30 | SCRUM-33 | Como equipe, quero as decisões técnicas registradas em ADRs, para defender as escolhas na apresentação | Must | Em análise | Sprint 1 |
| B31 | SCRUM-35 | Como autora, quero a Documentação de Desenvolvimento (horas, atividades, reuniões, aprendizados e Scrum) mantida ao longo do projeto, para entregá-la em PDF no fim | Must | Em andamento | Sprint 1 |
| B32 | SCRUM-34 | Como autora, quero a Documentação Técnica conforme o modelo da disciplina, para a entrega final | Must | Em andamento | Sprint 5 |
| B33 | SCRUM-36 | Como autora, quero a Documentação do Usuário em linguagem simples (passo a passo e perguntas frequentes), para quem vai usar o app | Must | Em análise | Sprint 6 |
| B34 | SCRUM-37 | Como autora, quero o panfleto A4 do projeto para a mostra, para apresentar o app ao público | Should | Em andamento | Sprint 6 |
| B35 | novo | Como autora, quero o roteiro de demonstração e a apresentação final, para defender o projeto em 19/11 | Must | Em análise | Sprint 6 |
| B36 | novo | Como autora, quero empacotar a entrega (PDFs das três documentações, panfleto e zip do repositório), para entregar em 19/11 | Must | Em andamento | Sprint 6 |
| B38 | novo | Como autora, quero registrar as decisões sobre a licença dos dados dos postos, o uso de Jest no lugar de JUnit e as datas de entrega, para defender as escolhas na apresentação | Should | Em análise | Sprint 3 |

**B29** (todas; requisitos: RNF06)

- Diagramas versionados em docs/03-uml.
- DER coerente com as migrações do banco.
- Evidência: docs/03-uml/

**B30** (todas; requisitos: RNF06)

- Toda decisão relevante tem um ADR com contexto, decisão e consequências.
- Índice de ADRs atualizado.
- Evidência: docs/05-adrs/ (18 ADRs)

**B31** (autora; requisitos: RNF06)

- Segue o modelo da disciplina e a ABNT.
- Horas, datas de reunião e atividades são registradas pela autora, nunca inventadas.
- Evidência: docs/09-documentacao-de-desenvolvimento.md
- Atenção: Depende dos registros da autora.

**B32** (autora; requisitos: RNF06)

- Tecnologias e versões, DER, APIs, serviços Azure, custos, testes, PLN e riscos.
- Atualizada com o mapa de postos, o redesenho e o repositório público.
- PDF gerado só na entrega.
- Evidência: doctos/Documentacao_Tecnica.docx (local)

**B33** (PE1, PE2, PE3; requisitos: RNF04)

- Passo a passo das telas principais, com capturas de tela.
- Perguntas frequentes e aviso de que não substitui a caderneta.
- Evidência: doctos/Documentacao_do_Usuario.docx (local)
- Atenção: Capturas de tela incluídas em 10/10/2026; falta a revisão da autora.

**B34** (todas; requisitos: -)

- Cabe em uma folha A4 e usa a identidade visual.
- Traz a proposta, os ODS 3 e 10 e como acessar.
- Evidência: doctos/Panfleto.docx (local)

**B35** (autora; requisitos: -)

- Roteiro cronometrado com o caminho feliz de cada persona.
- Slides (ou equivalente) com problema, solução, arquitetura, testes e custos.
- Evidência: docs/20-roteiro-de-demonstracao.md
- Atenção: Roteiro e slides prontos (doctos/Apresentacao.pptx); falta ensaiar.

**B36** (autora; requisitos: -)

- PDFs convertidos do Word só no momento da entrega.
- Zip do repositório sem segredos nem arquivos gerados.

**B38** (autora; requisitos: RNF07)

- Decisão de manter o Jest registrada no CLAUDE.md §14, sem confirmação do professor.
- Licença dos dados dos postos (CC BY-SemDerivações 3.0) e a limpeza de nomes registradas como premissa no ADR-018.
- Entregas de 12/11, 16/11 e 19/11 mantidas como estão; a data de Computação em Nuvem II segue em aberto.
- Evidência: CLAUDE.md §14; ADR-018
- Atenção: A autora decidiu não consultar o professor sobre esses pontos.

## E2 Infraestrutura, Azure e DevOps (SCRUM-6)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B16 | SCRUM-22 | Como equipe, quero a API, o banco, o cofre de segredos e o monitoramento na Azure, para o app rodar na nuvem | Must | Em análise | Sprint 2 |
| B17 | SCRUM-23 | Como desenvolvedora, quero o monorepo com TypeScript estrito, ESLint, Prettier e TypeDoc, para manter a qualidade do código | Must | Em análise | Sprint 2 |
| B18 | SCRUM-24 | Como desenvolvedora, quero um pipeline de CI que rode lint, tipos, build, testes com cobertura, TypeDoc e auditoria, para barrar regressões | Must | Em análise | Sprint 2 |
| B19 | SCRUM-25 | Como equipe, quero o projeto em contêineres Docker, para rodar em qualquer máquina com um comando | Must | Em análise | Sprint 5 |
| B20 | SCRUM-26 | Como autora, quero estimar o custo mensal na Azure e ter alertas de orçamento, para não gastar além do crédito | Should | Em andamento | Sprint 5 |
| B21 | novo | Como autora, quero manter o banco com migrações versionadas e a persistência no Azure SQL, para os dados sobreviverem a reinícios | Must | Em análise | Sprint 3 |
| B22 | novo | Como usuária, quero que o primeiro login depois de um tempo sem uso não demore, para não achar que o app travou | Should | Em análise | Sprint 6 |
| B23 | novo | Como autora, quero o repositório público com proteção ativada, para usar o GitHub Actions sem limite de minutos e sem expor segredos | Should | Em análise | Sprint 6 |

**B16** (todas; requisitos: RNF02, RNF05, RNF09)

- API em Azure Functions, banco Azure SQL, segredos no Key Vault e Application Insights ligados.
- Infraestrutura descrita como código (Bicep).
- Banco acessado por identidade gerenciada, sem senha de SQL.
- Evidência: infra/; docs/08-infraestrutura-azure.md

**B17** (todas; requisitos: RNF06)

- Scripts padrão (lint, typecheck, test, docs) funcionam em todos os pacotes.
- Hooks do Git e commitlint ativos.
- Evidência: CLAUDE.md §6

**B18** (todas; requisitos: RNF06, RNF07)

- O pipeline falha se algum teste falhar ou a cobertura ficar abaixo de 80%.
- Roda em todo push e o job de Docker só na main.
- Evidência: .github/workflows/ci.yml

**B19** (todas; requisitos: RNF08)

- `docker compose up --build` sobe a API, o app web, o PLN e o Azurite.
- Há guia de manutenção do Docker.
- Evidência: docker-compose.yml; docs/17-docker-manutencao.md

**B20** (todas; requisitos: RNF05)

- Estimativa mensal por serviço registrada.
- Alerta de orçamento configurado na assinatura.
- Evidência: docs/16-custos-azure.md
- Atenção: A estimativa existe; confirmar o alerta de orçamento na Azure.

**B21** (todas; requisitos: RNF02, RNF03)

- Migrações aplicadas por script antes do deploy.
- Contrato do repositório testado em memória e no SQL real.
- Evidência: ADR-004; docs/15-persistencia-sql.md; scripts/db-migrate.mjs

**B22** (PE1, PE2, PE3; requisitos: RNF01)

- O app acorda o banco ao abrir (GET /api/warmup), no máximo uma consulta por minuto por instância.
- Sem manter o banco sempre ligado, para não esgotar a franquia gratuita.
- Evidência: PR #78; docs/16-custos-azure.md
- Atenção: A espera pode continuar se a pessoa entrar antes de o banco acordar (até ~1 min).

**B23** (todas; requisitos: RNF02)

- Varredura do histórico sem segredos; secret scanning e push protection ligados.
- Branch main protegida e workflows só com permissão de leitura.
- Evidência: docs/00-handoff.md §0.11

## E3 Conta e privacidade (SCRUM-7)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B01 | SCRUM-13 | Como responsável por uma família, quero criar uma conta e entrar com e-mail e senha, para ter minha carteira em qualquer aparelho (RF01) | Must | Em análise | Sprint 2 |
| B02 | novo | Como usuária que esqueceu a senha, quero recebê-la por e-mail para redefinir, para voltar a usar o app sem perder meus dados | Should | Em análise | Sprint 2 |
| B03 | SCRUM-14 | Como responsável, quero aceitar um termo de consentimento claro e poder excluir minha conta e todos os dados, para ter controle sobre meus dados de saúde (RF09) | Must | Em análise | Sprint 4 |
| B48 | novo | Como usuária, quero confirmar meu e-mail ao me cadastrar, para ninguém usar o meu endereço | Won't (por enquanto) | A fazer | - |

**B01** (PE1, PE2, PE3; requisitos: RF01; RNF02, RNF03, RNF09)

- Cadastro e login com e-mail e senha; senha guardada só como hash.
- A sessão expira em 15 minutos e se renova sem pedir a senha de novo.
- Excesso de tentativas de login é bloqueado por um tempo.
- Mensagens de erro em linguagem simples, sem revelar se o e-mail existe.
- Evidência: ADR-014; CT-AUTH-*; docs/14-login-proprio.md

**B02** (PE1, PE3; requisitos: RF01; RNF02)

- O pedido de recuperação responde igual exista ou não o e-mail.
- O e-mail traz um link de uso único e de validade curta.
- Depois de redefinir, as sessões antigas deixam de valer.
- Evidência: ADR-015; CT-AUTH-*; reset-screens.test.tsx

**B03** (PE1, PE2, PE3; requisitos: RF09; RNF02, RNF03)

- O primeiro acesso exige aceitar o termo; o aceite fica registrado com a versão.
- Termos de uso e Política de privacidade acessíveis antes e depois do login.
- Excluir a conta apaga a conta, os membros e as doses, com confirmação.
- Nenhum CPF nem Cartão Nacional de Saúde é coletado.
- Evidência: docs/18-termos-e-privacidade.md; CT-APP-C*, CT-APP-X*
- Atenção: O texto dos termos é rascunho a validar (ver B39).

**B48** (PE1; requisitos: RNF02)

- O cadastro só vale depois de clicar no link do e-mail.
- Atenção: Não existe hoje; decidir depois da entrega.

## E4 Família e calendário vacinal (SCRUM-8)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B04 | SCRUM-15 | Como cuidadora, quero cadastrar as pessoas da minha família (com parentesco), para acompanhar a vacinação de todas em uma só conta (RF02) | Must | Em análise | Sprint 3 |
| B05 | SCRUM-16 | Como mãe, quero ver o calendário vacinal de cada pessoa conforme a idade, com fonte e versão, para saber o que é indicado e quando (RF03) | Must | Em análise | Sprint 3 |
| B06 | SCRUM-17 | Como cuidadora, quero consultar o histórico de doses de cada pessoa, para ter a caderneta digital à mão (RF08) | Must | Em análise | Sprint 4 |

**B04** (PE1, PE3; requisitos: RF02; RNF03, RNF04)

- Incluir, editar e excluir pessoas com nome, data de nascimento e, opcionalmente, gestante e parentesco.
- Cada pessoa mostra o resumo de doses (aplicadas, pendentes e atrasadas).
- Só o dono da conta enxerga e altera seus membros.
- Evidência: CT-FAM-*; telas Família e Nova pessoa

**B05** (PE1, PE2, PE3; requisitos: RF03; RNF04, RNF10)

- As doses são geradas pela data de nascimento e pelo calendário oficial do PNI.
- Toda tela com conteúdo vacinal mostra fonte e versão do calendário.
- O aviso de que o app não substitui a caderneta oficial está sempre visível.
- Evidência: docs/10-calendario-vacinal.md; CT-CAL-*, CT-G*
- Atenção: Confirmar com o autor a fonte e a data do calendário em uso (CLAUDE.md §8).

**B06** (PE1, PE3; requisitos: RF08; RNF01, RNF04)

- O histórico lista aplicadas e canceladas com data, em até 3 toques da tela inicial.
- Doses avulsas aparecem com a etiqueta "Adicionada por você".
- Evidência: CT-APP-H*

## E5 Doses e lembretes (SCRUM-9)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B07 | SCRUM-18 | Como responsável, quero agendar, registrar como aplicada, reagendar ou cancelar uma dose, para manter o registro certo (RF04) | Must | Em análise | Sprint 3 |
| B08 | novo | Como cuidadora, quero cadastrar uma dose que não está no calendário (dose avulsa), para registrar tudo que a pessoa tomou | Should | Em análise | Sprint 3 |
| B09 | SCRUM-19 | Como mãe, quero receber lembretes antes da data de cada dose e ver as atrasadas em destaque, para não esquecer (RF05) | Must | Em análise | Sprint 4 |

**B07** (PE1, PE3; requisitos: RF04; RNF01, RNF07, RNF10)

- Só as transições válidas do ciclo de vida são aceitas; as demais respondem com erro 409 e o estado não muda.
- Atrasar só acontece pela rotina de prazo, nunca pelo app.
- Cancelar pede confirmação; datas respeitam as regras (agendar e reagendar de hoje em diante; aplicar até hoje).
- Evidência: docs/03-uml/estados-dose.md; CT-T*, CT-E*, 42 casos de estados

**B08** (PE1, PE3; requisitos: RF04; RNF10)

- A dose avulsa tem nome e dose em texto livre e segue o mesmo ciclo de estados.
- Aparece com a etiqueta "Adicionada por você", distinta das doses oficiais.
- Evidência: ADR-016; caixa preta de dose avulsa

**B09** (PE1, PE2, PE3; requisitos: RF05; RNF01, RNF05)

- Dose pendente com data gera lembrete com antecedência de 7 dias e de 1 dia (configurável).
- Dose atrasada aparece em "Precisam de atenção" com texto, ícone e cor.
- O e-mail de lembrete traz só quantidades, nunca nomes nem datas de nascimento.
- Evidência: CT-LEM-*; docs/02-requisitos.md

## E6 PLN: voz e chatbot (SCRUM-10)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B10 | SCRUM-20 | Como idoso, quero perguntar por voz sobre vacinas e o calendário, para consultar sem digitar (RF06) | Must | Em análise | Sprint 4 |
| B11 | SCRUM-21 | Como mãe, quero tirar dúvidas frequentes no chat, com respostas curadas e fonte, para me informar sem orientação médica individual (RF07) | Must | Em análise | Sprint 5 |
| B12 | novo | Como usuária, quero abrir o assistente em uma janela de conversa sobre a tela em que estou, para perguntar sem perder o lugar | Should | Em análise | Sprint 5 |

**B10** (PE2, PE1; requisitos: RF06; RNF01, RNF04, RNF09)

- A resposta chega em até 3 s em 90% das requisições.
- Se o reconhecimento falhar, a pessoa vê uma mensagem clara e pode digitar.
- O áudio não é guardado.
- Funciona no celular e na web (com limitações documentadas).
- Evidência: docs/11-assistente-pln.md; CT-AST-*, CT-WAV-*
- Atenção: Falta testar com microfone real e com o público (ver B40).

**B11** (PE1, PE2, PE3; requisitos: RF07; RNF01, RNF04, RNF10)

- A intenção é classificada por TF-IDF e SVM; F1 meta de 0,85 ou mais em conjunto de teste separado.
- Confiança baixa devolve a resposta padrão que orienta procurar um profissional ou uma unidade de saúde.
- Toda resposta cita a fonte oficial; nenhuma orientação médica individual.
- Evidência: apps/nlp; docs/11-assistente-pln.md; pytest
- Atenção: Dataset ainda precisa de revisão manual (ver B39).

**B12** (PE1, PE2, PE3; requisitos: RF06, RF07; RNF04)

- O balão do canto abre a janela (folha no celular, janela de 400 px no computador).
- Fechar a janela cancela uma gravação em andamento.
- O assistente não aparece como item do menu lateral.
- Evidência: PRs #70 e #78; janela-do-assistente.test.tsx

## E7 Qualidade e testes (SCRUM-11)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B24 | SCRUM-27 | Como equipe, quero o plano de teste com requisitos relevantes e papéis do processo, para a entrega de Qualidade e Testes de 12/11 | Must | Em análise | Sprint 1 |
| B25 | SCRUM-28 | Como equipe, quero casos de caixa preta com tabela de execução, para provar o comportamento por fora | Must | Em análise | Sprint 3 |
| B26 | SCRUM-29 | Como equipe, quero o diagrama UML de estados da dose e os casos de teste de estados e transições, para a entrega de 12/11 | Must | Em análise | Sprint 1 |
| B27 | SCRUM-30 | Como equipe, quero os testes automatizados em Jest 100% aprovados e com cobertura de 90%, para a entrega de 12/11 | Must | Em análise | Sprint 4 |
| B28 | novo | Como equipe, quero a verificação de segurança (OWASP) e uma carga leve, para mostrar que a API aguenta e está protegida | Should | Em análise | Sprint 5 |
| B39 | novo | Como equipe, quero revisar o dataset do chatbot e o texto do termo de consentimento com outra pessoa, para garantir segurança e clareza | Should | A fazer | Sprint 4 |
| B40 | novo | Como equipe, quero testar o app em celulares reais (Android e iOS) e com leitor de tela, para achar o que o emulador não mostra | Should | A fazer | Sprint 5 |
| B49 | novo | Como equipe, quero testes de ponta a ponta e a verificação automática de acessibilidade rodando no pipeline, para provar que os fluxos críticos e o WCAG 2.1 AA continuam valendo a cada mudança | Should | Em análise | Sprint 1 |

**B24** (todas; requisitos: RNF07)

- Plano segue o modelo da disciplina.
- Cada requisito relevante liga-se a casos de teste.
- Evidência: docs/07-testes/

**B25** (todas; requisitos: RNF07)

- Casos por requisito com entrada, saída esperada e resultado.
- Tabela de execução atualizada a cada entrega.
- Revisão por outra pessoa (por exemplo, o professor).
- Evidência: docs/07-testes/caixa-preta-*.md (179 casos)
- Atenção: Falta a revisão por outra pessoa.

**B26** (todas; requisitos: RF04; RNF07)

- As 12 transições e as guardas estão cobertas por teste.
- Transições inválidas respondem erro e preservam o estado.
- Evidência: docs/03-uml/estados-dose.md; docs/07-testes/casos-teste-estados-dose.md

**B27** (todas; requisitos: RNF07)

- 100% dos testes passam no pipeline.
- Cobertura acima de 80% (exigida) e meta própria de 90%.
- O nome do teste traz o ID do caso (CT-...).
- Evidência: app 404 e API 552 testes; cobertura do app 95%

**B28** (todas; requisitos: RNF01, RNF02)

- Checklist OWASP Top 10 revisada.
- Carga leve com 99% das requisições abaixo de 3 s.
- Evidência: docs/21-seguranca-owasp-e-carga.md

**B39** (todas; requisitos: RNF03, RNF10)

- Dataset revisado manualmente, sem dados pessoais.
- Termo e política validados por quem entende de LGPD (ou pelo professor).

**B40** (PE2; requisitos: RNF04, RNF09)

- Mapa, localização, voz, lembretes e ligações testados em ao menos um Android e um iOS.
- Leitor de tela percorre as telas principais.
- Defeitos viram itens com prioridade.
- Atenção: A autora fará o teste nos aparelhos depois.

**B49** (PE1, PE2; requisitos: RF01, RF04, RF07, RF09; RNF04)

- Fluxos de cadastro, consentimento, pessoa, dose, entrar e assistente automatizados no navegador (Playwright).
- axe-core sem violações graves nas telas de antes do login, nos temas claro e escuro.
- Roda no CI depois do build e guarda o relatório.
- Evidência: docs/07-testes/ponta-a-ponta-e-acessibilidade.md; apps/mobile/e2e/
- Atenção: Roda só na web e com API falsa; celular e leitor de tela seguem manuais (ver B40).

## E8 Versão completa (SCRUM-12)

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B13 | SCRUM-38 | Como mãe, quero ver no mapa os postos de saúde perto de mim, para saber onde procurar a vacina (RF10) | Could | Em análise | Sprint 6 |
| B14 | SCRUM-39 | Como mãe, quero exportar a carteira de vacinação em PDF, para levar à escola ou à consulta (RF11) | Could | A fazer | Sprint 6 |
| B15 | SCRUM-40 | Como cuidadora, quero compartilhar a carteira de uma pessoa com outro cuidador autorizado, para dividirmos o cuidado (RF12) | Won't (por enquanto) | A fazer | Sprint 6 |

**B13** (PE1, PE3; requisitos: RF10; RNF01, RNF03, RNF04)

- Lista e mapa de unidades básicas de saúde por distância, na web e no celular, sem chave de API.
- A localização só é pedida ao tocar em "Usar minha localização" e a posição não é guardada.
- Sem internet, a última lista fica visível e o mapa avisa; com internet, os dados oficiais são atualizados.
- A tela avisa que nem toda unidade tem sala de vacina ("Ligue antes de ir").
- Evidência: ADR-018; PRs #72, #73, #78
- Atenção: Testar em celular físico e iOS (ver B40); confirmar a licença dos dados (ver B38).

**B14** (PE1, PE3; requisitos: RF11; RNF03, RNF10)

- O PDF traz as doses aplicadas, a fonte e a versão do calendário e o aviso de que não substitui a caderneta.
- Não inclui dados além dos já cadastrados.
- Atenção: Só se o cronograma permitir (CLAUDE.md §3).

**B15** (PE3; requisitos: RF12; RNF02, RNF03)

- O compartilhamento exige autorização explícita e pode ser revogado.
- A exclusão da conta remove os compartilhamentos.
- Atenção: Fica para depois da entrega, salvo decisão do autor.

## E9 Experiência e design

| ID | Jira | Item | Prioridade | Estado | Sprint |
|---|---|---|---|---|---|
| B41 | SCRUM-32 | Como equipe, quero o design system (cores, fontes, layout) para mobile e web, para o app ter identidade e ser acessível | Must | Em andamento | Sprint 1 |
| B42 | novo | Como usuária, quero um visual bonito e dinâmico, com telas próprias para web e celular, para gostar de usar o app | Should | Em análise | Sprint 6 |
| B43 | novo | Como usuária, quero aumentar o tamanho do texto e reduzir o movimento, para usar o app com conforto | Should | Em análise | Sprint 6 |
| B44 | novo | Como equipe, quero o arquivo do Figma atualizado para o design system v2, para ter o protótipo igual ao app | Could | Em andamento | Sprint 6 |
| B45 | novo | Como usuária de tablet, quero uma tela pensada para 600 a 1023 px, para não usar a versão do celular esticada | Could | Em análise | Sprint 6 |
| B46 | novo | Como usuária, quero animações extras (inclinação 3D da apresentação, painel e folha animados), para uma experiência mais viva | Could | Em andamento | Sprint 6 |
| B47 | novo | Como usuária, quero o ícone do app e o da aba do navegador com a marca, para reconhecer o app | Could | Em análise | Sprint 6 |

**B41** (todas; requisitos: RNF04)

- Tokens com contraste WCAG 2.1 AA nos três temas.
- Estados nunca só pela cor; alvos de toque de 48 dp.
- Documentação do porquê das escolhas (docs/22).
- Evidência: docs/04-design-system.md; docs/22-identidade-visual.md
- Atenção: Figma ainda na versão 1 (ver B44).

**B42** (PE1, PE3; requisitos: RNF04, RNF09)

- Navegação por barra inferior no celular e lateral no computador.
- Telas fiéis ao protótipo (Doses, Família, Histórico, Conta, apresentação, Entrar e Criar conta).
- Efeitos de passar o mouse, clicar e entrada de telas, parados com "Reduzir movimento".
- Evidência: PRs #65 a #78

**B43** (PE2; requisitos: RNF04)

- Tamanho do texto Normal, Grande e Maior na Conta.
- "Reduzir movimento" na Conta, além da preferência do sistema e do tema Alto contraste.
- Evidência: PR #75

**B44** (autora; requisitos: RNF04)

- Variáveis, medidas, estilos de texto e sombras na versão 2 (plugin em docs/04-design-system/figma-plugin).
- Componentes e telas atualizados.
- Atenção: Plugin pronto em docs/04-design-system/figma-plugin; falta a autora rodá-lo no app de computador do Figma.

**B45** (PE1; requisitos: RNF04, RNF09)

- Barra lateral compacta e grade de duas colunas validadas.
- Sem texto cortado em 200%.
- Atenção: Conferido em 820 px (barra lateral compacta, sem rolagem horizontal); falta olhar em tablet real.

**B46** (PE1; requisitos: RNF04)

- Inclinação em até 10 graus, só na apresentação e em Entrar.
- Tudo parado com "Reduzir movimento".

**B47** (todas; requisitos: -)

- Ícone iOS e Android (adaptativo e monocromático) e favicon configurados.
- Tela de abertura (splash) com a marca.
- Evidência: PR #79
- Atenção: Falta conferir o ícone e a tela de abertura em aparelho.

## Não migrados do Jira

- SCRUM-4 "Subtarefa 2.1": Item de exemplo criado com o projeto, sem relação com o backlog (não migrado).
