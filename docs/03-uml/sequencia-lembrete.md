# Diagrama de sequência: marcar atrasos e enviar lembretes (RF05 e RF04)

Item do Jira: SCRUM-31. Este fluxo é disparado por **tempo**, não pelo usuário. Ele aplica o atraso (T4 e T7), que só a rotina pode fazer, e envia os lembretes por notificação push.

```mermaid
sequenceDiagram
    autonumber
    participant T as Gatilho de tempo (diário, horário de Brasília)
    participant H as Função agendada
    participant S as Service de lembretes
    participant D as Domain (máquina de estados)
    participant R as Repository
    participant DB as Azure SQL
    participant X as Serviço de push do Expo
    participant A as App do usuário

    T->>H: Dispara a rotina diária
    H->>S: runDailyRoutine(hoje)
    Note over H,S: "hoje" vem do relógio injetado, em America/Sao_Paulo

    rect rgb(235, 245, 255)
    Note over S,DB: Parte 1: atrasos (T4 e T7)
    S->>R: findOverdueCandidates(hoje)
    R->>DB: Doses PENDING com data prevista < hoje e SCHEDULED com agendamento < hoje
    DB-->>R: lista de doses
    loop para cada dose
        S->>D: transition(estado, MARK_OVERDUE, hoje)
        D-->>S: novo estado OVERDUE
        S->>R: saveTransition(dose, OVERDUE, MARK_OVERDUE, SCHEDULER)
        R->>DB: UPDATE da dose + INSERT do evento (uma transação)
    end
    end

    rect rgb(240, 250, 240)
    Note over S,X: Parte 2: lembretes
    S->>R: findRemindable(hoje, antecedência)
    R->>DB: Doses próximas ou atrasadas, sem lembrete igual já registrado na data
    DB-->>R: doses com os dispositivos do usuário
    loop para cada dose e dispositivo
        S->>X: Envia a notificação (texto genérico, sem dado de saúde detalhado)
        alt envio aceito
            X-->>S: recibo
            S->>R: markReminderSent(dose, tipo, hoje)
            R->>DB: INSERT do lembrete (único por dose, tipo e data)
        else token de dispositivo inválido
            X-->>S: erro de dispositivo
            S->>R: removeDevice(token)
        else falha temporária
            X-->>S: erro
            Note over S: Não registra, e a próxima execução tenta de novo
        end
    end
    end

    H-->>T: Resumo da execução (contagens, sem dado pessoal)
    A->>A: Ao abrir o app, as doses atrasadas aparecem sinalizadas
```

## Pontos de atenção

- **Atraso só pela rotina:** o cliente nunca envia `MARK_OVERDUE`; a regra está na máquina de estados e é testada com relógio controlado (casos CT-T04, CT-T07 e CT-G05/G06).
- **Idempotência:** a restrição única do lembrete (dose, tipo, data) impede avisos duplicados se a rotina rodar duas vezes no mesmo dia.
- **Privacidade da notificação:** o texto da notificação push é genérico (por exemplo, "Você tem uma vacina para conferir"), sem nome do membro nem da vacina, porque a notificação pode aparecer na tela bloqueada e passa por um serviço externo.
- **Web:** o push do Expo não cobre a web; lá o usuário vê a sinalização ao abrir o app (limitação aceita no SCRUM-31: lembrete por push no celular e sinalização dentro do app nas duas plataformas).
- **Resiliência:** uma dose que falha não impede as demais; os erros são registrados no Application Insights sem dados pessoais.
- **Quanto antes avisar** ("antecedência") é um parâmetro de configuração a validar com o autor; não está fixado neste documento.
