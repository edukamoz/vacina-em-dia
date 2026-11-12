# ADR-031: Animais de estimação como um tipo de membro

- **Status:** aceito em 10/11/2026 (pedido do autor: poder cadastrar animais e as vacinas deles, para fazer assim que possível)
- **Item do backlog:** B73
- **Relacionados:** ADR-016 (dose avulsa), ADR-027 (recorrência), ADR-029 (família), CLAUDE.md §3 e §8.

## Contexto

O autor pediu para cadastrar animais de estimação e as vacinas deles, com repetição anual. O CLAUDE.md §3 deixava isso fora do escopo; o autor aprovou a ampliação em 10/11/2026. Pesquisa feita nesse dia: **não há calendário nacional oficial de vacinação para animais**; só a antirrábica aparece como obrigatória, em fontes estaduais e municipais. Como dado vacinal só entra com fonte oficial confirmada (CLAUDE.md §8), o app não inventa um calendário de animais.

## Decisão

1. **O animal é um membro com `kind = PET`** (e `species`: cachorro, gato ou outro). Reaproveita a família, as doses, o aviso antecipado, a recorrência (ADR-027), os avisos no aparelho (ADR-028), a carteira em PDF e a exclusão em cascata, sem tabela nova de doses.
2. **Sem calendário oficial.** Nenhuma dose do PNI é gerada, `ageGroup` é nulo, não há parentesco nem gestação (a API zera esses campos mesmo que o pedido os envie), e a declaração de responsável (que é sobre menores de idade) não vale para animais.
3. **As vacinas são digitadas** como dose avulsa, com repetição se a pessoa quiser (por exemplo, todo ano). Modelos prontos, como a antirrábica, só entram com fonte citada, e ainda não entraram.
4. **Deixa claro na tela** que quem define as vacinas do animal é o veterinário (o rodapé da fonte do PNI dá lugar a esse aviso). As partes que são só de gente (ler caderneta por foto, postos de saúde, notícias do Ministério) ficam escondidas na tela do animal.
5. **Tipo imutável na edição:** troca de pessoa para animal (ou o contrário) exigiria apagar e refazer as doses; quem errou exclui e cadastra de novo.
6. **Banco:** migração `008-animais-de-estimacao.sql` adiciona `member.kind` (padrão `PERSON`) e `member.species`, com restrições (todo animal tem espécie e só animal tem). Não reescreve nenhuma linha.
7. **Contrato:** `MemberInput` ganha `kind` e `species` (padrões: pessoa e nula); `Member` ganha os dois e `ageGroup` passa a poder ser nulo.

## Alternativas

| Opção | Por que não |
|---|---|
| Tabela `pet` separada, com doses próprias | Duplicaria dose, recorrência, avisos, PDF e família sem ganho. |
| Calendário de animais pronto (V8, V10, antirrábica) | Sem fonte oficial nacional; conteúdo de memória é proibido (CLAUDE.md §8). |
| Gerar a antirrábica anual automaticamente | Só com fonte citada; fica para depois, se o autor aprovar uma fonte. |

## Consequências

- **A migração precisa ser aplicada antes do deploy do código** (o deploy não aplica migrações). Ela só adiciona colunas com padrão, então o código antigo continua funcionando depois dela.
- O texto do consentimento e a política de privacidade falam em "pessoas"; dados de animais não são dado pessoal, mas o nome do animal é digitado em um campo que o app já trata com cuidado. Revisar o texto fica com o autor (B39).
- Os gráficos e o histórico passam a incluir doses de animais se o animal for escolhido; nenhuma estatística do PNI é calculada para eles.
