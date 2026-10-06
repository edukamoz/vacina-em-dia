# Vacina em Dia: Requisitos (RF01 a RF12 e RNF01 a RNF10)

> Extraído do Documento de Visão e Escopo (`01-visao-e-escopo.md`, seção 6). Em caso de divergência, vale este arquivo e o documento deve ser atualizado.
> Personas: PE1 Mariana, PE2 Sr. José, PE3 Carla (ver seção 4 do documento de visão).

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
