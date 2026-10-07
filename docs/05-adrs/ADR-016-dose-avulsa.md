# ADR-016: Dose avulsa (vacina cadastrada à mão, fora do calendário oficial)

- **Status:** Aceita
- **Data:** 2026-10-07
- **Decisor:** autor
- **Requisitos relacionados:** RF04, RNF10, RF09

## Contexto

O calendário vacinal do app vem **só** do Calendário Nacional do PNI (`CLAUDE.md` §8). Mas uma pessoa pode precisar acompanhar uma vacina que não consta nele (indicação médica, viagem, campanha). O autor pediu que isso seja possível, deixando **claro no cartão** o que é oficial e o que foi adicionado à mão (07/10/2026). Isso é uma funcionalidade nova fora da lista do MVP, aprovada pelo autor.

## Decisão

- **Dose avulsa** é uma dose do mesmo membro e do mesmo ciclo de vida (T1 a T12) das oficiais; muda só a **origem**. A API devolve `origin: 'OFFICIAL' | 'CUSTOM'` em toda dose.
- **O que a pessoa informa:** nome da vacina (texto livre, 2 a 80 caracteres), qual dose (texto livre, até 40) e a data prevista, escolhida em **calendário** (sem digitar). Sem lote, local ou outro dado.
- **Regras:**
  - A dose nasce **Pendente** (T1). Aplicar, agendar, reagendar e cancelar seguem as guardas de sempre.
  - A data prevista é de **hoje em diante** (e até 10 anos à frente); o que já foi tomado se cadastra e depois se **registra a aplicação** com a data passada. Isso mantém "atrasar" só pela rotina de prazo.
  - Uma dose avulsa pendente **atrasa** quando a data prevista passa, como as oficiais de idade fixa.
  - **Limite:** 30 doses avulsas por pessoa.
  - Editar a pessoa **não** apaga nem duplica doses avulsas.
- **Sem conteúdo clínico inventado:** a dose avulsa não tem "doenças evitadas", faixa de idade nem notas, porque o app **não** sabe nada sobre ela. A interface diz que ela "não faz parte do calendário oficial" e manda seguir a orientação de quem a indicou.
- **Rota:** `POST /api/members/{id}/doses` (201), registrada no OpenAPI; erros 400, 401, 403, 404 e 422 (`INVALID_DOSE_DATE`, `LIMIT_REACHED`).
- **Banco:** a coluna `dose.rule_id` passa a aceitar nulo; entram `custom_vaccine` e `custom_dose_label`. Uma restrição garante que cada dose é **ou** oficial (com `rule_id`) **ou** avulsa (com nome e dose), nunca as duas coisas. A migração `004-dose-avulsa.sql` é aditiva: nenhuma dose existente muda.
- **LGPD:** o nome da vacina é dado de saúde e segue as mesmas regras das demais doses: só o dono acessa, sem registro em log, apagado com a conta (cascata). O texto livre é validado (tamanho e caracteres de controle) e sempre passa como parâmetro de consulta.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Deixar escolher a vacina em uma lista | Não resolve o caso de vacinas fora do calendário; uma lista própria seria dado vacinal inventado. |
| Aceitar data prevista no passado | A dose nasceria já vencida sem passar pela rotina de prazo, contrariando a regra de que o atraso só vem do tempo. O caminho "cadastrar e registrar a aplicação" cobre o caso. |
| Misturar com as doses oficiais sem etiqueta | A pessoa confundiria o que o Ministério da Saúde indica com o que ela mesma digitou (RNF10). |
| Tabela separada para doses avulsas | Duplicaria a máquina de estados, as consultas e o histórico; uma coluna de origem basta. |

## Consequências

- **Positivas:** a carteira cobre casos reais sem enfraquecer a regra de que o calendário oficial só vem de fonte oficial.
- **Negativas:** texto livre abre espaço para nomes diferentes da mesma vacina; o app não os une nem os valida. Dose avulsa **não** entra nos lembretes do calendário oficial nem nas respostas do assistente.
- **Pendente:** incluir casos de caixa preta do cadastro de dose avulsa (partição de equivalência e valor limite) nas tabelas de execução.
