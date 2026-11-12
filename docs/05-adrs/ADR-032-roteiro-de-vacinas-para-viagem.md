# ADR-032: Roteiro de vacinas para viagem, sem tabela de países

- **Status:** aceito em 12/11/2026 (pedido do autor: vacinas específicas para viagem; fazer assim que possível)
- **Item do backlog:** B74
- **Relacionados:** ADR-030 (fonte oficial com data), CLAUDE.md §8 (dado vacinal só com fonte oficial confirmada), `docs/28`.

## Contexto

O autor pediu orientação de vacinas conforme o destino. As exigências e recomendações por país e por área mudam com frequência (a lista de países que exigem o CIVP da Anvisa, por exemplo, tem data de 2022 e cita surtos temporários). Conteúdo de memória é proibido (CLAUDE.md §8), e dar "a vacina que você precisa para tal lugar" seria orientação médica individual.

## Decisão

1. **Checklist, não oráculo.** O app pede só se a viagem é **dentro do Brasil** ou **para o exterior** e a **data da partida**, e monta um roteiro com o que o app sabe da pessoa (o histórico de doses) e o que o Ministério da Saúde diz às pessoas que viajam. Nunca diz se a pessoa pode ou não viajar nem qual vacina tomar; sempre manda procurar um serviço de saúde.
2. **Sem tabela de países ou de áreas de risco.** Cada item remete à fonte oficial (Ministério da Saúde e Anvisa), que é quem mantém essa lista. O teste CT-VIA-10 impede frases como "pode viajar".
3. **Fonte e data:** o roteiro (`packages/shared/src/travel/travel.ts`) vem de <https://www.gov.br/saude/pt-br/vacinacao/viajantes> e da página de saúde do viajante do Ministério, lidas em 12/11/2026 (as páginas só mostram "©2025", sem data de atualização, então a data é a da leitura). Itens: febre amarela (indicada a quem vai às Áreas com Recomendação de Vacinação, com **10 dias** de antecedência: o app calcula a data-limite e avisa se já passou), calendário em dia (conta doses atrasadas e as previstas até a viagem), cartão de vacinação nos documentos, CIVP (só exterior) e onde se informar e vacinar.
4. **Sem servidor novo:** tudo roda no app a partir das doses que ele já carrega. Não há tabela, migração nem rota nova; o conteúdo muda por PR, com revisão do autor.
5. **Onde fica:** card "Vou viajar" na aba Doses e tela em janela `/viagem`.

## Alternativas

| Opção | Por que não |
|---|---|
| Tabela de destinos e vacinas | Sem fonte única e estável; erro de memória em dado de saúde é inaceitável. |
| Consultar o portal da Anvisa a cada pedido | Não há API; o portal exige leitura de página e muda sem aviso. |
| Recomendar vacina conforme idade e destino | Seria orientação médica individual. |

## Consequências

- O autor precisa **conferir cada item** do roteiro contra as páginas (o texto foi escrito a partir de uma leitura automática delas e das notas do backlog).
- Os links são os que o próprio Ministério cita; o do CIVP aponta para a página inicial da Anvisa, porque não consegui abrir a página específica (a mesma limitação do backlog). Trocar por um link mais direto é um ajuste pequeno.
- Se o Ministério mudar o texto, o vigia (ADR-030) não cobre estas duas páginas; a revisão é manual.
