# Vacina em Dia: testes por pares e testes aleatórios

Duas técnicas da aula de caixa preta que o projeto ainda não usava: **combinação por pares** (pairwise) e **testes aleatórios** (Random Testing). Os dois são automatizados e rodam no CI junto com o restante da suíte.

## 1 Combinação por pares

**Ideia:** com vários campos, testar todas as combinações explode (6 × 5 × 4 × 5 = 600). Quase todo defeito de entrada aparece na interação entre **dois** campos, então basta cobrir todo par de valores. O gerador (`paresDeValores`, em `packages/shared/src/schemas/entradas-pares.test.ts`) é guloso e determinístico: sem sorteio, a mesma entrada dá sempre as mesmas linhas.

**Mascaramento:** quando dois valores inválidos aparecem na mesma linha, um esconde o outro. Por isso, cada valor inválido ganha também um caso próprio, com todos os outros campos válidos ("um e somente um de cada vez", como a aula manda).

| ID | O que verifica | Fatores e valores |
|---|---|---|
| CT-PAR-01 | O gerador cobre todo par e usa menos de um décimo das linhas da enumeração exaustiva. | 6, 5, 4 e 5 valores (600 combinações). |
| CT-PAR-02 | O corpo de criação de membro (RF02) é aceito só quando todo valor é válido. | Nome (comum, acentuado, 60 caracteres no limite, vazio, só espaços, 61), nascimento (comum, 29/02 bissexto, 29/02 de ano comum, formato brasileiro, ausente), gestante (verdadeiro, falso, ausente, texto) e parentesco (válido, nulo, ausente, fora da lista, minúsculas). |
| CT-PAR-03 | Nos casos aceitos, o nome vem sem espaços nas pontas e os padrões (`isPregnant = false`, `relationship = null`) são aplicados. | Um caso. |
| CT-PAR-04 | O corpo de evento de dose (RF04): cada tipo exige só o seu campo (data ou confirmação) e `MARK_OVERDUE` nunca é aceito do cliente. | Tipo (7 valores), data (4) e confirmação (4). |
| CT-PAR-05 | `UNSCHEDULE` descarta data e confirmação enviadas por engano. | Um caso. |

## 2 Testes aleatórios (robustez)

Entradas sem roteiro, para ver como o sistema se comporta diante do inesperado. **Determinísticos:** o gerador usa semente fixa (`20261022`), então uma falha se repete igual (CLAUDE.md §11).

| ID | Onde | O que verifica |
|---|---|---|
| CT-ALE-01 | `packages/shared/src/domain/robustez-aleatoria.test.ts` | 3.000 sequências de até 10 eventos aleatórios (com o tempo passando) sobre a máquina de estados da dose. Invariantes: nunca lança exceção; a dose recebida não muda (pureza); cada transição aceita corresponde a uma das T2 a T12 do diagrama (tabela escrita à parte, a partir do diagrama); estado final (Aplicada, Cancelada) só recebe transição inválida; Aplicada nunca tem data futura; Agendada nunca nasce com data no passado; Atrasada só pela rotina; Cancelada só com confirmação. O teste também exige que as 11 transições tenham sido visitadas, o que prova que o sorteio explora o modelo todo. |
| CT-ALE-02 | idem | 4.000 valores JSON aleatórios (texto com emoji, nulo, controle, 5 mil caracteres, listas, objetos aninhados) em 5 esquemas Zod: nenhum lança exceção e o que passa respeita as regras (nome de 1 a 60, senha de 8 a 128, data existente). |
| CT-ALE-03 | idem | 5.000 datas `AAAA-MM-DD` sorteadas: `isValidCivilDate` concorda com um cálculo de dias do mês feito à parte (inclui ano bissexto e século). |
| CT-ALE-04 | idem | Somar e subtrair os mesmos dias devolve a data original (2.000 casos). |
| CT-NLP-180 a 183 | `apps/nlp/tests/test_robustez_aleatoria.py` | 1.500 textos aleatórios nos extratores de entidade (datas, nomes, dia relativo, tela) e 600 no assistente completo: nunca quebra, nunca devolve resposta vazia ou sem fonte, a intenção é conhecida, a confiança fica entre 0 e 1, as datas têm formato e valores válidos. Texto vazio cai na resposta padrão. |

## 3 Resultado e verificação

- Pacote compartilhado: 15 suítes e 254 testes passando; cobertura geral de linhas 91,15% (mínimo exigido: 80%).
- PLN: os 6 testes novos passam.
- **O teste pega defeito de verdade:** ao trocar temporariamente a guarda "aplicar não pode ser no futuro" por uma que nunca dispara, o CT-ALE-01 falha. O código foi restaurado em seguida.
- O primeiro CT-ALE-01 falhou por causa do próprio teste: com "hoje" parado, a transição T7 (Agendada para Atrasada) nunca acontece, porque uma data agendada não pode vencer. O teste agora faz o tempo avançar entre os passos.

## 4 Limites

- Os testes aleatórios têm semente fixa: exploram sempre as mesmas 3.000 sequências. Para ampliar a busca, troque a semente ou aumente a quantidade, aceitando um teste mais lento.
- Pares cobrem interações de dois campos; defeito que depende de três ou mais campos ao mesmo tempo pode escapar.
- O gerador de pares é guloso: não garante o menor número possível de linhas, só um número pequeno e estável.
- Não há teste aleatório da API pela rede nem do app; esta etapa cobre o domínio, os esquemas e o PLN.
