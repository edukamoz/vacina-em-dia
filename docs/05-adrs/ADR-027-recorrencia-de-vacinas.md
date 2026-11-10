# ADR-027: Recorrência de vacinas e aviso antecipado por dose

- **Status:** aceito em 10/11/2026 (decisão do autor: permitir as duas formas de contar a próxima data)
- **Item do backlog:** B69
- **Relacionados:** ADR-016 (dose avulsa), ADR-017 (lembretes), `docs/03-uml/estados-dose.md`, CLAUDE.md §8 (ciclo de vida da dose; calendário só de fonte oficial).

## Contexto

Há vacinas que se repetem (influenza todo ano, reforço a cada N meses). Hoje cada dose é única: ao aplicar, a pessoa precisa cadastrar a próxima à mão. O autor pediu poder cadastrar a periodicidade na hora de criar a vacina e ser avisado antes de cada repetição, com o aviso configurável.

O ciclo de vida da dose (5 estados e 12 transições, CLAUDE.md §8) é uma regra fechada e testada; a recorrência não deve mexer nele.

## Decisão

1. **A recorrência fica fora da máquina de estados.** Nenhuma transição muda. Ao registrar a aplicação (`APPLY`) de uma dose que se repete, o serviço cria a próxima dose **Pendente**, que nasce pela transição T1 já existente.
2. **A repetição é um dado da dose** (`recurrence`), copiado de uma dose para a seguinte: unidade (dia, semana, mês ou ano), a cada N, forma de contar, primeira data prevista (`anchorDate`), data final opcional e máximo de doses opcional. Doses da mesma série compartilham `seriesId` e têm `occurrence` (1, 2, 3...). **Sem tabela nova e sem chave estrangeira** (migração 006).
3. **Duas formas de contar a próxima data**, escolhidas por dose:
   - `APPLICATION`: da data em que a dose foi **aplicada** ("6 meses depois de tomar"). Aplicar com atraso empurra as seguintes.
   - `SCHEDULE`: de uma **grade fixa** que parte da primeira data prevista ("todo ano em março"). A n-ésima data é sempre calculada a partir do início (31/01, 28/02, 31/03: o mês curto não desloca as datas seguintes) e a próxima é a primeira data da grade depois da aplicação **e** da data prevista: tomar antes do prazo não antecipa a próxima, e tomar muito depois pula as que já passaram.
4. **Quando a série termina:** na data final, no máximo de doses (2 a 120) ou no teto de segurança de 120 doses por série, o que vier primeiro. Limites de "a cada N": 365 dias, 104 semanas, 120 meses, 50 anos.
5. **Cancelar uma dose que se repete** pede o alcance: **só esta** (`THIS`, padrão: a dose é pulada e a próxima nasce a partir da data prevista dela, ou de hoje se já passou) ou **a série** (`SERIES`: nenhuma nova dose é criada).
6. **Aviso antecipado por dose** (`remindDaysBefore`, 0 a 60; vazio usa 7), valendo para toda dose avulsa, repetida ou não. O aviso no app aparece a partir dessa antecedência; o e-mail diário cita a dose no próprio dia e na antecedência escolhida. O e-mail continua só com quantidades (ADR-017).
7. **Só dose avulsa por enquanto.** A restrição do banco impede repetição em dose oficial (`rule_id` preenchido). Dar repetição às linhas do calendário oficial que já trazem a periodicidade no texto (influenza anual, covid semestral) é um passo seguinte, e só com o que o texto oficial diz.
8. **A série conta como uma só** no limite de 30 doses avulsas por pessoa.
9. **Atomicidade e duplicidade:** a dose aplicada e a próxima são gravadas na mesma transação; o serviço não cria a próxima se ela já existe, e um índice único `(series_id, occurrence)` impede a duplicata em aplicações simultâneas.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Nova transição "reabrir" (Aplicada para Pendente) | Altera a máquina de estados fechada e quebra a regra de que Aplicada é final. |
| Tabela `dose_series` com chave estrangeira | Mais uma tabela e risco de caminhos de cascata no SQL Server, sem ganho para o tamanho dos dados; a regra copiada na dose é simples de ler e de testar. |
| Criar todas as doses futuras de uma vez | Polui a lista, trava o limite de doses e obriga a refazer tudo ao mudar a regra. |
| Rotina agendada que gera as próximas | Mais um gatilho; gerar na aplicação é determinístico e testável com o relógio injetado. |
| Só a contagem a partir da aplicação | O autor pediu as duas; "todo ano em março" não se expressa só com ela. |

## Consequências

- **Migração `006-recorrencia-de-vacinas.sql` obrigatória antes do deploy** da API que a usa (o deploy não aplica migrações). Ela só acrescenta colunas anuláveis, restrições e um índice; nenhuma dose existente muda.
- O contrato da API cresce de forma compatível: `recurrence`, `occurrence` e `remindDaysBefore` na dose (opcionais), `recurrence` e `remindDaysBefore` na dose avulsa, `scope` no cancelamento. O app antigo continua funcionando.
- A regra é pura (`nextRecurrenceDate`, `addPeriod` em `@vacina/shared`), sem ler o relógio; casos `CT-REC-*`.
- O app precisa de telas para escolher a repetição, o aviso e o alcance do cancelamento (segunda etapa do B69).
- **Limite honesto:** aplicar uma dose muito antiga com `APPLICATION` gera uma próxima já vencida, que aparece Atrasada; é o comportamento esperado (a pessoa está atrasada), e não pula períodos.

## Verificações e fontes

- Regra e casos de teste: `packages/shared/src/domain/recurrence.test.ts` (CT-REC-01 a 27 e 30 a 41), `packages/shared/src/schemas/recorrencia.test.ts` (CT-REC-50 a 86), `apps/api/src/services/recorrencia.test.ts` (CT-REC-90 a 106), `apps/api/src/services/reminder-service.test.ts` (CT-REC-110 a 113) e `apps/api/src/repositories` (CT-REC-120 a 125 e 130).
- A periodicidade das linhas oficiais (influenza "1 dose anual a cada temporada", covid de idosos "1 dose semestral", dT "reforços periódicos") está no texto do calendário em `packages/shared/src/calendar/pni-2026.ts`; nada foi acrescentado de memória.
