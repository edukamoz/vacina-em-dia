# Tabela de execução dos casos de teste de estados da dose

> **Arquivo gerado** por `node scripts/gerar-execucao-estados.mjs`, que roda o Jest e lê os resultados reais. Não edite à mão.

- **Data da execução:** 2026-10-07
- **Versão do código (commit):** 91ce223
- **Resultado:** 42 de 42 casos aprovados
- **Especificação dos casos:** `docs/07-testes/casos-teste-estados-dose.md` (estados CT-E, transições CT-T, guardas CT-G, transições inválidas CT-I e caminhos CT-C).
- **Como ler:** "Execuções" é quantos testes automatizados com o ID passaram sobre quantos existem (um caso pode ter vários, por exemplo, um por origem inválida). "Onde" é o pacote do teste.

| ID | Caso | Execuções | Onde | Resultado |
|---|---|---|---|---|
| CT-C01 | aplicação direta (T1, T3) | 1 de 1 | packages/shared | Aprovado |
| CT-C02 | agendar e aplicar (T1, T2, T6) | 1 de 1 | packages/shared | Aprovado |
| CT-C03 | atrasar e aplicar tarde (T1, T4, T11) | 1 de 1 | packages/shared | Aprovado |
| CT-C04 | agendar, atrasar, reagendar e aplicar (T1, T2, T7, T10, T6) | 1 de 1 | packages/shared | Aprovado |
| CT-C05 | agendar, desagendar e cancelar (T1, T2, T8, T5) | 1 de 1 | packages/shared | Aprovado |
| CT-C06 | atrasar e cancelar (T1, T4, T12) | 1 de 1 | packages/shared | Aprovado |
| CT-C07 | ciclo entre Atrasada e Agendada (T1, T4, T10, T7, T10, T6) | 1 de 1 | packages/shared | Aprovado |
| CT-E01 | Pendente \| M1 cadastrado, sem dose gerada \| Gerar a dose do calendário (T1) | 1 de 1 | packages/shared | Aprovado |
| CT-E02 | Agendada \| Dose Pendente \| Agendar para D+3 (T2) | 1 de 1 | packages/shared | Aprovado |
| CT-E03 | Atrasada \| Dose Pendente com data prevista D-1 \| Executar a rotina de atraso (T4) | 1 de 1 | packages/shared | Aprovado |
| CT-E04 | Aplicada \| Dose Pendente \| Registrar aplicação em D (T3) | 1 de 1 | packages/shared | Aprovado |
| CT-E05 | Cancelada \| Dose Pendente \| Cancelar com confirmação (T5) | 1 de 1 | packages/shared | Aprovado |
| CT-G01 | T2 \| Agendar com data igual a hoje (D) | 1 de 1 | packages/shared | Aprovado |
| CT-G02 | T2 \| Agendar com data de ontem (D-1) | 1 de 1 | packages/shared | Aprovado |
| CT-G03 | T3 \| Registrar aplicação com data D | 1 de 1 | packages/shared | Aprovado |
| CT-G04 | T3 \| Registrar aplicação com data de amanhã (D+1) | 1 de 1 | packages/shared | Aprovado |
| CT-G05 | T4 \| Dose Pendente com data prevista igual a hoje (D); rotina de atraso | 1 de 1 | packages/shared | Aprovado |
| CT-G06 | T4 \| Dose Pendente com data prevista D-1; rotina de atraso | 1 de 1 | packages/shared | Aprovado |
| CT-G07 | T10 \| Reagendar com data de ontem (D-1) | 1 de 1 | packages/shared | Aprovado |
| CT-G08 | T5, T9, T12 \| Cancelar sem confirmação do usuário | 3 de 3 | packages/shared | Aprovado |
| CT-G09 | T1 \| Gerar as doses duas vezes para o mesmo membro | 1 de 1 | packages/shared | Aprovado |
| CT-I01 | Aplicada \| Agendar | 1 de 1 | packages/shared | Aprovado |
| CT-I02 | Aplicada \| Cancelar | 1 de 1 | packages/shared | Aprovado |
| CT-I03 | Aplicada \| Registrar aplicação novamente | 1 de 1 | packages/shared | Aprovado |
| CT-I04 | Cancelada \| Agendar | 1 de 1 | packages/shared | Aprovado |
| CT-I05 | Cancelada \| Registrar aplicação | 1 de 1 | packages/shared | Aprovado |
| CT-I06 | Pendente \| Desagendar (não há agendamento) | 1 de 1 | packages/shared | Aprovado |
| CT-I07 | Agendada \| Agendar de novo (para alterar a data é preciso desagendar e agendar) | 1 de 1 | packages/shared | Aprovado |
| CT-I08 | Atrasada \| Desagendar (voltar a Pendente) | 1 de 1 | packages/shared | Aprovado |
| CT-I09 | Pendente com prazo não vencido \| Forçar o estado Atrasada pela API | 2 de 2 | packages/shared | Aprovado |
| CT-T01 | T1: inicial para Pendente \| M1 cadastrado, faixa etária com vacina X indicada \| Gerar doses do calendário | 1 de 1 | packages/shared | Aprovado |
| CT-T02 | T2: Pendente para Agendada \| Dose Pendente \| Agendar para D+7 | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T03 | T3: Pendente para Aplicada \| Dose Pendente \| Registrar aplicação em D | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T04 | T4: Pendente para Atrasada \| Dose Pendente, prevista D-1 \| Rotina de atraso | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T05 | T5: Pendente para Cancelada \| Dose Pendente \| Cancelar e confirmar | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T06 | T6: Agendada para Aplicada \| Dose Agendada para D+2 \| Registrar aplicação em D | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T07 | T7: Agendada para Atrasada \| Dose Agendada para D-1, sem aplicação \| Rotina de atraso | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T08 | T8: Agendada para Pendente \| Dose Agendada para D+5 \| Desagendar | 1 de 1 | packages/shared | Aprovado |
| CT-T09 | T9: Agendada para Cancelada \| Dose Agendada \| Cancelar e confirmar | 1 de 1 | packages/shared | Aprovado |
| CT-T10 | T10: Atrasada para Agendada \| Dose Atrasada \| Reagendar para D+2 | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T11 | T11: Atrasada para Aplicada \| Dose Atrasada \| Registrar aplicação tardia em D | 2 de 2 | packages/shared, apps/api | Aprovado |
| CT-T12 | T12: Atrasada para Cancelada \| Dose Atrasada \| Cancelar e confirmar | 2 de 2 | packages/shared, apps/api | Aprovado |
