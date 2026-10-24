# Gestão de testes no GitHub Projects

Item B65. Gerado por `scripts/testes-github.mjs` a partir de `docs/07-testes/gestao-de-testes.json` em 23/10/2026. É o equivalente, no GitHub Projects, ao que a aula de gerenciamento de testes fazia no Jira com o Xray: casos de teste (Test), plano (Test Plan), execução (Test Execution) e relatório de cobertura.

## Como o Xray foi traduzido

| Xray (Jira) | Aqui (GitHub Projects) |
|---|---|
| Test | Issue com o rótulo `test` e Tipo "Teste": passos, dados e resultado esperado em tabela |
| Test Plan | Issue `test-plan` (Tipo "Plano de testes") com a lista dos testes |
| Test Execution | Issue `test-execution` (Tipo "Execução de testes") com o resultado de cada teste |
| Resultado PASS / FAIL | Campo "Resultado": Passou, Falhou ou Não executado |
| Requisito → Teste | Cada teste cita os itens do backlog que cobre; o item no projeto tem a issue `[Bnn]` |
| Bug a partir do teste | Issue com Tipo "Defeito", ligada ao teste que falhou (nenhuma falha nesta execução) |
| Overall Test Coverage | Tabela abaixo |

## Plano e execução

- Plano: #201 (Plano de testes da entrega de Qualidade e Testes de Software)
- Execução: #202 (Execução de 23/10/2026 (automatizada e relato da autora))
- Resultado: 12 passaram, 0 falharam, 0 não executados, de 12 casos.
- Jest do pacote compartilhado: 13 testes dos casos desta lista passaram. Jest da API: 14 passaram. pytest do PLN: 2 passaram. Coleção do Postman na API local: 59 de 59 testes. Playwright com axe-core: verde no CI da main. Fluxos em celular físico: relato da autora, sem captura anexada.

## Casos de teste

| Teste | Título | Itens do backlog | Requisitos | Tipo | Resultado |
|---|---|---|---|---|---|
| [T01](https://github.com/edukamoz/vacina-em-dia/issues/189) | Cadastrar conta com dados válidos e entrar | B01 | RF01, RNF02 | Automatizado | Passou |
| [T02](https://github.com/edukamoz/vacina-em-dia/issues/190) | Rejeitar senha curta e aceitar o valor limite (7 e 8 caracteres) | B01 | RF01 | Automatizado | Passou |
| [T03](https://github.com/edukamoz/vacina-em-dia/issues/191) | Aplicar uma dose Pendente e recusar data futura | B07 | RF04 | Automatizado | Passou |
| [T04](https://github.com/edukamoz/vacina-em-dia/issues/192) | Dose Aplicada (estado final) não aceita novo evento | B07 | RF04 | Automatizado | Passou |
| [T05](https://github.com/edukamoz/vacina-em-dia/issues/193) | Um usuário não vê nem altera dados de outro | B04, B07 | RNF02 | Automatizado | Passou |
| [T06](https://github.com/edukamoz/vacina-em-dia/issues/194) | Atraso só pela rotina de prazo, nos limites de data | B07, B09 | RF04, RF05 | Automatizado | Passou |
| [T07](https://github.com/edukamoz/vacina-em-dia/issues/195) | Excluir a conta apaga todos os dados e libera o e-mail | B03, B04 | RF09, RNF03 | Automatizado | Passou |
| [T08](https://github.com/edukamoz/vacina-em-dia/issues/196) | Calendário vacinal com fonte oficial e número de linhas por faixa | B05 | RF03, RNF10 | Automatizado | Passou |
| [T09](https://github.com/edukamoz/vacina-em-dia/issues/197) | O assistente recusa orientação médica individual | B11, B61 | RF07, RNF10 | Automatizado | Passou |
| [T10](https://github.com/edukamoz/vacina-em-dia/issues/198) | Limite de uso devolve 429 e zera ao virar a janela | B28 | RNF02 | Automatizado | Passou |
| [T11](https://github.com/edukamoz/vacina-em-dia/issues/199) | Telas principais sem violações de acessibilidade (axe-core) | B49 | RNF04 | Automatizado | Passou |
| [T12](https://github.com/edukamoz/vacina-em-dia/issues/200) | Fluxos em celular físico: assistente por voz, Pix, caderneta por foto, mapa e layout | B10, B13, B53, B55 | RF06, RF10, RNF09 | Manual | Passou |

## Cobertura de requisitos por casos registrados

| Requisito | Casos | Resultado |
|---|---|---|
| RF01 | T01, T02 | Passou |
| RF03 | T08 | Passou |
| RF04 | T03, T04, T06 | Passou |
| RF05 | T06 | Passou |
| RF06 | T12 | Passou |
| RF07 | T09 | Passou |
| RF09 | T07 | Passou |
| RF10 | T12 | Passou |
| RNF02 | T01, T05, T10 | Passou |
| RNF03 | T07 | Passou |
| RNF04 | T11 | Passou |
| RNF09 | T12 | Passou |
| RNF10 | T08, T09 | Passou |

**Itens do backlog com ao menos um caso registrado:** 14 de 65 (22%).

## Limites

- Estes 12 casos são os **mais relevantes**, não todos. A suíte automatizada completa (centenas de testes Jest, pytest, Postman e Playwright, cada um com seu ID `CT-...`) continua sendo a fonte da cobertura; ela roda a cada push no CI.
- A cobertura acima conta só o que foi registrado como caso aqui. Requisitos fora da lista (por exemplo RF02, RF05 e RF08) têm testes automatizados, mas não têm caso registrado nesta lista.
- Os resultados automatizados vêm da execução de 23/10/2026 descrita no JSON. O caso T12 é um relato da autora, sem captura anexada.
- Para a professora ver o projeto, a autora precisa adicioná-la como colaboradora do repositório ou do projeto (é preciso o usuário do GitHub dela; o e-mail da Fatec sozinho não basta).
