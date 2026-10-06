# Diagrama de sequência: registrar a aplicação de uma dose (RF04)

Item do Jira: SCRUM-31. Regras de transição: `estados-dose.md` (T3, T6 e T11). A estrutura segue as camadas da API: `handler` (HTTP) → `service` (caso de uso) → `domain` (regra pura) → `repository` (acesso a dados).

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant A as App
    participant H as Handler (HTTP)
    participant S as Service
    participant D as Domain (máquina de estados)
    participant R as Repository
    participant DB as Azure SQL

    U->>A: Informa a data da aplicação e confirma
    A->>H: POST /doses/{id}/apply  { appliedDate }
    H->>H: Valida token e corpo (Zod compartilhado)
    alt entrada inválida
        H-->>A: 422 mensagem clara
    else entrada válida
        H->>S: registerApplication(userId, doseId, appliedDate)
        S->>R: findDoseOwnedBy(userId, doseId)
        R->>DB: SELECT da dose juntando com o membro do usuário (consulta parametrizada)
        DB-->>R: dose ou nada
        alt dose não é do usuário ou não existe
            R-->>S: nada
            S-->>H: erro "não encontrado"
            H-->>A: 404 (não revela se existe)
        else dose do usuário
            R-->>S: dose (estado, datas e versão da linha)
            S->>D: transition(estado, APPLY, hoje, appliedDate)
            Note over S,D: "hoje" vem do relógio injetado, nunca de new Date() na regra
            alt transição inválida ou data futura
                D-->>S: erro de transição
                S-->>H: erro de domínio
                H-->>A: 409 (estado mantido)
            else transição válida (T3, T6 ou T11)
                D-->>S: novo estado APPLIED
                S->>R: saveTransition(dose, novoEstado, evento, versão)
                R->>DB: UPDATE da dose + INSERT do evento (uma transação)
                alt a versão da linha mudou (alteração simultânea)
                    DB-->>R: nenhuma linha atualizada
                    R-->>S: conflito de concorrência
                    S-->>H: erro de conflito
                    H-->>A: 409 (recarregar e tentar de novo)
                else sucesso
                    DB-->>R: confirmação
                    R-->>S: dose atualizada
                    S-->>H: resultado
                    H-->>A: 200 (dose aplicada)
                    A->>U: Mostra a dose no histórico
                end
            end
        end
    end
```

## Pontos de atenção

- **Propriedade dos dados:** a busca da dose já filtra pelo usuário autenticado, então um identificador de outro usuário devolve 404, como se não existisse. O identificador vindo do cliente nunca é confiado sozinho (`CLAUDE.md` §10).
- **Erros:** os erros de domínio (entrada, não encontrado, transição, conflito) são mapeados para HTTP em **um único ponto**, e a mensagem devolvida ao cliente nunca expõe detalhes internos.
- **Transação:** a mudança de estado e o registro do evento acontecem juntos; se um falhar, nada é gravado.
- **Concorrência:** a coluna de versão da linha evita que duas requisições simultâneas gravem por cima uma da outra.
- **Cancelar** segue o mesmo fluxo, com o parâmetro de confirmação exigido pela regra (T5, T9 e T12); **agendar, desagendar e reagendar** também.
- Rotas e códigos são exemplos; o contrato definitivo entra na Documentação Técnica.
