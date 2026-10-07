# ADR-017: Lembretes por aviso no app e e-mail diário (RF05)

- **Status:** aceito em 07/10/2026 (decisão do autor)
- **Item do Jira:** SCRUM-19
- **Substitui em parte:** o diagrama `docs/03-uml/sequencia-lembrete.md` (SCRUM-31), que previa push do Expo.

## Contexto

O RF05 pede lembretes de doses próximas e sinalização de doses atrasadas. O desenho do SCRUM-31 usava notificação push do Expo e, na web, só a sinalização no app. O push exige um serviço externo novo, build de desenvolvimento do app e aparelho real para testar, e não funciona na web nem no emulador sem configuração extra. O Brevo já está aprovado e em uso (ADR-015) e funciona nas duas plataformas.

## Decisão

1. **Aviso no app (sempre):** `GET /api/reminders` devolve as doses que pedem atenção em toda a família: **atrasadas**, **de hoje** e **dos próximos 7 dias** (Pendentes ou Agendadas). A aba Doses mostra o cartão "Lembretes". Aplicadas e canceladas nunca entram. Uma dose Pendente com data já passada que, pelo calendário, não atrasa (por exemplo, conforme o histórico) também não entra.
2. **E-mail diário (opcional, ligado por padrão):** uma função agendada (`sendDailyReminders`, 11h UTC = 8h em Brasília, sem horário de verão) envia **no máximo um e-mail por conta por dia** a quem tem dose Pendente ou Agendada com data de **hoje** ou **daqui a exatamente 7 dias**. Assim cada dose gera no máximo dois e-mails. Doses atrasadas não geram e-mail diário, para não insistir todo dia; elas aparecem no app.
3. **Privacidade:** o e-mail traz **só quantidades** ("1 vacina é para hoje"), sem nome de pessoa nem de vacina, porque passa por serviço externo e pode ser lido na caixa de entrada. Os detalhes ficam no app, depois do login. A pessoa **desliga** o e-mail na aba Conta (`PUT /api/reminders/preferences`).
4. **Idempotência:** a tabela `reminder_log` (chave primária `conta + data`) reserva o dia **antes** de enviar. Duas execuções simultâneas enviam uma vez; se o envio falhar, a reserva é devolvida e a próxima execução tenta de novo. A exclusão da conta apaga o registro em cascata.
5. **Só contas com consentimento** e lembretes ligados entram na rotina (consulta no Azure SQL).
6. **Regra pura:** `reminderKind` e `isEmailReminderDay` ficam em `@vacina/shared` e recebem "hoje" por parâmetro.

## Consequências

- **Sem serviço novo e sem custo na Azure** além da função agendada (franquia gratuita); o e-mail usa o plano gratuito do Brevo (300 por dia, ADR-015), o que limita a rotina a 300 contas com lembrete no mesmo dia.
- **Migração `005-lembretes.sql` obrigatória antes do deploy:** adiciona `reminders_enabled` à conta e cria `reminder_log`. O deploy não aplica migrações (`scripts/db-migrate.mjs`). Sem ela, `GET /api/reminders` e a rotina falham.
- **Sem banco** (desenvolvimento em memória), a rotina não tem como listar contas e não envia e-mail; só a lista no app e a preferência funcionam.
- **Remetente:** o e-mail depende de `BREVO_API_KEY` e `EMAIL_SENDER_ADDRESS`; sem eles, a rotina registra falha e o app segue normal. Remetente de provedor gratuito pode cair em spam (ADR-015).
- **Limite honesto:** o envio real de e-mail e o gatilho de tempo na Azure não foram verificados com a chave real do Brevo; os testes usam cliente falso e relógio controlado.
- **Push do Expo** fica como evolução futura, se o autor aprovar o serviço e houver aparelho real para testar.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Push do Expo + aviso no app | Serviço externo novo, build de desenvolvimento e aparelho real; não cobre a web. |
| Só aviso no app | Não "envia" lembrete de fato (RF05). |
| E-mail todo dia para atrasadas | Insistência demais; o app já sinaliza. |
| Texto detalhado no e-mail (nome da vacina e da pessoa) | Dado de saúde em serviço externo e na caixa de entrada (LGPD). |
