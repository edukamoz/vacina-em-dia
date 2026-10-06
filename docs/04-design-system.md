# Vacina em Dia: Design System

Item do Jira: SCRUM-32 (requisitos RNF04 e RNF09). Versão 0.1 (rascunho), 06/10/2026. Fonte dos valores: [`04-design-system/tokens.json`](04-design-system/tokens.json). Decisão relacionada: ADR-011.

O app é **um só código para Android, iOS e web** (RNF09). Por isso o design system é **responsivo desde o início**: o mesmo conjunto de tokens e componentes serve ao celular (pessoa tocando) e à web em computador (mouse e teclado). O público inclui idosos (Sr. José, 68 anos) e pessoas com pouca familiaridade digital, então a acessibilidade é a regra principal, não um acabamento.

## 1. Princípios

1. **Legível primeiro.** Texto grande, contraste alto e fonte desenhada para baixa visão (Atkinson Hyperlegible).
2. **Nunca só pela cor.** Todo estado tem cor, **ícone** e **texto**. Quem não distingue cores ainda lê "Atrasada".
3. **Alvos de toque generosos.** Mínimo de 48 dp, 56 dp nas ações principais e 8 dp de folga entre alvos.
4. **Uma tarefa por tela, uma ação principal por vez.** Menos decisões, menos erro.
5. **Linguagem simples.** Frases curtas, sem sigla nem termo técnico (ver seção 7).
6. **Funciona sem voz e sem toque.** A voz é um atalho, nunca o único caminho; na web tudo é operável por teclado.
7. **Honestidade sobre o conteúdo.** Todo conteúdo vacinal mostra a fonte e a versão e avisa que o app não substitui a caderneta oficial nem a orientação de profissionais de saúde.

## 2. Tokens

### 2.1 Cor

A cor da marca é o **verde-saúde**. São **três temas**: Claro, Escuro e Alto contraste. O tema segue o sistema por padrão; o usuário pode trocar nas configurações. O Alto contraste usa fundo branco, texto preto, bordas pretas de 3 px e **sem fundos tingidos**.

Nomes semânticos (iguais nos três temas; só mudam os valores):

| Token | Uso |
|---|---|
| `fundo`, `superficie` | Fundo da tela e dos cartões |
| `texto`, `textoSecundario` | Texto principal e de apoio |
| `borda` | Contornos de campos, cartões e botões secundários |
| `primaria`, `sobrePrimaria`, `primariaSuave` | Botão principal, texto sobre ele e fundo suave |
| `pendente`, `agendada`, `atrasada`, `aplicada`, `cancelada` (+ `...Suave`) | Os cinco estados da dose |
| `foco` | Anel de foco do teclado |
| `erro`, `erroSuave` | Mensagens de erro |

**Valores do tema Claro** (os dos outros temas estão em `tokens.json`):

| Token | Valor | Contraste mais crítico |
|---|---|---|
| `fundo` | `#FFFFFF` | |
| `superficie` | `#F2F7F5` | |
| `texto` | `#12201B` | 16,8:1 sobre o fundo |
| `textoSecundario` | `#40524B` | 8,3:1 sobre o fundo |
| `borda` | `#6B7D75` | 4,4:1 sobre o fundo (mínimo para componente: 3:1) |
| `primaria` | `#0B6B52` | 6,5:1 com texto branco |
| `pendente` / `pendenteSuave` | `#44525F` / `#ECEFF3` | 7,0:1 |
| `agendada` / `agendadaSuave` | `#0A5C9E` / `#E3EFF9` | 5,9:1 |
| `atrasada` / `atrasadaSuave` | `#B3261E` / `#FCE8E6` | 5,6:1 |
| `aplicada` / `aplicadaSuave` | `#2F6A1D` / `#E4F2DC` | 5,6:1 |
| `cancelada` / `canceladaSuave` | `#5B6670` / `#EEEEEE` | 5,1:1 |

**Metas e resultado:** texto normal exige 4,5:1 e componente de interface exige 3:1 (WCAG 1.4.3 e 1.4.11, nível AA). O texto principal está acima de 7:1 (nível AAA). O ponto mais baixo de texto é a `cancelada` no tema Claro, com 5,1:1. No Escuro, o menor contraste de texto é 5,9:1. No Alto contraste, o menor é 9,6:1 (todos acima de 7:1).

**Verde da marca e verde de "Aplicada".** Os dois são verdes, mas ficam separados por **matiz** (a primária é um verde-azulado, a "Aplicada" é um verde de folha, cerca de 58° de diferença) e por **função**: a "Aplicada" **sempre** aparece com o ícone de confirmação e o texto "Aplicada" em um selo. O verde da marca nunca aparece sozinho como estado de dose.

### 2.2 Tipografia

- **Família:** Atkinson Hyperlegible (fonte livre, desenhada para legibilidade por pessoas com baixa visão). Carregada com `expo-font` (pacote `@expo-google-fonts/atkinson-hyperlegible`, verificado no npm em 06/10/2026). Fonte reserva do sistema enquanto carrega.
- **Base:** 18 dp. Todo texto escala com a configuração de tamanho do sistema até **200%** (WCAG 1.4.4); nenhum componente pode quebrar nem esconder conteúdo nessa escala.
- **Pesos:** regular (400) e negrito (700).

| Estilo | Tamanho / linha | Peso | Uso |
|---|---|---|---|
| `titulo1` | 32 / 40 | 700 | Título da tela |
| `titulo2` | 26 / 34 | 700 | Seção |
| `titulo3` | 22 / 30 | 700 | Título de cartão |
| `corpo` | 18 / 27 | 400 | Texto corrido |
| `corpoNegrito` | 18 / 27 | 700 | Destaque |
| `rotulo` | 16 / 24 | 700 | Rótulo de campo e selo |
| `apoio` | 16 / 24 | 400 | Dica, data, aviso |
| `botao` | 18 / 24 | 700 | Texto de botão |

Nenhum texto fica abaixo de 16 dp.

### 2.3 Espaçamento, raios e bordas

| Grupo | Valores (dp) |
|---|---|
| Espaçamento | 4, 8, 12, 16, 24, 32, 48 |
| Raios | campo 8, cartão 12, botão 14, selo totalmente arredondado |
| Bordas | padrão 2, faixa de estado 6, alto contraste 3, anel de foco 3 |

### 2.4 Toque, foco e movimento

- **Alvos:** mínimo 48 dp, ações principais 56 dp, folga de 8 dp entre alvos vizinhos. O WCAG 2.5.5 pede 44, nível AAA; a pesquisa com pessoas idosas aponta alvos maiores e folga entre eles.
- **Foco visível:** anel de 3 px com contraste de no mínimo 3:1 contra o que está ao redor, em todo elemento interativo. Obrigatório na web (teclado).
- **Movimento:** transições de 120 a 200 ms, sem animação essencial; respeitar a configuração "reduzir movimento" do sistema.

### 2.5 Responsividade (celular e web)

| Faixa | Largura | Onde | Navegação | Conteúdo |
|---|---|---|---|---|
| Compacto | menos de 600 | Celular | Barra inferior com 4 itens | Uma coluna, margem de 16 |
| Médio | 600 a 1023 | Tablet e janela estreita | Barra lateral compacta (ícone e texto) | Uma ou duas colunas, margem de 24 |
| Expandido | 1024 ou mais | Web em computador | Barra lateral fixa com texto | Largura máxima de 960 centralizada, doses em duas colunas, margem de 32 |

- O **mesmo componente** muda de disposição, não de comportamento.
- Na web há **estados de passar o mouse e de foco por teclado** que não existem no toque; o estado de pressionado vale para os dois.
- A **ordem de tabulação** segue a ordem visual; há um link "Pular para o conteúdo" no topo.
- A **voz na web** exige HTTPS e permissão do microfone; se negada ou indisponível, o botão leva ao campo de texto.
- O **push** não existe na web (ver `sequencia-lembrete.md`); lá, o sinal de dose atrasada aparece dentro do app.

## 3. Componentes base

Todos aceitam os três temas, o texto a 200% e uso por teclado, toque e leitor de tela.

| Componente | Variações | Regras principais |
|---|---|---|
| **Botão** | principal, secundário, perigo (cancelar e excluir) | Altura de 56 dp no principal e 48 dp nos demais; texto sempre visível, com ícone opcional; **no máximo um botão principal por tela**; estados: normal, passar o mouse, foco, pressionado, desativado (evitar) e carregando |
| **Campo de texto** | texto, e-mail, senha, data | Rótulo sempre visível **acima** do campo (nunca só o texto de exemplo), dica abaixo, erro abaixo com ícone e texto; altura mínima de 56 dp; senha com botão "Mostrar" |
| **Cartão** | simples, de dose, de membro | Borda de 2 px; cartão de dose tem faixa de 6 px na lateral com a cor do estado; todo o cartão é um alvo de toque quando abre o detalhe |
| **Selo de estado da dose** | Pendente, Agendada, Atrasada, Aplicada, Cancelada | Ícone + texto + cor; texto no rótulo de acessibilidade ("Dose atrasada") |
| **Botão de voz** | ouvindo, processando, erro | 56 dp ou mais, com ícone de microfone e texto "Perguntar por voz"; mostra o texto reconhecido e oferece "Digitar" se falhar |
| **Caixa de confirmação** | cancelar dose, excluir conta | Título claro, consequência descrita em uma frase, botão perigoso e botão "Voltar" com o mesmo peso visual |
| **Aviso de fonte e versão** | rodapé de conteúdo vacinal | Mostra fonte, versão e a frase de que o app não substitui a caderneta; marca "Calendário de exemplo" quando `is_fictitious` |
| **Navegação** | barra inferior, lateral | 4 itens: Doses, Família, Histórico, Conta; item atual com texto em negrito e marca, não só cor |
| **Estado vazio** | | Ícone, título que convida ("Vamos cadastrar a primeira pessoa") e um botão de ação |
| **Estado de erro** | | O que aconteceu, o que fazer, botão "Tentar de novo"; nunca mensagem técnica |
| **Estado carregando** | esqueleto e indicador | Anuncia "Carregando" ao leitor de tela; sem tela em branco |

### Selo de estado da dose

| Estado | Rótulo | Ícone | Cor (Claro) | Dica de leitura |
|---|---|---|---|---|
| `PENDING` | Pendente | relógio | `pendente` | "Ainda sem data marcada" |
| `SCHEDULED` | Agendada | calendário | `agendada` | "Marcada para DD/MM" |
| `OVERDUE` | Atrasada | triângulo de alerta | `atrasada` | "Era para DD/MM" |
| `APPLIED` | Aplicada | círculo com confirmação | `aplicada` | "Aplicada em DD/MM" |
| `CANCELLED` | Cancelada | círculo com X (texto riscado) | `cancelada` | "Não é mais necessária" |

## 4. Telas principais (MVP)

Cada tela tem versão **compacta (celular)** e **expandida (web)**. O protótipo está no Figma (seção 8).

| Tela | Requisito | Celular | Web |
|---|---|---|---|
| Entrar e criar conta | RF01 | Uma coluna, botão de largura total | Cartão centralizado de até 480 |
| Consentimento | RF09 | Texto em linguagem simples, botão "Aceito" | Mesmo, em coluna de leitura |
| Início: pessoas da família | RF02 | Lista de cartões de membro | Grade de cartões ao lado da barra lateral |
| Calendário do membro | RF03 e RF04 | Lista de cartões de dose, mais atrasadas primeiro | Duas colunas, filtro por estado |
| Detalhe da dose | RF04 | Ações: agendar, registrar aplicação, cancelar | Painel ao lado da lista |
| Histórico | RF08 | Doses aplicadas por data | Tabela simples com cabeçalhos |
| Perguntar por voz | RF06 | Botão grande de voz e resultado | Mesmo, com atalho de teclado |
| Assistente (chatbot) | RF07 | Conversa com respostas e fonte | Coluna central |
| Conta e privacidade | RF09 | Exportar e **excluir conta** com confirmação | Mesmo |

## 5. Acessibilidade: checklist (RNF04)

Verificar em toda tela nova, nos três temas e a 200% de texto.

- [ ] Texto normal com contraste de 4,5:1 ou mais; texto grande e componentes com 3:1 ou mais.
- [ ] Nenhuma informação só por cor; todo estado tem ícone e texto.
- [ ] Alvos de toque com 48 dp ou mais (56 dp nas ações principais) e 8 dp de folga.
- [ ] Texto a 200% sem perda de conteúdo, sem rolagem horizontal e sem sobreposição.
- [ ] Todo elemento interativo com rótulo de acessibilidade, papel e estado (`accessibilityLabel`, `accessibilityRole`, `accessibilityState` no app; atributos ARIA na web).
- [ ] Ordem de foco e de leitura igual à ordem visual; foco visível; operável só por teclado na web.
- [ ] Erros descritos em texto, ligados ao campo, e anunciados ao leitor de tela.
- [ ] Voz com alternativa de digitação; microfone negado tratado com mensagem clara.
- [ ] Respeita "reduzir movimento".
- [ ] Linguagem simples, sem sigla; aviso de fonte e de que não substitui a caderneta.
- [ ] Testado com leitor de tela (TalkBack, VoiceOver e um leitor na web) nas telas principais.

## 6. Como os tokens entram no código (SCRUM-23)

O projeto ainda não tem `apps/mobile`, então os tokens são **especificados** aqui e em `tokens.json`; a aplicação no `tailwind.config` do NativeWind acontece no setup do monorepo (SCRUM-23). Plano:

1. Gerar o `tailwind.config` e as variáveis de tema a partir de `tokens.json`, para os três temas.
2. Um `ThemeProvider` (Context API, ADR-006) guarda o tema escolhido e aplica as variáveis. Por padrão segue o sistema (claro ou escuro); **Alto contraste** é escolha do usuário, e na web também pode seguir a preferência de contraste do navegador (a validar no SCRUM-23, porque o suporte varia).
3. Carregar a fonte com `expo-font` e **testar o carregamento na web**.
4. Testes de componentes com a React Native Testing Library verificam rótulos, papéis e tamanhos mínimos.

As versões exatas de NativeWind, Expo e da fonte entram em `docs/tech-versions.md`.

## 7. Linguagem e microcopy

- Texto em português do Brasil, frases curtas, voz ativa, sem "por favor", sem exclamação e sem jargão.
- **Estados da dose:** Pendente, Agendada, Atrasada, Aplicada, Cancelada (sempre com essa grafia).
- **Botões** começam com verbo: "Agendar", "Registrar aplicação", "Cancelar dose", "Excluir minha conta".
- **Erros** dizem o que aconteceu e o que fazer: "Não foi possível salvar. Confira sua internet e tente de novo."
- **Datas** no formato DD/MM/AAAA; com 200% de texto podem quebrar em duas linhas.
- **Nunca** dar orientação médica individual; o assistente responde com conteúdo curado e cita a fonte (RF07, RNF10).

## 8. Protótipo no Figma

Arquivo **Vacina-em-dia** (a vincular). Conteúdo planejado:

1. **Variáveis:** cores nos três modos (Claro, Escuro e Alto contraste), espaçamento, raios e estilos de texto, espelhando `tokens.json`.
2. **Componentes:** os da seção 3, com as variações e os estados.
3. **Telas principais:** da seção 4, em **celular (390 px)** e **web (1280 px)**, mais uma largura **média (768 px)** para as telas de Início e Calendário.

Link do arquivo: _a preencher quando a vinculação for concluída._

## 9. Referências

- WORLD WIDE WEB CONSORTIUM. *Web Content Accessibility Guidelines (WCAG) 2.1*. 2018. Critérios 1.4.3 (contraste mínimo), 1.4.4 (redimensionar texto), 1.4.11 (contraste de não texto) e 2.5.5 (tamanho do alvo).
- BRAILLE INSTITUTE. *Atkinson Hyperlegible*. Fonte livre desenhada para legibilidade.
- Pesquisas sobre alvos de toque para pessoas idosas, consultadas em 06/10/2026 (por exemplo, o resumo do W3C Mobile Accessibility Task Force sobre tamanho de alvo); os valores variam entre estudos, por isso adotamos margens acima do mínimo do WCAG.
