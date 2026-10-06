# Diagrama de classes (domínio)

Item do Jira: SCRUM-31. O diagrama mostra o **modelo de domínio**, isto é, os conceitos do negócio e suas relações. As tabelas do banco estão em `der.md`; a máquina de estados da dose, em `estados-dose.md`.

Nomes de classes e atributos em inglês, como no código (`CLAUDE.md` §7); rótulos e descrições em português.

## Diagrama

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id
        +UUID externalId
        +Date createdAt
    }
    class Consent {
        +UUID id
        +string termVersion
        +DateTime acceptedAt
    }
    class Member {
        +UUID id
        +string displayName
        +Date birthDate
        +DateTime guardianDeclaredAt
        +isMinor(today) bool
    }
    class SpecialGroup {
        +string code
        +string label
    }
    class CalendarVersion {
        +UUID id
        +string name
        +string source
        +Date referenceDate
        +bool isFictitious
        +bool isActive
    }
    class Vaccine {
        +UUID id
        +string code
        +string name
    }
    class DoseRule {
        +UUID id
        +int doseNumber
        +string label
        +int minAgeDays
        +int recommendedAgeDays
        +int maxAgeDays
        +int minIntervalDays
    }
    class Dose {
        +UUID id
        +DoseStatus status
        +Date dueDate
        +Date scheduledDate
        +Date appliedDate
        +DateTime cancelledAt
    }
    class DoseEvent {
        +long id
        +DoseStatus fromStatus
        +DoseStatus toStatus
        +DoseEventType type
        +EventSource source
        +DateTime occurredAt
    }
    class Reminder {
        +UUID id
        +ReminderKind kind
        +Date referenceDate
        +DateTime sentAt
    }
    class PushDevice {
        +UUID id
        +string token
        +string platform
    }
    class DoseStatus {
        <<enumeration>>
        PENDING
        SCHEDULED
        OVERDUE
        APPLIED
        CANCELLED
    }
    class DoseEventType {
        <<enumeration>>
        GENERATE
        SCHEDULE
        UNSCHEDULE
        RESCHEDULE
        APPLY
        MARK_OVERDUE
        CANCEL
    }
    class EventSource {
        <<enumeration>>
        USER
        SCHEDULER
    }
    class ReminderKind {
        <<enumeration>>
        UPCOMING
        OVERDUE
    }
    class DoseStateMachine {
        <<função pura em packages/shared>>
        +transition(status, event, today) DoseStatus
    }

    User "1" --> "0..*" Consent : aceita
    User "1" --> "0..*" Member : cuida de
    User "1" --> "0..*" PushDevice : usa
    Member "0..*" --> "0..*" SpecialGroup : pertence a
    CalendarVersion "1" --> "1..*" DoseRule : contém
    Vaccine "1" --> "1..*" DoseRule : tem
    SpecialGroup "0..1" <-- "0..*" DoseRule : restringe
    Member "1" --> "0..*" Dose : tem
    DoseRule "1" --> "0..*" Dose : origina
    Dose "1" --> "1..*" DoseEvent : registra
    Dose "1" --> "0..*" Reminder : gera
    Dose ..> DoseStatus
    DoseEvent ..> DoseEventType
    DoseEvent ..> EventSource
    Reminder ..> ReminderKind
    DoseStateMachine ..> Dose : valida a mudança de estado
```

## Regras de negócio no modelo

| Regra | Onde vive |
|---|---|
| Transições válidas, guardas de data e confirmação do cancelamento | `DoseStateMachine` (função pura, recebe o "hoje" por parâmetro) |
| Atraso (T4 e T7) só pela rotina diária | Evento `MARK_OVERDUE` com origem `SCHEDULER`; o cliente não pode enviá-lo |
| Uma dose por regra e por membro (não duplicar ao gerar de novo) | Restrição única `(member, doseRule)` |
| Membro menor exige declaração de responsável | `Member.guardianDeclaredAt` preenchido quando `isMinor(today)` |
| Cada usuário só acessa os próprios dados | Toda consulta parte de `User` e verifica a propriedade (`CLAUDE.md` §10) |
| Calendário versionado, com fonte e data | `CalendarVersion`; `isFictitious` marca dados de exemplo |

## Decisões de modelagem

- `User` guarda **apenas o identificador opaco** do Entra (`externalId`); nome e e-mail ficam no Entra (ADR-005).
- `DoseRule` aponta para uma `CalendarVersion`; ao trocar a versão do calendário, as doses já geradas continuam ligadas à regra antiga (histórico preservado).
- `DoseEvent` é um registro de auditoria sem dado pessoal; permite reconstruir o ciclo da dose e apoia os testes.
- Mensagens do chatbot e transcrições de voz **não** são persistidas e, portanto, não aparecem no modelo.
