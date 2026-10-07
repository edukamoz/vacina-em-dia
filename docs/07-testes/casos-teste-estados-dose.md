# Casos de teste: ciclo de vida da dose (RF04)

Entrega de Qualidade e Testes de Software (12/11), item 3: funcionalidade com mais de 3 estados (exceto login).
Itens do Jira: SCRUM-29 (este documento), SCRUM-18 (história RF04) e SCRUM-30 (automação em Jest).
Diagrama de origem: `docs/03-uml/estados-dose.md` (estados, transições T1 a T12 e guardas).

## Convenções

- **D** é a data de hoje. **D+n** e **D-n** são datas relativas (n dias depois ou antes de hoje).
- **Rotina de atraso** é a execução do gatilho por tempo que avalia prazos vencidos (T4 e T7). Nos testes automatizados, o relógio é controlado (fake timers), sem esperar tempo real.
- **Dados base** de todos os casos: usuário autenticado U1, membro M1 da conta de U1 e uma dose da "Vacina X" indicada para a faixa etária de M1.
- Uma transição inválida deve ser rejeitada com erro de transição (por exemplo, HTTP 409) e mensagem clara, mantendo o estado original.
- Cada caso tem um ID rastreável (CT-...), que aparecerá no nome do teste automatizado.

## 1. Cobertura de estados (5 de 5)

| ID | Estado | Pré-condição | Ação | Resultado esperado |
|---|---|---|---|---|
| CT-E01 | Pendente | M1 cadastrado, sem dose gerada | Gerar a dose do calendário (T1) | Dose criada no estado Pendente, com data prevista, sem data de agendamento nem de aplicação |
| CT-E02 | Agendada | Dose Pendente | Agendar para D+3 (T2) | Estado Agendada; data de agendamento D+3 gravada |
| CT-E03 | Atrasada | Dose Pendente com data prevista D-1 | Executar a rotina de atraso (T4) | Estado Atrasada; dose sinalizada como atrasada no app |
| CT-E04 | Aplicada | Dose Pendente | Registrar aplicação em D (T3) | Estado Aplicada; dose aparece no histórico com vacina, data e dose |
| CT-E05 | Cancelada | Dose Pendente | Cancelar com confirmação (T5) | Estado Cancelada; dose não gera mais lembretes |

## 2. Cobertura de transições (T1 a T12)

| ID | Transição | Pré-condição | Ação | Resultado esperado (estado final) |
|---|---|---|---|---|
| CT-T01 | T1: inicial para Pendente | M1 cadastrado, faixa etária com vacina X indicada | Gerar doses do calendário | Dose criada em Pendente |
| CT-T02 | T2: Pendente para Agendada | Dose Pendente | Agendar para D+7 | Agendada, data D+7 |
| CT-T03 | T3: Pendente para Aplicada | Dose Pendente | Registrar aplicação em D | Aplicada, no histórico |
| CT-T04 | T4: Pendente para Atrasada | Dose Pendente, prevista D-1 | Rotina de atraso | Atrasada |
| CT-T05 | T5: Pendente para Cancelada | Dose Pendente | Cancelar e confirmar | Cancelada |
| CT-T06 | T6: Agendada para Aplicada | Dose Agendada para D+2 | Registrar aplicação em D | Aplicada, no histórico |
| CT-T07 | T7: Agendada para Atrasada | Dose Agendada para D-1, sem aplicação | Rotina de atraso | Atrasada |
| CT-T08 | T8: Agendada para Pendente | Dose Agendada para D+5 | Desagendar | Pendente; data de agendamento removida |
| CT-T09 | T9: Agendada para Cancelada | Dose Agendada | Cancelar e confirmar | Cancelada |
| CT-T10 | T10: Atrasada para Agendada | Dose Atrasada | Reagendar para D+2 | Agendada, data D+2 |
| CT-T11 | T11: Atrasada para Aplicada | Dose Atrasada | Registrar aplicação tardia em D | Aplicada, no histórico |
| CT-T12 | T12: Atrasada para Cancelada | Dose Atrasada | Cancelar e confirmar | Cancelada |

## 3. Guardas das transições (valores limite)

| ID | Transição | Cenário | Resultado esperado |
|---|---|---|---|
| CT-G01 | T2 | Agendar com data igual a hoje (D) | Aceito: Agendada |
| CT-G02 | T2 | Agendar com data de ontem (D-1) | Rejeitado; permanece Pendente |
| CT-G03 | T3 | Registrar aplicação com data D | Aceito: Aplicada |
| CT-G04 | T3 | Registrar aplicação com data de amanhã (D+1) | Rejeitado; estado original mantido |
| CT-G05 | T4 | Dose Pendente com data prevista igual a hoje (D); rotina de atraso | Permanece Pendente (só vence se a data for anterior a hoje) |
| CT-G06 | T4 | Dose Pendente com data prevista D-1; rotina de atraso | Atrasada |
| CT-G07 | T10 | Reagendar com data de ontem (D-1) | Rejeitado; permanece Atrasada |
| CT-G08 | T5, T9, T12 | Cancelar sem confirmação do usuário | Cancelamento não ocorre; estado original mantido |
| CT-G09 | T1 | Gerar as doses duas vezes para o mesmo membro | Não duplica doses: continua uma por vacina/dose indicada |

## 4. Transições inválidas (devem ser rejeitadas)

| ID | Estado | Tentativa | Resultado esperado |
|---|---|---|---|
| CT-I01 | Aplicada | Agendar | Rejeitado; permanece Aplicada |
| CT-I02 | Aplicada | Cancelar | Rejeitado; permanece Aplicada |
| CT-I03 | Aplicada | Registrar aplicação novamente | Rejeitado; sem registro duplicado no histórico |
| CT-I04 | Cancelada | Agendar | Rejeitado; permanece Cancelada |
| CT-I05 | Cancelada | Registrar aplicação | Rejeitado; permanece Cancelada |
| CT-I06 | Pendente | Desagendar (não há agendamento) | Rejeitado; permanece Pendente |
| CT-I07 | Agendada | Agendar de novo (para alterar a data é preciso desagendar e agendar) | Rejeitado; permanece Agendada com a data original |
| CT-I08 | Atrasada | Desagendar (voltar a Pendente) | Rejeitado; permanece Atrasada |
| CT-I09 | Pendente com prazo não vencido | Forçar o estado Atrasada pela API | Rejeitado; o atraso só é definido pela rotina de prazo |

## 5. Cobertura de caminhos (sequências específicas)

Cada passo informa a ação e o estado esperado depois dela.

**CT-C01: aplicação direta (T1, T3)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose (T1) | Pendente |
| 2 | Registrar aplicação em D (T3) | Aplicada |

**CT-C02: agendar e aplicar (T1, T2, T6)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose (T1) | Pendente |
| 2 | Agendar para D+3 (T2) | Agendada |
| 3 | Registrar aplicação em D+3 (T6) | Aplicada |

**CT-C03: atrasar e aplicar tarde (T1, T4, T11)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose com data prevista D-1 (T1) | Pendente |
| 2 | Rotina de atraso (T4) | Atrasada |
| 3 | Registrar aplicação em D (T11) | Aplicada |

**CT-C04: agendar, atrasar, reagendar e aplicar (T1, T2, T7, T10, T6)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose (T1) | Pendente |
| 2 | Agendar para D+1 (T2) | Agendada |
| 3 | Avançar o relógio para D+2 e rodar a rotina de atraso (T7) | Atrasada |
| 4 | Reagendar para D+4 (T10) | Agendada |
| 5 | Registrar aplicação em D+4 (T6) | Aplicada |

**CT-C05: agendar, desagendar e cancelar (T1, T2, T8, T5)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose (T1) | Pendente |
| 2 | Agendar para D+5 (T2) | Agendada |
| 3 | Desagendar (T8) | Pendente |
| 4 | Cancelar e confirmar (T5) | Cancelada |

**CT-C06: atrasar e cancelar (T1, T4, T12)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose com data prevista D-1 (T1) | Pendente |
| 2 | Rotina de atraso (T4) | Atrasada |
| 3 | Cancelar e confirmar (T12) | Cancelada |

**CT-C07: ciclo entre Atrasada e Agendada (T1, T4, T10, T7, T10, T6)**

| Passo | Ação | Estado esperado |
|---|---|---|
| 1 | Gerar dose com data prevista D-1 (T1) | Pendente |
| 2 | Rotina de atraso (T4) | Atrasada |
| 3 | Reagendar para D+1 (T10) | Agendada |
| 4 | Avançar o relógio para D+2 e rodar a rotina (T7) | Atrasada |
| 5 | Reagendar para D+5 (T10) | Agendada |
| 6 | Registrar aplicação em D+5 (T6) | Aplicada |

## 6. Matriz de rastreabilidade

| Elemento | Casos que o cobrem |
|---|---|
| Estado Pendente | CT-E01, CT-C01 a CT-C07 |
| Estado Agendada | CT-E02, CT-C02, CT-C04, CT-C05, CT-C07 |
| Estado Atrasada | CT-E03, CT-C03, CT-C04, CT-C06, CT-C07 |
| Estado Aplicada | CT-E04, CT-C01 a CT-C04, CT-C07 |
| Estado Cancelada | CT-E05, CT-C05, CT-C06 |
| T1 | CT-T01, CT-G09, todos os caminhos |
| T2 | CT-T02, CT-G01, CT-G02, CT-C02, CT-C04, CT-C05 |
| T3 | CT-T03, CT-G03, CT-G04, CT-C01 |
| T4 | CT-T04, CT-G05, CT-G06, CT-C03, CT-C06, CT-C07 |
| T5 | CT-T05, CT-G08, CT-C05 |
| T6 | CT-T06, CT-C02, CT-C04, CT-C07 |
| T7 | CT-T07, CT-C04, CT-C07 |
| T8 | CT-T08, CT-C05 |
| T9 | CT-T09, CT-G08 |
| T10 | CT-T10, CT-G07, CT-C04, CT-C07 |
| T11 | CT-T11, CT-C03 |
| T12 | CT-T12, CT-G08, CT-C06 |
| Transições inválidas | CT-I01 a CT-I09 |

**Totais:** 5 casos de estado, 12 de transição, 9 de guarda, 9 de transição inválida e 7 de caminho, somando **42 casos de teste**. Todos os 5 estados e as 12 transições são cobertos.

## 7. Observações para a automação (SCRUM-30)

- A máquina de estados deve ser uma **função pura de domínio** (`estado atual + evento + data de hoje` resulta em novo estado ou erro). Assim, as seções 1 a 4 viram testes parametrizados com `test.each`, rápidos e sem banco.
- Os casos de caminho (seção 5) viram testes de sequência sobre a mesma função, e depois alguns viram testes de integração da API com Supertest.
- A data de hoje deve ser **injetada** (relógio controlado), nunca lida diretamente dentro da regra. Isso permite testar T4, T7 e os limites de data de forma determinística.
- O nome de cada teste deve conter o ID do caso (por exemplo, `CT-T04`), para ligar o relatório do Jest a este documento.
- A tabela de execução (resultado obtido e status de cada caso) é gerada na execução, junto com o SCRUM-28 e o SCRUM-30. A tabela de execução dos 42 casos, gerada do Jest, está em `execucao-estados-dose.md` (`node scripts/gerar-execucao-estados.mjs`). Para o teste de caixa preta de formulários e API, ver `caixa-preta-casos.md` e `caixa-preta-execucao.md`.
