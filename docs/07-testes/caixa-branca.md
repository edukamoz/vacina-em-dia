# Teste de caixa branca (estrutural)

Item B63. Estado em 22/10/2026. Aplica o material da aula "Teste de Caixa Branca" e "Testes funcionais e estruturais": cobertura de instruções, de decisões, de condições, de caminhos e de fluxo de dados. Diferente da caixa preta (`caixa-preta-casos.md`), aqui os casos saem da leitura do código.

## 1 O que o pipeline já mede

O Jest (Istanbul) mede instruções, ramos, funções e linhas, e o CI falha abaixo de 80%. Medição de 22/10/2026 (`npm run test:coverage`, todos os testes passando):

| Pacote | Instruções | Ramos | Funções | Linhas |
|---|---|---|---|---|
| `packages/shared` | 91,15% | 98,11% | 100% | 90,90% |
| `apps/api` | 97,32% | 89,78% | 94,80% | 97,62% |
| `apps/mobile` | 94,26% | 88,12% | 91,81% | 95,12% |

Todos acima do mínimo de 80%. Em ramos, API e app ficam um pouco abaixo da meta própria de 90%. A cobertura do serviço de PLN (pytest) é medida à parte, no job do CI.

**Limite da ferramenta:** o Istanbul conta uma expressão `a || b` como "cada operando foi avaliado", não como "cada condição foi verdadeira e falsa". Ele também não mede caminhos nem fluxo de dados. Por isso as seções abaixo projetam esses casos à mão, e a análise achou lacunas que os 100% de ramos escondiam.

## 2 Funções analisadas

Foram escolhidas três funções com decisões reais e importância para o produto:

1. `transitionDose` (`packages/shared/src/domain/dose-state.ts`): a máquina de estados da dose (RF04).
2. `createFixedWindowLimiter().consume` (`apps/api/src/services/rate-limiter.ts`): limite de uso do login, da voz e do chatbot (ADR-010).
3. `somenteNumeros` (`apps/mobile/src/features/donate/donate-screen.tsx`): filtro do campo de valor do Pix (B53).

## 3 `transitionDose`: decisões e condições

Depois de achar a regra do par evento/estado (`RULES[evento][estado]`), a função decide em um `switch` por tipo de evento. As decisões são:

| ID | Decisão | Verdadeiro (caso) | Falso (caso) |
|---|---|---|---|
| D1 | Não existe regra para o par evento e estado | CT-I01 a CT-I08 (ex.: agendar dose Aplicada) | todos os CT-T (transições válidas) |
| D2 | Agendar ou reagendar: data anterior a hoje | CT-G02 (agendar ontem), CT-G07 (reagendar ontem) | CT-G01 (agendar hoje), CT-T02, CT-T10 |
| D3 | Aplicar: data posterior a hoje | CT-G04 (aplicar amanhã) | CT-G03 (aplicar na data D), CT-T03, CT-T06, CT-T11 |
| D4 | Atrasar: quem pede não é a rotina | CT-I09 (cliente tenta atrasar) | CT-G06, CT-T04, CT-T07 |
| D5 | Atrasar: sem data de referência **ou** referência hoje ou depois | ver D5a e D5b abaixo | CT-G06 (prazo de ontem vence) |
| D6 | Referência: a dose está Agendada (usa a data do agendamento; senão, o prazo) | CT-T07 (Agendada) | CT-T04, CT-G06 (Pendente) |
| D7 | Cancelar sem confirmação | CT-G08 (três estados de origem) | CT-T05, CT-T09, CT-T12 |

**Cobertura de decisões:** as sete decisões têm os dois resultados exercitados pelos casos acima. É o que explica os 100% de ramos medidos.

**Cobertura de condições em D5** (decisão composta: `referência é nula` **ou** `referência >= hoje`):

| Condição | Verdadeira | Falsa |
|---|---|---|
| D5a: a data de referência é nula (dose Agendada sem data) | **CT-CB-01** (novo) | CT-G06 |
| D5b: a referência é hoje ou depois | CT-G05 (prazo igual a hoje) e o teste do agendamento vencido (T7) com data igual a hoje | CT-G06 |

**Lacuna achada:** antes desta análise, D5a verdadeira não tinha caso. Ela só ocorre com dado inconsistente (Agendada sem data), mas é justamente o tipo de situação que corrompe a rotina de prazo. O CT-CB-01 foi escrito e passa: a dose não é atrasada e o erro é `NOT_OVERDUE`.

**Cobertura de caminhos:** os caminhos relevantes da função são as 12 transições mais os erros de guarda, já cobertos por CT-T (12), CT-G (9) e CT-I (9). A explosão combinatória não ocorre, porque cada evento tem no máximo duas saídas de erro.

## 4 `consume` do limitador de uso

| ID | Decisão ou condição | Verdadeiro | Falso |
|---|---|---|---|
| L1 | Contador novo: não existe **ou** a janela venceu | L1a: não existe, CT-RL-01 (1ª chamada); L1b: existe e venceu, CT-RL-02 | CT-RL-01 (2ª chamada em diante) |
| L2 | Limpeza: tabela com 5.000 contadores ou mais | CT-RL-06 e CT-RL-07 | todos os outros |
| L3 | Dentro da limpeza: contador vencido | CT-RL-06 (apagado) | **CT-RL-07** (novo: mantido) |
| L4 | Contador já no limite da regra | CT-RL-01, CT-RL-04, CT-RL-05 | CT-RL-01 (chamadas dentro do limite) |
| L5 | Há espera a informar (alguma regra esgotada) | CT-RL-01 | CT-RL-01 (permitido) |

**Laços (regra do material: zero, uma e várias vezes).** O laço sobre as regras foi exercitado com uma regra (CT-RL-01), com duas (CT-RL-04 e CT-RL-05) e agora com **zero** (CT-RL-08, novo: sem regras o uso é permitido).

**Lacunas achadas:** a medição mostrava a linha 26 sem ramo coberto, que é exatamente L3 falsa. O CT-RL-07 cobre. Com o CT-RL-08 fecha-se o laço com zero iterações. Depois dos dois, o arquivo passou a 100% de ramos na medição.

**Fluxo de dados:** `retryAfterMs` é definido com 0, redefinido pelo maior tempo restante entre as regras esgotadas e usado na decisão L5. Não há caminho que o use sem definição. CT-RL-05 verifica o caso em que a segunda regra redefine o valor (a espera é a da regra que mais demora).

## 5 `somenteNumeros` (valor do Pix)

```
const comPonto = /^\d*\.\d{1,2}$/.test(texto.trim()) ? texto.replace('.', ',') : texto;
const [inteiros = '', ...resto] = comPonto.replace(/[^\d,]/g, '').split(',');
if (resto.length === 0) return inteiros;
return `${inteiros},${resto.join('').slice(0, 2)}`;
```

| ID | Decisão | Verdadeiro | Falso |
|---|---|---|---|
| S1 | O texto parece decimal com ponto (`12.5`) | `"12.5"` vira `"12,5"` | `"12,5"`, `"abc"`, `"1.234,50"` |
| S2 | Não há vírgula depois da limpeza | `"abc"`, `"R$ 15"`, `"1e5"`, `"-10"` | `"12,5"`, `"12,567"`, `"1,2,3"` |

Todos os casos acima estão em CT-APP-PIX30 (tabela de 9 entradas).

**Caminhos.** Com duas decisões binárias seriam quatro caminhos. Um deles é **inviável**: S1 verdadeira troca o ponto por vírgula, então a limpeza sempre deixa uma vírgula e S2 não pode ser verdadeira. Restam três caminhos, os três cobertos.

**Fluxo de dados.** `comPonto` é definida uma vez e usada uma vez; `inteiros` e `resto` são definidos pela desestruturação e usados nos dois retornos. O valor padrão `inteiros = ''` aparece como ramo não coberto (linha 44), mas é **inalcançável**: `split` devolve sempre ao menos um elemento. Ele existe porque o TypeScript estrito (`noUncheckedIndexedAccess`) exige um padrão ao desestruturar. É código defensivo exigido pelo tipo, não falha de teste; fica registrado aqui para não ser confundido com lacuna.

## 6 Como reproduzir

```bash
npm run test:coverage                      # cobertura de todos os pacotes
npx jest packages/shared/src/domain/dose-state.test.ts   # CT-CB-01
npx jest apps/api/src/services/rate-limiter.test.ts      # CT-RL-01 a CT-RL-08
```

O relatório HTML por arquivo fica em `coverage/lcov-report` de cada pacote (guardado como artefato no CI).

## 7 Limites

- Foram analisadas três funções, não o código inteiro. Cobertura de condições e de caminhos em todo o projeto seria inviável a mão; a regra prática do plano é projetar esses casos nas funções críticas e deixar o resto com a medição automática.
- A cobertura de condições do Istanbul não está disponível; a verificação de D5, L1 e S1/S2 foi feita pela leitura do código e dos testes, como descrito acima.
