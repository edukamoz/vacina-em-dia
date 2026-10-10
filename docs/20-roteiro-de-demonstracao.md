# Roteiro de demonstração por persona

Item do backlog: B35 (e SCRUM-27; critério 5 da banca: funcionalidades por persona). Estado em 10/10/2026. Serve para a apresentação: cada persona do `docs/01-visao-e-escopo.md` tem um caminho curto, com o que dizer e o que mostrar. Os nomes dos botões são os do app.

**Antes de começar:** suba o ambiente (`docker compose up --build`, ou a API e o app web em desenvolvimento), crie uma conta nova e aceite o consentimento. Para a voz, use o navegador ou o emulador Android com o microfone virtual ligado. Tenha à mão a caderneta de papel para a comparação final. Tempo total sugerido: 8 a 10 minutos.

## Abertura (30 s)

- Problema: doses esquecidas, caderneta perdida, dúvida sobre o que é indicado por idade, e barreiras de acesso para quem tem pouca familiaridade digital.
- Mostrar a **Apresentação** (tela inicial) e dizer que o app roda na web, no Android e no iOS a partir de uma base só, na Azure.
- Aviso que aparece em todo conteúdo vacinal: o app **não substitui a caderneta oficial nem a orientação de profissionais de saúde**.

## PE1: Mariana, 32 anos, mãe de duas crianças (RF01, RF02, RF03, RF04, RF05)

**Necessidade:** saber quais vacinas e quando, e receber lembretes.

| Passo | O que fazer | O que mostrar ou dizer |
|---|---|---|
| 1 | **Criar conta**: e-mail, senha, marcar o aceite dos termos | Só e-mail e senha; sem CPF nem Cartão Nacional de Saúde. Os links abrem os Termos de uso e a Política de privacidade |
| 2 | Tela **Antes de começar** (consentimento) | Termo em linguagem simples; a declaração de responsável aparece porque ela cadastrará crianças |
| 3 | Aba **Família** > **Adicionar pessoa**: um bebê, com parentesco "Filho" ou "Filha" | O calendário é gerado pela data de nascimento, conforme o Calendário Nacional de Vacinação 2026 |
| 4 | Aba **Doses** | Grupos "Precisam de atenção", "Próximas" e "Aplicadas"; fonte e versão do calendário no rodapé |
| 5 | Abrir uma dose > **Agendar**, escolher a data no calendário | Estado Pendente passa a Agendada; datas passadas são recusadas |
| 6 | **Registrar aplicação** | Passa a Aplicada e entra no histórico |
| 7 | Aba **Conta** > marcar "Receber lembretes por e-mail" | O cartão "Lembretes" na aba Doses mostra o que vence em até 7 dias; o e-mail sai às 8h com **só a quantidade**, sem nome de pessoa nem de vacina |

## PE2: Sr. José, 68 anos, baixa familiaridade com aplicativos (RF06, RF07, RNF04)

**Necessidade:** consultar por voz, telas simples e letras grandes.

| Passo | O que fazer | O que mostrar ou dizer |
|---|---|---|
| 1 | Aba **Conta** > **Tema** > **Alto contraste** e **Texto** > **Maior** | Contraste calculado pelo WCAG 2.1 AA; botões grandes (48 dp); o texto cresce em toda a interface; há ainda **Reduzir movimento** |
| 2 | Balão do **assistente** no canto da tela (abre a janela de conversa) > **Falar a pergunta** > "Para que serve a vacina BCG?" > **Parar e enviar** | A transcrição aparece ("🎤 ..."), seguida da resposta curada com a **fonte oficial** e as vacinas encontradas no calendário |
| 3 | Digitar "Meu filho está com febre, pode vacinar?" (pergunta de saúde individual, caso testado no PLN) | O assistente **não** dá orientação médica: encaminha a um profissional ou unidade de saúde (192 SAMU) |
| 4 | Negar o microfone (se der tempo) | Mensagem clara e o campo de texto continua disponível |

**Para dizer:** a busca usa TF-IDF e SVM (chatbot, F1 macro 0,93) e busca semântica com LSA (acerto na 1ª posição de 68,3% para 88,9% nas 63 consultas de teste); **sem IA generativa**; áudio só em memória, nunca gravado.

## PE3: Carla, 45 anos, cuida do pai, da mãe e do filho (RF02, RF04, RF08)

**Necessidade:** várias pessoas em uma conta e ver as pendências de todos.

| Passo | O que fazer | O que mostrar ou dizer |
|---|---|---|
| 1 | Aba **Família** > adicionar o pai (parentesco "Pai") e a mãe (parentesco "Mãe") | Resumo da família no alto; **Trocar pessoa** muda o calendário mostrado |
| 2 | Aba **Doses** de um idoso > **Adicionar dose** (dose avulsa): nome "Febre tifoide", "1ª dose", data pelo calendário | A dose recebe a etiqueta **Adicionada por você**, diferente da **Oficial**, e segue o mesmo ciclo de estados |
| 3 | Aba **Histórico** | Aplicadas e canceladas de **toda a família**, por ano; sem registros, o app explica como o histórico se preenche |
| 4 | Aba **Doses** > cartão **Postos de saúde perto de você** (ou **Postos** na lateral do computador) > **Usar minha localização** | Mapa e lista de unidades básicas de saúde perto, com distância; a posição não é guardada; sem internet a última lista continua; aviso "Ligue antes de ir" |
| 5 | Aba **Conta** > **Excluir minha conta** (só se for encerrar a demonstração) | Pede confirmação; apaga conta, pessoas e doses (LGPD) |

## Fecho (1 min)

- Rastreabilidade e testes: `docs/19-rastreabilidade.md`; 179 casos de caixa preta aprovados; 42 casos do ciclo da dose; 1.192 testes automatizados; CI com lint, tipos, testes, cobertura, `npm audit` e teste de fumaça do Docker.
- Infraestrutura como código (Bicep), custos estimados e equivalência AWS para Azure: `docs/08`, `docs/16`.
- Backlog no GitHub Projects ("proj-vacina-em-dia"): 47 itens em 9 épicos, com prioridade e critérios de aceite (`docs/24-backlog.md`).
- Limites assumidos: o mapa de postos (RF10) foi entregue, mas PDF e compartilhar com cuidador (RF11 e RF12) não foram iniciados; a voz, o mapa e a localização não foram testados em celular físico nem em iOS; as personas não foram validadas com usuários; lembretes por e-mail não têm push no celular.

## Pontos de atenção antes de apresentar

- **Dados de exemplo:** use contas de teste, nunca dados de pessoas reais.
- **E-mail de lembrete:** só aparece na caixa de entrada às 8h, então mostre o cartão "Lembretes" no app e o texto do e-mail pelo `docs/18` ou `ADR-017`; não dependa de esperar o envio.
- **Partida a frio do PLN:** a primeira pergunta do dia após uma nova publicação pode levar cerca de 50 s; faça uma pergunta de aquecimento antes de apresentar.
- **Voz:** teste o microfone antes (navegador com https ou localhost; emulador com o microfone virtual ligado).
