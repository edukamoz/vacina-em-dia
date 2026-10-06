# Vacina em Dia: Documento de Visão e Escopo (Fase 0)

> Versão 1.0, 06/10/2026. Autor: Eduardo Kamo Iguei. Projeto Interdisciplinar VI (PI-VI), Fatec Votorantim.
> Este arquivo é a versão em Markdown, para consulta no repositório e pelo Claude Code. O documento formal, em ABNT, é `Fase0_Documento_de_Visao_e_Escopo.docx`.
> Mudanças de escopo ou de decisão devem ser feitas nos dois (ou registradas em ADR).

## 1 INTRODUÇÃO

### 1.1 Contexto e finalidade do documento

Este documento apresenta a Fase 0 (Fundação) do projeto desenvolvido no Projeto Interdisciplinar VI (PI-VI) do Curso Superior de Tecnologia em Desenvolvimento de Software Multiplataforma da Fatec Votorantim. O PI-VI tem como objetivo desenvolver uma solução multiplataforma que atenda a demandas reais e contribua com os Objetivos de Desenvolvimento Sustentável (ODS), integrando plataforma web e dispositivos móveis, arquitetura em nuvem, qualidade e testes de software e Processamento de Linguagem Natural (PLN) (FACULDADE DE TECNOLOGIA DE VOTORANTIM, 2026).

O projeto, realizado de forma individual, propõe uma carteira de vacinação digital com lembretes, busca por voz e chatbot de dúvidas, hospedada integralmente na plataforma Microsoft Azure. Antes de qualquer implementação, este documento fixa a visão do produto, a justificativa, o escopo e os requisitos, de modo que as etapas seguintes (Product Backlog, modelagem UML, design system, plano de testes e codificação) partam de decisões registradas.

### 1.2 Organização do documento

A seção 2 descreve o problema, a justificativa e o alinhamento com os ODS. A seção 3 apresenta os objetivos e a seção 4, o público-alvo. As seções 5 e 6 definem o escopo e os requisitos funcionais e não funcionais. A seção 7 reúne premissas e restrições, a seção 8 registra as decisões técnicas preliminares, a seção 9 detalha as entregas e o cronograma e a seção 10 identifica riscos e mitigações. A seção 11 indica os próximos passos. A organização dos conteúdos de problemas, expectativas, personas e funcionalidades segue o canvas de Product Backlog Building adotado na disciplina (AGUIAR; CAROLI, 2021).

## 2 PROBLEMA E JUSTIFICATIVA

### 2.1 Problema a ser resolvido

As famílias precisam acompanhar um calendário vacinal que varia conforme a idade e a condição de cada pessoa, e esse acompanhamento ainda depende, em grande parte, da caderneta de papel e da memória de quem cuida. O Quadro 1 relaciona os problemas identificados às expectativas de solução, de modo que cada problema esteja associado a pelo menos uma expectativa. Os problemas são hipóteses de trabalho, a serem confirmadas em conversas com potenciais usuários nas primeiras semanas do projeto.

**Quadro 1 – Problemas, expectativas e metas propostas**

| **ID** | **Problema**                                                                                                                   | **Expectativa**                                                                                                           | **Meta proposta**                                                                                                                    |
|--------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| PR1    | Doses esquecidas ou atrasadas por falta de lembretes e de organização do calendário, sobretudo em famílias com vários membros. | EX1 – Notificar o usuário antes da data de cada dose pendente e sinalizar doses atrasadas.                                | Toda dose pendente com data prevista gera lembrete; antecedência configurável (padrão: 7 dias e 1 dia).                              |
| PR2    | Caderneta de papel perdida, danificada ou indisponível no momento da consulta; informação dispersa.                            | EX2 – Manter um registro digital único por membro da família, consultável a qualquer momento.                             | Histórico de um membro acessível em até 3 toques a partir da tela inicial.                                                           |
| PR3    | Dificuldade de saber quais vacinas são indicadas para cada idade e dúvidas frequentes, em um cenário de desinformação.         | EX3 – Exibir o calendário por faixa etária com base no calendário oficial do PNI e responder dúvidas com conteúdo curado. | 100% das vacinas exibidas com fonte e data de versão; F1 do classificador de intenções ≥ 0,85 em conjunto de teste (meta a validar). |
| PR4    | Barreiras de acesso para pessoas com baixa familiaridade digital ou dificuldade de digitação, como muitos idosos.              | EX4 – Permitir consulta por voz e oferecer interface acessível, em linguagem simples.                                     | Resultado da busca por voz em até 3 s em 90% das requisições; telas principais em conformidade com WCAG 2.1 nível AA.                |

Fonte: Elaborado pelo autor (2026).

### 2.2 Justificativa

O Programa Nacional de Imunizações (PNI) adota meta de cobertura de 95% para a maior parte das vacinas do calendário (BRASIL, \[s. d.\]). Dados preliminares do Painel de Cobertura Vacinal do Ministério da Saúde indicam que, em 2025, apenas a BCG (96,80%) e a hepatite B em recém-nascidos (95,11%) atingiram essa meta (BRASIL cumpre..., \[s. d.\]). A mesma reportagem registra a declaração do diretor do PNI de que o país não atinge a maior parte das metas de cobertura pelo menos desde 2014. Em 2023, nenhum estado brasileiro alcançou os 95% (UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL, \[2025\]).

Entre os fatores apontados para a queda estão a distância dos postos de saúde, a escassez de vacinas e a desinformação (UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL, \[2025\]). Um aplicativo não resolve causas estruturais, como o abastecimento, mas pode atuar sobre dois fatores ao alcance de um software: o esquecimento ou o atraso de doses, tratado por lembretes e pela organização do calendário, e o acesso a informação confiável, tratado por respostas curadas a partir de fonte oficial. Ao permitir consulta por voz e uma interface acessível, a solução também busca incluir pessoas com menor familiaridade digital.

A escolha por um chatbot baseado em regras e em classificação de intenções, em vez de IA generativa, é deliberada: em saúde, as respostas devem ser previsíveis e rastreáveis a uma fonte oficial. Do ponto de vista acadêmico, o tema integra de forma coerente as disciplinas do PI-VI: desenvolvimento multiplataforma, computação em nuvem (Azure), qualidade e testes (o ciclo de vida da dose possui mais de três estados) e PLN (busca por voz e chatbot).

### 2.3 Alinhamento com os Objetivos de Desenvolvimento Sustentável

O PI-VI exige que o projeto contribua com os ODS (FACULDADE DE TECNOLOGIA DE VOTORANTIM, 2026). O Quadro 2 indica os objetivos atendidos, a contribuição esperada e a parte do escopo que os sustenta. As metas mencionadas devem ser conferidas na redação oficial publicada pela Organização das Nações Unidas (ORGANIZAÇÃO DAS NAÇÕES UNIDAS NO BRASIL, \[s. d.\]).

**Quadro 2 – Alinhamento do projeto com os ODS**

| **ODS**                                                           | **Contribuição do projeto**                                                                                                                 | **Funcionalidades** | **Escopo**      |
|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|---------------------|-----------------|
| ODS 3 – Saúde e Bem-Estar (meta 3.8, acesso a vacinas essenciais) | Ajuda as famílias a manter a vacinação em dia, reduzindo doses esquecidas e facilitando o acesso a informação confiável sobre o calendário. | RF02 a RF08         | MVP             |
| ODS 10 – Redução das Desigualdades (meta 10.2, inclusão)          | Oferece acesso gratuito, interface acessível e consulta por voz, reduzindo barreiras para idosos e pessoas com baixa familiaridade digital. | RF06, RF07 e RNF04  | MVP             |
| ODS 11 – Cidades e Comunidades Sustentáveis                       | Facilita a localização de unidades de saúde próximas, aproximando o serviço da comunidade.                                                  | RF10                | Versão completa |

Fonte: Elaborado pelo autor (2026).

## 3 OBJETIVOS

### 3.1 Objetivo geral

Desenvolver, de forma individual, uma solução multiplataforma (mobile e web), hospedada na Microsoft Azure, para gestão da carteira de vacinação de famílias, com calendário por faixa etária, lembretes, busca por voz e chatbot de dúvidas, contribuindo para os ODS 3 e 10.

### 3.2 Objetivos específicos

1)  levantar, documentar e priorizar os requisitos funcionais e não funcionais, organizados em um Product Backlog;

2)  modelar o sistema com diagramas UML e o diagrama de entidade-relacionamento;

3)  definir um design system acessível, com cores, tipografia, espaçamento e componentes para mobile e web;

4)  implementar uma API serverless em Azure Functions e um aplicativo multiplataforma em React Native com Expo, ambos em TypeScript;

5)  integrar busca semântica por voz utilizando serviço de reconhecimento de fala da Azure;

6)  desenvolver um chatbot baseado em regras com classificação de intenções por TF-IDF e SVM;

7)  garantir a qualidade com testes automatizados em Jest, 100% de aprovação no pipeline e cobertura de código com meta de 90% (mínimo exigido de 80%);

8)  produzir as documentações técnica, de desenvolvimento e para o usuário, além do panfleto de divulgação;

9)  disponibilizar o projeto em ambiente Azure e em contêiner Docker.

## 4 PÚBLICO-ALVO E PERSONAS

Os usuários finais são pais e responsáveis por crianças, idosos e cuidadores de familiares. A solução não é voltada a profissionais de saúde. O Quadro 3 apresenta personas hipotéticas, construídas a partir do problema descrito e que serão validadas por meio de conversas com potenciais usuários. Cada requisito funcional da seção 6 está associado a pelo menos uma delas.

**Quadro 3 – Personas do sistema**

| **Persona**             | **Perfil**                                                                                            | **Necessidades**                                                                 | **Dificuldades**                                                                 |
|-------------------------|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| PE1 – Mariana, 32 anos  | Mãe de duas crianças (3 anos e recém-nascido). Usa o smartphone no dia a dia e tem pouco tempo livre. | Saber quais vacinas e quando; receber lembretes; ter a carteira sempre à mão.    | Rotina corrida; esquece datas; dúvida sobre o que é indicado em cada idade.      |
| PE2 – Sr. José, 68 anos | Aposentado que usa o celular para ligações e mensagens; baixa familiaridade com aplicativos.          | Consultar suas vacinas por voz; telas simples, letras grandes e poucos passos.   | Dificuldade de digitar e de navegar por menus; receio de errar.                  |
| PE3 – Carla, 45 anos    | Cuida do pai e da mãe idosos e acompanha a vacinação do filho adolescente.                            | Gerenciar vários membros em uma só conta; ver as pendências de todos de uma vez. | Controla muitas informações ao mesmo tempo; mistura datas de pessoas diferentes. |

Fonte: Elaborado pelo autor (2026).

## 5 ESCOPO

### 5.1 Escopo do MVP

O MVP concentra o que é necessário para entregar valor ao usuário e atender às exigências das disciplinas do PI-VI. O calendário vacinal tem como fonte o calendário oficial do PNI (BRASIL, \[s. d.\]). O MVP contempla:

1)  cadastro e autenticação de usuário (RF01);

2)  gerenciamento de membros da família (RF02);

3)  calendário vacinal por faixa etária, com fonte e versão (RF03);

4)  registro de doses e ciclo de vida da dose (RF04);

5)  lembretes e sinalização de doses atrasadas (RF05);

6)  busca semântica por voz (RF06);

7)  chatbot de dúvidas com classificação de intenções (RF07);

8)  histórico de doses (RF08);

9)  consentimento, privacidade e exclusão de dados (RF09).

### 5.2 Versão completa

Funcionalidades desejáveis, a serem implementadas apenas se o cronograma permitir e sem comprometer as entregas do MVP: mapa de unidades de saúde próximas (RF10), exportação da carteira em PDF (RF11) e compartilhamento com outro cuidador autorizado (RF12).

### 5.3 Fora do escopo

1)  diagnóstico, prescrição ou qualquer orientação médica individualizada;

2)  substituição da caderneta oficial de vacinação ou de comprovante emitido pelo serviço de saúde;

3)  integração com sistemas oficiais de registro de vacinação, por depender de disponibilidade e autorização de terceiros;

4)  agendamento de vacinação em unidades de saúde;

5)  respostas geradas por IA generativa;

6)  uso offline completo.

## 6 REQUISITOS

### 6.1 Requisitos funcionais

Os requisitos funcionais (RF) descrevem o que o sistema fará. Cada RF está associado a pelo menos uma persona e a pelo menos um requisito não funcional (RNF), conforme o modelo de Documentação Técnica da disciplina. Os RNF06 (manutenibilidade) e RNF08 (portabilidade) são transversais e se aplicam a todo o sistema.

**Quadro 4 – Requisitos funcionais**

| **ID** | **Requisito**                                                                                                                                     | **Personas**  | **RNF associados**  | **Escopo** |
|--------|---------------------------------------------------------------------------------------------------------------------------------------------------|---------------|---------------------|------------|
| RF01   | Cadastrar-se e autenticar-se no sistema (e-mail e senha), com sessão segura.                                                                      | PE1, PE2, PE3 | RNF02, RNF03, RNF09 | MVP        |
| RF02   | Gerenciar membros da família (incluir, editar e excluir), informando nome, data de nascimento e, opcionalmente, grupo específico (como gestante). | PE1, PE3      | RNF03, RNF04        | MVP        |
| RF03   | Exibir o calendário vacinal de cada membro conforme a faixa etária, com base no calendário oficial do PNI, indicando fonte e versão.              | PE1, PE2, PE3 | RNF04, RNF10        | MVP        |
| RF04   | Registrar doses e controlar seu ciclo de vida (pendente, agendada, aplicada, atrasada e cancelada).                                               | PE1, PE3      | RNF01, RNF07, RNF10 | MVP        |
| RF05   | Enviar lembretes de doses próximas e sinalizar doses atrasadas.                                                                                   | PE1, PE2, PE3 | RNF01, RNF05        | MVP        |
| RF06   | Realizar busca semântica por voz sobre vacinas e calendário.                                                                                      | PE2, PE1      | RNF01, RNF04, RNF09 | MVP        |
| RF07   | Responder dúvidas frequentes por chatbot baseado em regras com classificação de intenções (TF-IDF e SVM).                                         | PE1, PE2, PE3 | RNF01, RNF04, RNF10 | MVP        |
| RF08   | Consultar o histórico de doses de cada membro.                                                                                                    | PE1, PE3      | RNF01, RNF04        | MVP        |
| RF09   | Gerenciar consentimento e privacidade, incluindo a exclusão da conta e dos dados.                                                                 | PE1, PE2, PE3 | RNF02, RNF03        | MVP        |
| RF10   | Localizar unidades de saúde próximas em mapa.                                                                                                     | PE1, PE3      | RNF01, RNF04        | Completa   |
| RF11   | Exportar a carteira de vacinação em PDF.                                                                                                          | PE1, PE3      | RNF03, RNF10        | Completa   |
| RF12   | Compartilhar a carteira com outro cuidador autorizado.                                                                                            | PE3           | RNF02, RNF03        | Completa   |

Fonte: Elaborado pelo autor (2026).

### 6.2 Requisitos não funcionais

Os requisitos não funcionais (RNF) descrevem como o sistema deve se comportar e como cada qualidade será verificada. A acessibilidade segue as diretrizes WCAG 2.1 (WORLD WIDE WEB CONSORTIUM, 2018) e o tratamento de dados segue a Lei Geral de Proteção de Dados Pessoais (BRASIL, 2018).

**Quadro 5 – Requisitos não funcionais**

| **ID** | **Categoria**                   | **Descrição**                                                                                                                                                                              | **Verificação**                                                             |
|--------|---------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| RNF01  | Desempenho                      | Pelo menos 90% das requisições da API devem responder em menos de 3 segundos.                                                                                                              | Métricas do Application Insights e testes de carga leves.                   |
| RNF02  | Segurança                       | Comunicação por HTTPS; autenticação gerenciada pela plataforma de identidade; tokens em armazenamento seguro no app; segredos no Key Vault; validação de entradas; checklist OWASP Top 10. | Testes de segurança básicos e revisão de configuração.                      |
| RNF03  | Privacidade e LGPD              | Coleta mínima de dados, sem CPF nem Cartão Nacional de Saúde; consentimento explícito; exclusão de conta e dados.                                                                          | Revisão do modelo de dados e testes dos fluxos de consentimento e exclusão. |
| RNF04  | Usabilidade e acessibilidade    | Contraste, tamanho de fonte e áreas de toque conforme WCAG 2.1 nível AA; linguagem simples; fonte ampliável.                                                                               | Checklist de acessibilidade nas telas principais.                           |
| RNF05  | Disponibilidade e monitoramento | Logs, métricas e alertas básicos em serviço de monitoramento da nuvem.                                                                                                                     | Painéis e alertas no Application Insights.                                  |
| RNF06  | Manutenibilidade                | TypeScript em modo estrito, ESLint e Prettier, documentação TSDoc gerada com TypeDoc e decisões registradas em ADRs.                                                                       | Pipeline de CI (lint, build e documentação).                                |
| RNF07  | Testabilidade e qualidade       | Testes automatizados em Jest com 100% de aprovação no pipeline e cobertura mínima de 80% (meta própria: 90%).                                                                              | Relatório de cobertura do Jest no GitHub Actions.                           |
| RNF08  | Portabilidade                   | Execução do projeto em contêiner Docker.                                                                                                                                                   | Subida do ambiente local por Docker.                                        |
| RNF09  | Multiplataforma                 | Aplicativo para Android, iOS e web a partir de uma base de código única.                                                                                                                   | Execução em emulador, dispositivo e navegador.                              |
| RNF10  | Integridade dos dados vacinais  | Calendário versionado, com fonte e data; respostas do chatbot curadas, sem conteúdo gerado livremente; aviso de que o app não substitui a caderneta nem a orientação profissional.         | Testes de conteúdo do calendário e das respostas do chatbot.                |

Fonte: Elaborado pelo autor (2026).

## 7 PREMISSAS E RESTRIÇÕES

### 7.1 Premissas

1)  o projeto será desenvolvido individualmente, com aceite do orientador;

2)  as datas de entrega consideradas são 12/11 (Qualidade e Testes), 16/11 (PLN) e 19/11 (entrega total), conforme informado pelo autor;

3)  a infraestrutura utilizará a plataforma Microsoft Azure em sua totalidade;

4)  os testes automatizados serão escritos em Jest;

5)  o usuário dispõe de smartphone ou navegador com acesso à internet.

### 7.2 Restrições

1)  prazo de aproximadamente seis semanas até a entrega total;

2)  equipe de uma única pessoa, responsável por todos os papéis do processo;

3)  custos controlados, priorizando camadas gratuitas ou de baixo custo da Azure;

4)  o sistema não oferece diagnóstico nem orientação médica individualizada e não substitui a caderneta oficial;

5)  dados de vacinação são dados pessoais sobre saúde e, portanto, sensíveis; o tratamento deve seguir a LGPD, com coleta mínima, consentimento e, no caso de crianças e adolescentes, consentimento de responsável e tratamento em seu melhor interesse (BRASIL, 2018);

6)  todo o código será escrito em TypeScript, com exceção do serviço de PLN, que utilizará Python.

## 8 DECISÕES TÉCNICAS PRELIMINARES

O Quadro 6 reúne as decisões técnicas tomadas até o momento. Cada uma será detalhada em um registro de decisão de arquitetura (ADR) e, depois de implementada, na Documentação Técnica, com as versões efetivamente utilizadas.

**Quadro 6 – Decisões técnicas preliminares**

| **ID**  | **Decisão**                                                                                               | **Justificativa**                                                                                                                      | **Status**  |
|---------|-----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|-------------|
| ADR-001 | API em Azure Functions (Node.js com TypeScript), sem Express.                                             | Alinha-se ao requisito de usar a Azure por completo; modelo serverless; gatilho por tempo para os lembretes; execução local em Docker. | Proposta    |
| ADR-002 | Serviço de PLN separado, em Azure Function com Python e scikit-learn.                                     | TF-IDF e SVM são usuais em Python; separação de responsabilidades em relação à API principal.                                          | Proposta    |
| ADR-003 | Reconhecimento de voz com Azure AI Speech.                                                                | Serviço gerenciado na mesma nuvem; evita treinar um modelo próprio de fala.                                                            | Proposta    |
| ADR-004 | Banco relacional Azure SQL Database.                                                                      | Dados relacionais (usuário, membro, vacina, dose) e DER claro para a documentação.                                                     | Proposta    |
| ADR-005 | Autenticação com Microsoft Entra External ID.                                                             | Identidade gerenciada na nuvem, conforme o requisito de autenticação pela plataforma.                                                  | A verificar |
| ADR-006 | App com Expo, NativeWind e Expo Router; Context API para sessão e tema; TanStack Query para dados da API. | Base única para Android, iOS e web; separa estado global leve do cache de dados do servidor.                                           | Proposta    |
| ADR-007 | Monorepo com npm workspaces e pacote compartilhado de tipos e esquemas Zod.                               | Contratos únicos entre app e API; manutenção simplificada.                                                                             | Proposta    |
| ADR-008 | Segredos no Azure Key Vault e monitoramento no Application Insights.                                      | Segurança e observabilidade gerenciadas na nuvem.                                                                                      | Proposta    |

Fonte: Elaborado pelo autor (2026).

Antes de confirmar cada decisão, devem ser verificadas no portal da Azure as condições de uso e de custo dos serviços, como as camadas gratuitas do Azure SQL Database e a disponibilidade do Microsoft Entra External ID.

## 9 ENTREGAS E CRONOGRAMA

### 9.1 Entregas obrigatórias

O Quadro 7 consolida as entregas exigidas pelas disciplinas do PI-VI (FACULDADE DE TECNOLOGIA DE VOTORANTIM, 2026), com as datas informadas pelo autor.

**Quadro 7 – Entregas obrigatórias**

| **Data**    | **Disciplina**                                                 | **Entregáveis**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|-------------|----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 12/11       | Qualidade e Testes de Software                                 | Requisitos funcionais e não funcionais; plano de teste (objetivo, itens, estratégia, critérios de entrada e saída, recursos e cronograma); papéis do processo de teste; teste de caixa preta por partição de equivalência ou análise de valor limite, com casos e tabela de execução; diagrama UML de estados de uma funcionalidade com mais de três estados (exceto login) e casos de teste de estados, transições e caminhos; pipeline no GitHub com workflow a cada push; testes automatizados com cobertura mínima de 80%. |
| 16/11       | Processamento de Linguagem Natural                             | Reconhecimento de voz com busca semântica por voz; chatbot baseado em regras com classificação de intenções por TF-IDF e SVM.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 19/11       | Laboratório de Desenvolvimento Multiplataforma (entrega total) | Projeto funcional, preferencialmente na Azure e em contêiner Docker; Product Backlog e cerimônias Scrum documentados; documentações técnica, de desenvolvimento e para o usuário em PDF na pasta doctos do repositório; panfleto em uma folha A4; arquivo zip do repositório; apresentação no formato mostra.                                                                                                                                                                                                                  |
| A confirmar | Computação em Nuvem II                                         | Análise situacional e documentação técnica final em PDF, com estimativa de custo mensal em produção (datas a confirmar com o professor).                                                                                                                                                                                                                                                                                                                                                                                       |

Fonte: Elaborado pelo autor (2026).

### 9.2 Plano semanal

O Quadro 8 distribui o trabalho em seis semanas, planejadas de trás para frente a partir das datas de entrega. A documentação de desenvolvimento (horas, atividades, reuniões e aprendizados) será preenchida ao longo do projeto, e não apenas ao final.

**Quadro 8 – Plano semanal**

| **Semana** | **Período**   | **Foco**                                                                                                                                              |
|------------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Semana 1   | 06/10 a 12/10 | Fundação: visão e escopo, requisitos, Product Backlog, ADRs, UML de estados e plano de teste.                                                         |
| Semana 2   | 13/10 a 19/10 | Repositório, infraestrutura na Azure, pipeline de CI, autenticação e banco de dados.                                                                  |
| Semana 3   | 20/10 a 26/10 | Membros, calendário vacinal e ciclo de vida da dose; casos de teste de caixa preta.                                                                   |
| Semana 4   | 27/10 a 02/11 | Lembretes, busca por voz, testes automatizados com Jest e pipeline em execução.                                                                       |
| Semana 5   | 03/11 a 09/11 | Chatbot (dataset de intenções, treino e avaliação), cobertura de 90% e documentação técnica.                                                          |
| Semana 6   | 10/11 a 19/11 | Fechamento de Qualidade (12/11) e PLN (16/11); depois, Docker, documentações de usuário e de desenvolvimento, panfleto, zip e ensaio da apresentação. |

Fonte: Elaborado pelo autor (2026).

## 10 RISCOS E MITIGAÇÕES

O Quadro 9 lista os principais riscos técnicos, de prazo e de conformidade, com probabilidade, impacto e ações de mitigação. A lista será revisada a cada semana.

**Quadro 9 – Riscos e mitigações**

| **ID** | **Risco**                                                                   | **Prob. / Impacto** | **Mitigação**                                                                                                                                                         |
|--------|-----------------------------------------------------------------------------|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| R1     | Prazo curto com um único desenvolvedor.                                     | Alta / Alto         | Escopo enxuto (MVP); priorização no backlog; funcionalidades extras apenas se houver folga; revisão semanal do cronograma.                                            |
| R2     | Curva de aprendizado na Azure (Functions, SQL, Entra External ID e Speech). | Média / Alto        | Protótipo ponta a ponta na semana 2; uso da documentação oficial; simplificação de serviços, registrada em ADR, se necessário.                                        |
| R3     | Custos inesperados na Azure.                                                | Média / Médio       | Camadas gratuitas ou de menor custo; alertas de orçamento; revisão semanal dos recursos ativos.                                                                       |
| R4     | Conjunto de dados pequeno para o classificador de intenções.                | Alta / Médio        | Criar e revisar manualmente exemplos por intenção; validação cruzada; relatar F1 e limitações; resposta padrão quando a confiança for baixa.                          |
| R5     | Erro ou desatualização do calendário vacinal.                               | Média / Alto        | Usar apenas fonte oficial, com versão e data; dados do calendário isolados e versionados; aviso de que o app não substitui a caderneta nem a orientação profissional. |
| R6     | Exposição de dados pessoais e de saúde.                                     | Baixa / Alto        | Coleta mínima (sem CPF e CNS); criptografia em trânsito e em repouso; segredos no Key Vault; consentimento e exclusão de conta.                                       |
| R7     | Divergência de exigências entre disciplinas, como a ferramenta de testes.   | Média / Médio       | Registrar por escrito a confirmação do professor sobre o uso de Jest; manter as exigências de cada disciplina no backlog.                                             |
| R8     | Mudança de condições ou indisponibilidade de serviços da Azure.             | Baixa / Médio       | Verificar as condições no portal antes de decidir; documentar alternativas nos ADRs.                                                                                  |

Fonte: Elaborado pelo autor (2026).

## 11 CONSIDERAÇÕES FINAIS E PRÓXIMOS PASSOS

Este documento fixa a base do projeto e deve ser mantido atualizado e versionado no repositório, de modo que toda mudança de escopo ou de decisão técnica seja registrada. Como próximos passos, estão previstos:

1)  criar o Product Backlog no Jira, em projeto Scrum, com épicos e histórias derivados dos requisitos funcionais;

2)  elaborar os diagramas UML (casos de uso, classes, sequência e estados da dose) e o diagrama de entidade-relacionamento;

3)  definir o design system (cores, tipografia, espaçamento e componentes) para mobile e web;

4)  redigir o plano de teste e os casos de teste de caixa preta;

5)  abrir o repositório com CI, TypeScript em modo estrito, ESLint, Prettier e TypeDoc;

6)  registrar as decisões técnicas em ADRs.

## REFERÊNCIAS

AGUIAR, F.; CAROLI, P. **Product Backlog Building**: um guia prático para criação e refinamento de backlog para produtos de sucesso. Rio de Janeiro: Caroli, 2021.

BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018. Disponível em: https://www.planalto.gov.br/ccivil_03/\_ato2015-2018/2018/lei/l13709.htm. Acesso em: 6 out. 2026.

BRASIL. Ministério da Saúde. **Programa Nacional de Imunizações (PNI)**. Brasília, DF: Ministério da Saúde, \[s. d.\]. Disponível em: https://www.gov.br/saude/pt-br. Acesso em: 6 out. 2026.

BRASIL cumpre meta de cobertura só para duas vacinas de recém-nascidos. **O Popular**, Goiânia, \[s. d.\]. Disponível em: https://opopular.com.br/cidades/brasil-cumpre-meta-de-cobertura-so-para-duas-vacinas-de-recem-nascidos-1.3362168. Acesso em: 6 out. 2026.

FACULDADE DE TECNOLOGIA DE VOTORANTIM. **Projeto Interdisciplinar VI (PI-VI)**: Curso Superior de Desenvolvimento de Software Multiplataforma. Versão 1.0. Votorantim: Fatec Votorantim, 2026.

ORGANIZAÇÃO DAS NAÇÕES UNIDAS NO BRASIL. **Objetivos de Desenvolvimento Sustentável**. Brasília, DF: ONU Brasil, \[s. d.\]. Disponível em: https://brasil.un.org/pt-br/sdgs. Acesso em: 6 out. 2026.

UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL. Brasil enfrenta queda na cobertura vacinal e aumento de doenças preveníveis. **Humanista**, Porto Alegre, \[2025\]. Disponível em: https://www.ufrgs.br/humanista/?p=27723. Acesso em: 6 out. 2026.

WORLD WIDE WEB CONSORTIUM. **Web Content Accessibility Guidelines (WCAG) 2.1**. \[S. l.\]: W3C, 2018. Disponível em: https://www.w3.org/TR/WCAG21/. Acesso em: 6 out. 2026.
