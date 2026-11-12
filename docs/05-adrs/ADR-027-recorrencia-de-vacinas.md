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
- O app ganhou as telas (segunda parte do B69): no formulário da dose avulsa, a seção "Esta vacina se repete" (a cada N dias, semanas, meses ou anos; contar da aplicação ou em datas fixas; terminar nunca, em uma data ou depois de N doses) e o aviso antecipado; no detalhe, a repetição, o número da dose, a data da próxima dose da série e a pergunta "só esta dose ou parar de repetir" ao cancelar. Casos `CT-APP-REP01` a `33` (lógica) e `CT-APP-REP40` a `56` (telas).
- **Limite honesto:** aplicar uma dose muito antiga com `APPLICATION` gera uma próxima já vencida, que aparece Atrasada; é o comportamento esperado (a pessoa está atrasada), e não pula períodos.

## Atualização de 10/11/2026: repetição nas linhas do calendário oficial

O passo seguinte do item 7 foi dado. Uma linha oficial só se repete quando o **texto oficial transcrito** diz a periodicidade; nada foi deduzido nem preenchido de memória (CLAUDE.md §8), e cada repetição cita o trecho em `basis`:

| Linha | Repetição | Texto oficial |
|---|---|---|
| `idoso-influenza` | todo ano | linha do idoso: "1 dose anual a cada temporada" |
| `idoso-covid` | a cada 6 meses | linha do idoso: "1 dose semestral" |
| `crianca-influenza-1` | todo ano, **até antes dos 6 anos** | nota da criança: "Criança na faixa etária entre 6 meses e 5 anos, 11 meses e 29 dias deve ser vacinada todo ano" |

- **Como funciona:** ao aplicar uma dessas doses, a próxima nasce Pendente **na mesma linha** (mesmo `ruleId`), contando da **data da aplicação**. A série ganha identificador e número na primeira aplicação; a regra não é guardada na dose (vem da linha), então **não há migração**. O limite de idade da criança vira data final (o dia anterior ao 6º aniversário), e a próxima dose não é criada se cair depois dela. Cancelar pergunta o alcance, como na dose avulsa.
- **O que ficou de fora, de propósito:**
  - **dT** (adulto e idoso, "3 doses + reforços periódicos"): o app trata a linha como **uma** dose; repetir a cada 10 anos depois da primeira aplicação estaria errado enquanto a série de 3 doses não termina. A nota oficial fala em reforço a cada 10 anos, mas isso exige separar a série primária dos reforços, o que o calendário do app ainda não faz.
  - **Gestante** ("por temporada", "a cada gestação"): depende da gestação, não de um intervalo fixo.
  - **Segunda dose da criança que toma influenza pela primeira vez** (30 dias de intervalo): a linha do app tem só a "1ª dose".
- **Aproximação a conhecer:** "a cada temporada" é sazonal (a campanha tem época), e o app conta um ano da aplicação. Se a pessoa tomar fora da época, a próxima data pode não coincidir com a campanha.
- **Efeito na cobertura:** cada aplicação cria uma próxima dose Pendente, então os números de "aplicadas de total" das pessoas com essas linhas nunca chegam a 100%; é o comportamento esperado de uma dose que se repete.
- Casos `CT-OFIC-01` a `12` (calendário e regra), `CT-OFIC-20` a `31` (serviço), `CT-OFIC-40` (contrato dos repositórios) e `CT-OFIC-50` a `53` (telas).

## Verificações e fontes

- Regra e casos de teste: `packages/shared/src/domain/recurrence.test.ts` (CT-REC-01 a 27 e 30 a 41), `packages/shared/src/schemas/recorrencia.test.ts` (CT-REC-50 a 86), `apps/api/src/services/recorrencia.test.ts` (CT-REC-90 a 106), `apps/api/src/services/reminder-service.test.ts` (CT-REC-110 a 113) e `apps/api/src/repositories` (CT-REC-120 a 125 e 130).
- A periodicidade das linhas oficiais (influenza "1 dose anual a cada temporada", covid de idosos "1 dose semestral", dT "reforços periódicos") está no texto do calendário em `packages/shared/src/calendar/pni-2026.ts`; nada foi acrescentado de memória.

## Atualização de 12/11/2026: vários avisos por dose

A pessoa pode marcar mais de uma antecedência (por exemplo 7 dias antes, 3 dias antes e no próprio dia; até 8 valores de 0 a 60, sem repetir). A API ganhou `remindDays` (lista, do maior para o menor) na dose e na dose avulsa; `remindDaysBefore` continua existindo e guarda o maior valor, e o app antigo segue funcionando. No banco, a migração 009 acrescenta `dose.remind_days` (texto com vírgulas). O e-mail diário cita a dose em cada antecedência escolhida e no próprio dia; os avisos do aparelho agendam um por antecedência. Sem lista, vale o aviso único, e sem ele o padrão de 7 dias. Casos `CT-LEM-50` a `56`, `CT-REC-91b`, `CT-REC-131`, `CT-APP-REP18b` a `34`, `CT-AVISO-02b`.
