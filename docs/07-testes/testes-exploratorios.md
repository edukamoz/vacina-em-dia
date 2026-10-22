# Testes exploratórios: charters e heurística HICCUPPS

Item B63. Estado em 22/10/2026. Aplica o material "Testes de regressão e exploratórios". O teste exploratório complementa a automação: procura o que nenhum caso escrito previu. Cada sessão tem uma missão (charter), tempo fixo e anotações.

> **Atenção:** os charters abaixo são **propostas** escritas a partir do código e da documentação. **Nenhuma sessão foi executada.** As tabelas de resultado estão vazias de propósito; quem testa e anota é o autor (CLAUDE.md §13, nada de resultado inventado). O template do professor, citado na aula, não está no repositório; se ele pedir outro formato, os campos abaixo mapeiam para ele.

## 1 Como usar

1. Escolha um charter e reserve o tempo (sessão cronometrada de 30 a 45 minutos).
2. Use a lista HICCUPPS do charter como roteiro mental; anote o que observar, inclusive o que parecer estranho.
3. Registre cada achado na tabela do charter: o que fez, o que esperava, o que viu e a gravidade (crítica, alta, média, baixa).
4. Todo defeito vira item do backlog (tipo Bug) e, depois de corrigido, ganha um teste automatizado que o reproduz (plano de teste §4.4).
5. Sessões acontecem ao fim de cada sprint e depois de cada entrega para a produção (ver `plano-de-teste.md` §4.5).

## 2 HICCUPPS aplicada ao Vacina em Dia

| Letra | Pergunta no nosso contexto |
|---|---|
| **H** (History) | Em que parte já tivemos defeito? Datas, atrasos, nomes longos, layout da barra lateral. |
| **I** (Intent) | O botão faz o que o rótulo diz? "Confirmar" só grava depois de confirmar? |
| **C** (Consistency) | Telas parecidas se comportam igual? Confirmação de exclusão de pessoa, de dose e de conta. |
| **C** (Comparison) | Como era na versão anterior ou na caderneta de papel? O calendário mostra o mesmo que o PNI? |
| **U** (User expectations) | O que a Mariana, o Sr. José e a Carla esperam ao tocar ou falar? |
| **P** (Product) | A mudança em um lugar aparece nos outros (dose, lembrete, histórico, painel de gráficos)? |
| **P** (Purpose) | A tarefa ficou simples para quem tem pouca familiaridade digital? |
| **S** (Statutes) | LGPD: consentimento, exclusão, dado de menor, sem CPF; aviso de que não substitui a caderneta. |

## 3 Charters propostos

### CH-01 Ciclo da dose nas bordas do calendário

- **Missão:** explorar o registro, o agendamento e o atraso de doses perto da virada de dia, de mês e de ano, com datas passadas e futuras, para descobrir erros de data ou de estado.
- **Persona e área:** Mariana (PE1); Aba Doses, detalhe da dose, Histórico, Lembretes.
- **Heurísticas:** H (as regras de data foram a parte mais delicada da máquina de estados), I (agendar exige data de hoje em diante; aplicar exige data até hoje), P (a mudança deve aparecer no Histórico, nos Lembretes e no Painel).
- **Ideias de teste:**
  - Agendar para hoje às 23h59 e abrir de novo no dia seguinte: a dose passa a Atrasada?
  - Aplicar com a data de amanhã e com a data de nascimento anterior; reagendar uma dose Atrasada.
  - Dose avulsa repetida; pessoa com nome muito longo; pessoa nascida hoje.
  - Ver se a contagem do Painel de gráficos bate com a lista da aba Doses.
- **Tempo:** 40 minutos.
- **Riscos que motivam:** RF04 e RF05; a rotina de atraso só roda por tempo, então defeito de data passa despercebido nos testes com relógio fixo.

### CH-02 Assistente com frases confusas, por voz e texto

- **Missão:** explorar o assistente com frases mal formadas, misturas de pergunta e comando, nomes parecidos com vacinas e falhas de microfone, para descobrir respostas erradas ou ações indevidas.
- **Persona e área:** Sr. José (PE2); balão e aba Assistente, botão "Falar a pergunta".
- **Heurísticas:** U (a pessoa espera ser entendida na primeira tentativa), P (o assistente age sobre a conta: o que ele faz tem de bater com as telas), S (nunca orientação médica nem dado pessoal fora do app).
- **Ideias de teste:**
  - "Registrar que a Maria tomou a vacina e teve febre": deve ir para a orientação de procurar um profissional, sem registrar nada.
  - "Adiciona a Gripe na família" (nome igual a vacina); "tomou a BCG" sem dizer quem; datas inexistentes (31/02).
  - Sem permissão de microfone; fala com ruído; pergunta vazia; texto muito longo.
  - Tocar em Confirmar duas vezes; Cancelar e depois repetir; confirmar uma ação depois de trocar de pessoa.
- **Tempo:** 40 minutos.
- **Riscos que motivam:** RF06, RF07; risco de orientação médica indevida; B61 (assistente que grava dados).

### CH-03 Conta, consentimento e exclusão de dados

- **Missão:** explorar criação de conta, consentimento, edição de dados da família e exclusão de conta, para descobrir dados que sobram ou telas que contradizem a política de privacidade.
- **Persona e área:** Carla (PE3, cuidadora de vários familiares); Conta, Família, Termos e Política de privacidade.
- **Heurísticas:** S (LGPD: exclusão remove tudo, inclusive foto, lembretes e dados de menores), C (as confirmações de exclusão devem ser parecidas), I (o que a política promete é o que o app faz).
- **Ideias de teste:**
  - Excluir uma conta com várias pessoas, doses, foto de perfil e lembretes por e-mail ligados; tentar entrar de novo e recriar com o mesmo e-mail.
  - Recusar o consentimento; cadastrar menor de idade; voltar atrás no meio do fluxo.
  - Duas abas abertas: excluir em uma e usar a outra.
  - Sair (barra lateral e celular) com uma chamada ainda em andamento.
- **Tempo:** 40 minutos.
- **Riscos que motivam:** RF01, RF02, RF09, RNF03; dado de saúde é sensível.

### CH-04 Layout, texto ampliado e temas (extra)

- **Missão:** explorar telas em larguras de celular, tablet e computador, com texto ampliado e tema de alto contraste, para descobrir cortes, sobreposições e perda de função.
- **Persona e área:** Sr. José (PE2) e Mariana; barra lateral, abas, Doses, Postos, Painel de gráficos, Novidades.
- **Heurísticas:** C (menus iguais nas duas larguras), U (o botão Sair e a Conta onde se espera), P (o avatar aparece em todas as telas), H (o card de dose com nome longo e o efeito de passar o mouse na página inicial já deram defeito).
- **Ideias de teste:** texto no maior tamanho; reduzir movimento; girar o celular; lista de postos com muitos resultados; carrossel de novidades com títulos longos.
- **Tempo:** 30 minutos.
- **Observação:** parte disso é checagem **manual** de regressão visual (a aula separa esse tipo de regressão da automatizada). Dispositivos físicos seguem pendentes no B40.

## 4 Registro das sessões (a preencher)

| Charter | Data | Quem | Tempo gasto | Achados (qtd. e gravidade) | Itens do backlog abertos |
|---|---|---|---|---|---|
| CH-01 | | | | | |
| CH-02 | | | | | |
| CH-03 | | | | | |
| CH-04 | | | | | |

Notas da sessão: usar uma linha por observação, no formato `ação → esperado → visto → gravidade`.

## 5 Cuidados

- Use contas e dados **fictícios**; nunca dados reais de saúde de ninguém (plano §4.3).
- Em ambiente de produção, não rode sessões que apaguem contas que não sejam de teste.
- O teste exploratório **não substitui** os testes automatizados: ele os alimenta com novos casos.
