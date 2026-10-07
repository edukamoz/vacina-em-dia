# Teste de caixa preta: partição de equivalência e análise de valor limite

Entrega de Qualidade e Testes de Software (12/11), item 2: escolher entre **partição de equivalência** e **análise de valor limite** e realizar o teste de caixa preta, entregando **os casos de teste** e **a tabela de execução**. O projeto aplica as duas técnicas, cada uma onde rende mais: partição nas entradas que se dividem em classes (formato, tipo, existência) e valor limite nos campos com tamanho ou data de corte.

- **Casos e resultados:** `docs/07-testes/caixa-preta-execucao.md` (gerado a cada execução; traz o resultado **obtido** e a situação de cada caso).
- **Código dos casos:** `apps/api/src/caixa-preta/casos.ts` (os casos) e `caixa-preta.test.ts` (a execução e a geração da tabela). IDs `CT-CP-...`. Item do Jira: SCRUM-28.
- **Rastreabilidade:** cada caso cita o requisito (RF) e o ID aparece no nome do teste automatizado.

## Como é executado

Cada caso monta um ambiente novo (aplicação em memória, relógio fixo em **2026-10-06**, sem rede e sem Azure) e chama a **camada de entrada da API** (validação Zod, handlers, serviços e regras de domínio reais) com a entrada do caso. O resultado obtido (código HTTP, código de erro da API e, quando conferido, um detalhe como a faixa etária) é comparado com o esperado. É caixa preta porque o teste só conhece a especificação da entrada e da saída, nunca o código por dentro.

```bash
cd apps/api
npx jest src/caixa-preta                      # executa e confere
GERAR_TABELA=1 npx jest src/caixa-preta       # executa e regrava a tabela de execução
```

## Partições e valores limite por campo

**Legenda:** V = classe válida; I = classe inválida; os números entre parênteses são os valores de fronteira testados (a fronteira e o vizinho imediato dos dois lados).

### Cadastro de conta e senha (RF01)

| Campo | Regra de origem | Partições | Valores limite |
|---|---|---|---|
| E-mail | Formato de e-mail, até 254 caracteres | V: e-mail válido (qualquer caixa). I: sem @, vazio, sem domínio, mais longo que o máximo, já cadastrado | 254 (válido), 255 (inválido) |
| Senha | De 8 a 128 caracteres; recusa senha comum, igual ao e-mail ou de um caractere repetido (NIST SP 800-63B) | V: frase ou senha de 8 a 128. I: curta, longa demais, comum, igual ao e-mail, caractere repetido | 7 (inválido), 8 (válido), 128 (válido), 129 (inválido) |
| Cadastros por origem | 10 por hora (ADR-014) | V: até 10. I: acima | 10º (válido), 11º (429) |

### Login e bloqueio por tentativas (RF01)

| Campo | Partições | Valores limite |
|---|---|---|
| Credenciais | V: corretas, com e-mail em outra caixa. I: senha errada, e-mail sem conta (mesma resposta, para não revelar quais e-mails existem), senha vazia, e-mail inválido, e-mail com espaços (o app os remove antes de enviar) | n/a |
| Falhas seguidas por e-mail | 5 falhas em 15 minutos bloqueiam | 4 falhas e depois a senha certa (200); 5 falhas e a 6ª, mesmo certa (429) |
| Duração do bloqueio | 15 minutos | 899 s (ainda bloqueado), 900 s (liberado) |

### Recuperação de senha (RF01, ADR-015)

| Campo | Partições | Valores limite |
|---|---|---|
| Pedido | V: e-mail de conta existente (202). V: e-mail sem conta (**mesma** resposta 202). I: e-mail inválido | n/a |
| Pedidos por e-mail | 3 por hora | 3º (202), 4º (429) |
| Validade do link | 1 hora, uso único | 3599 s (vale), 3600 s (vencido); segundo uso (recusado) |
| Token | V: token do e-mail. I: desconhecido, já usado, vencido, curto demais, longo demais | 19 (formato inválido), 20 (formato válido, desconhecido), 201 (formato inválido) |
| Senha nova | Mesma política do cadastro | 7 (inválida); senha comum (422); a senha antiga deixa de valer |

### Consentimento (RF09)

| Campo | Partições | Valores limite |
|---|---|---|
| Aceite | V: `true`. I: `false`, ausente, texto `"true"`, corpo ausente | n/a |
| Versão do termo | De 1 a 20 caracteres | 0 (inválido), 1 e 20 (válidos), 21 (inválido) |
| Declaração de responsável | Opcional (padrão falso) | n/a |

### Membros da família (RF02) e faixa etária (RF03)

| Campo | Partições | Valores limite |
|---|---|---|
| Nome ou apelido | V: de 1 a 60 caracteres, com acento e espaços nas pontas (removidos). I: vazio, só espaços, ausente, longo demais | 0 e 61 (inválidos), 1 e 60 (válidos) |
| Data de nascimento | V: data civil existente, até hoje. I: formato brasileiro, dia ou mês inexistente, futura | hoje (válida), amanhã (422); 29/02 em ano bissexto (válido) e em ano comum (inválido); 1900-01-01 (aceita) |
| Gestante | V: booleano, ou omitido (padrão falso). I: texto | n/a |
| Consentimento prévio | I: cadastrar sem aceitar o termo (403) | n/a |
| Menor de 18 anos | Exige declaração de responsável (LGPD) | 18 anos menos 1 dia (422 sem declaração), 18 anos exatos (201) |
| Membros por conta | Até 20 | 20º (201), 21º (422) |
| Propriedade | I: membro de outro usuário (404) | n/a |
| Faixa etária | Criança até 10 anos, adolescente e jovem até 25, adulto até 60, idoso daí em diante (calendário do PNI, `docs/10-calendario-vacinal.md`) | Dia anterior e dia do aniversário de 10, 25 e 60 anos; recém-nascido |

### Parentesco do membro (RF02)

O parentesco é opcional e escolhido em uma lista fixa de 11 códigos (`SELF`, `MOTHER`, `FATHER`, `SON`, `DAUGHTER`, `GRANDMOTHER`, `GRANDFATHER`, `SISTER`, `BROTHER`, `SPOUSE`, `OTHER`). Por ser uma enumeração, quase não há valor limite: usa-se partição, com dois limites de forma (texto vazio e caixa diferente).

| Campo | Partições | Valores limite |
|---|---|---|
| Parentesco | V: cada código da lista (o próprio usuário, um parente, "outro"), omitido, nulo. I: fora da lista, tipo errado (número) | texto vazio (inválido); código em minúsculas (inválido, a lista é sensível à caixa) |
| Edição | V: trocar de um parentesco para outro; limpar (voltar a "não informado") | n/a |

### Doses (RF04)

Ambiente: recém-nascido (todas as doses Pendentes), com data de hoje fixa. Detalhe da máquina de estados em `casos-teste-estados-dose.md`.

| Campo | Partições | Valores limite |
|---|---|---|
| Agendar | V: data de hoje em diante. I: ontem, data inexistente, formato brasileiro, sem data | D-1 (422), D (200), D+1 (200) |
| Aplicar | V: data até hoje. I: futura, data inválida | D+1 (422), D (200), D-1 (200) |
| Cancelar | V: confirmado. I: sem confirmar, sem o campo | n/a |
| Tipo de evento | V: os do usuário. I: `MARK_OVERDUE` enviado pelo cliente (só a rotina de prazo pode), desconhecido, sem corpo | n/a |
| Estado de origem | I: aplicar uma dose já aplicada, agendar uma dose cancelada, reagendar uma dose que não está atrasada (409) | n/a |
| Existência e propriedade | I: dose inexistente, dose de outro usuário (404) | n/a |
| Rotina de prazo | Dose vencida vira Atrasada ao ser lida | dia seguinte ao vencimento |

### Dose avulsa (RF04, ADR-016)

Vacina cadastrada à mão, fora do calendário oficial. Ambiente: pessoa adulta com consentimento, relógio fixo em **2026-10-06**. A dose nasce Pendente e segue o mesmo ciclo de estados das oficiais.

| Campo | Partições | Valores limite |
|---|---|---|
| Nome da vacina | V: de 2 a 80 caracteres, com acento e espaços nas pontas (removidos). I: vazio, só espaços, ausente, com caractere de controle, tipo errado | 1 (inválido), 2 e 80 (válidos), 81 (inválido) |
| Qual dose | V: de 1 a 40 caracteres. I: vazia, ausente | 0 e 41 (inválidos), 1 e 40 (válidos) |
| Data prevista | V: de hoje até o último dia do 10º ano à frente. I: passada, distante demais, inexistente, formato brasileiro, ausente, corpo ausente | ontem (422), hoje e amanhã (201); 2036-12-31 (201) e 2037-01-01 (422) |
| Doses avulsas por pessoa | Até 30 | 30ª (201), 31ª (422) |
| Consentimento e propriedade | I: sem consentimento (403), pessoa inexistente ou de outro usuário (404), id inválido (400) | n/a |
| Ciclo de estados | V: agendar (T2), aplicar com data passada (T3), cancelar confirmando (T5). I: aplicar com data de amanhã e cancelar sem confirmar (422) | aplicar D+1 (422) |
| Rotina de prazo | Dose avulsa pendente vira Atrasada quando a data prevista passa | no próprio dia segue Pendente; no dia seguinte, Atrasada (T4) |
| Convivência com as oficiais | A avulsa aparece na lista da pessoa; editar a pessoa não a apaga nem a duplica | n/a |

### Assistente: texto e voz (RF06 e RF07)

| Campo | Partições | Valores limite |
|---|---|---|
| Pergunta | V: de 1 a 300 caracteres. I: vazia, só espaços, não texto | 0 e 301 (inválidos), 1 e 300 (válidos) |
| Limite de uso do chat | 60 por hora (ADR-010) | 60ª (200), 61ª (429) |
| Áudio, tipo | V: `audio/wav`. I: outro tipo, sem tipo, sem cabeçalho RIFF/WAVE | n/a |
| Áudio, tamanho | De 44 bytes até 60 s de WAV 16 kHz mono mais o cabeçalho | 43 (415), 44 (200), 1.921.024 (200), 1.921.025 (413) |
| Fala | V: reconhecida. I: não entendida (422) | n/a |
| Limite de uso da voz | 20 por hora | 20ª (200), 21ª (429) |

## O que este teste não cobre

- A **interface** (telas): coberta pelos testes do app (React Native Testing Library) e por checklist de acessibilidade, não por esta tabela.
- O **serviço de PLN e o Azure AI Speech reais**: aqui são simulados; a qualidade do chatbot tem relatório próprio (`avaliacao-chatbot.md`).
- **Concorrência e desempenho**: fora do escopo desta técnica.
- **Persistência no Azure SQL**: os repositórios têm testes de contrato próprios (`docs/15-persistencia-sql.md`).

## Limitação conhecida e honesta

Os valores esperados saíram da especificação (requisitos, ADRs e esquemas), mas os casos foram escritos e executados pelo mesmo autor; uma revisão por outra pessoa (por exemplo, o professor) é recomendada. Na primeira execução, um caso (CT-CP-C08) reprovou porque a **senha de teste escolhida estava na lista de senhas comuns**: foi erro da entrada do caso, não da API, e a entrada foi trocada por uma senha fora da lista. Na segunda rodada (parentesco e dose avulsa), um caso (CT-CP-V36, cancelar a dose avulsa sem confirmar) também reprovou na primeira execução: a expectativa escrita foi 400 (validação), mas a regra "cancelar exige confirmação" é uma guarda do domínio e devolve **422 `GUARD_VIOLATION`**, como já previa o caso das doses oficiais (CT-CP-D11). Foi erro da expectativa, não da API, e foi corrigida. Nenhum outro caso precisou de ajuste.
