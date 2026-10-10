# Vacina em Dia: Identidade visual e o porquê das escolhas

Este documento explica **por que** a identidade visual do app é como é: nome, marca, cor, fonte, formas, movimento e tom de voz. Os valores exatos (tokens, componentes, medidas) estão em `docs/04-design-system.md` e `docs/04-design-system/tokens.json`; aqui fica a justificativa, para a defesa do projeto e para a Documentação Técnica.

> **Como ler as justificativas.** Cada escolha liga-se a uma necessidade do projeto: as personas (`docs/01-visao-e-escopo.md`, Quadro 3), os requisitos (RNF04, acessibilidade, e RNF10, honestidade do conteúdo) e as regras do design system. As razões sobre o *significado* da marca e da paleta são decisões de projeto registradas aqui; o autor deve conferir se a narrativa expressa o que pretendeu e ajustar o texto se não for o caso.

## 1. O ponto de partida: quem usa e o que importa

| Necessidade | Origem | O que pede da identidade |
|---|---|---|
| Idosos e pessoas com pouca familiaridade digital (PE2, Sr. José) | PR4, RNF04 | Letra grande e muito legível, contraste alto, alvos de toque grandes, poucas ações por tela |
| Famílias com pouco tempo (PE1, Mariana) e cuidadores de várias pessoas (PE3, Carla) | PR1, PR2 | Estado de cada dose compreendido num relance; sem enfeite que atrapalhe |
| Conteúdo de saúde exige confiança | RNF10, PR3 | Visual calmo, sem alarmismo; fonte e versão do calendário sempre à mostra |
| Dados sensíveis (LGPD) | RNF03 | Tom respeitoso e transparente; nada que pareça publicidade |

Disso saem as seis regras do design system: **legível primeiro, nunca só pela cor, alvos generosos, uma ação principal por tela, honestidade e beleza que não atrapalha**.

## 2. Nome e proposta

**Vacina em Dia** diz, em três palavras e sem sigla, a promessa do app: ter as vacinas da família **em dia**. É um nome de uso comum, fácil de falar (importante para a busca por voz) e de lembrar. O título de trabalho do projeto ("Carteira de Vacinação Digital com Lembretes e Assistente por Voz") descreve o produto; o nome curto é o que a pessoa diz e procura na loja.

## 3. A marca (logo)

- **Símbolo:** um **visto** (o sinal de "feito") formado por duas figuras, **um adulto e uma criança**, com um pequeno ponto dourado ao lado, como um sol ou uma cabeça de criança. O visto fala de tarefa cumprida (vacina em dia) e as duas figuras lembram que o cuidado é **em família**, o foco do app (membros, parentesco, cuidadores).
- **Por que não uma seringa:** a seringa lembra medo e dor, justamente o que pode afastar algumas pessoas; o visto com pessoas é acolhedor e fala de cuidado.
- **Alternativas estudadas:** a primeira versão da marca era um escudo verde com um visto branco, e houve ainda dois símbolos alternativos, um com calendário e outro com a letra V (guardados em `assets/logo/alternativas/`). *[O autor deve registrar aqui, com as próprias palavras, por que a versão com o adulto e a criança foi a escolhida.]*
- **Variações:** horizontal e vertical; clara, escura, uma cor e alto contraste. O alto contraste existe porque o app tem um tema de alto contraste e a marca não pode sumir nele; a versão de uma cor serve para impressão (panfleto) e fundos difíceis.
- **Ícone do app e favicon:** o símbolo em fundo verde-saúde, sem texto, para ser reconhecido em tamanhos pequenos. No Android há versão adaptativa e monocromática, que o sistema usa em ícones temáticos.
- **Arquivos:** `assets/logo/`, `assets/app/`; ícones PNG gerados em `apps/mobile/assets/images/`.

## 4. Cor

**Verde-saúde (`#0B6B52`, um verde-azulado).** O verde é a cor mais associada a saúde, cuidado e "tudo certo" no Brasil (a cruz verde das farmácias, o sinal verde de "ok"). O tom escolhido é **mais escuro e azulado** que um verde-limão por dois motivos práticos: dá **6,5:1 de contraste** com texto branco (acima dos 4,5:1 do WCAG 2.1 AA) e transmite seriedade, não "app de brincadeira". O fundo é um branco levemente esverdeado e os cartões são brancos, com sombra suave: calmo, limpo e "de clínica", sem cansar a vista.

**Cores de apoio, só como decoração.** Menta (`decorMenta`) e dourado (`decorSol`) aparecem em formas de fundo, brilhos e avatares. Trazem calor e a ideia de criança e de sol, mas **nunca** carregam informação: se sumirem, nada se perde. Os avatares usam quatro cores suaves com a inicial em texto escuro, para distinguir pessoas da família num relance (PE3).

**Cores dos cinco estados da dose.** Cada estado tem uma cor própria *e* um ícone *e* um texto:

| Estado | Cor | Ícone | Lógica |
|---|---|---|---|
| Pendente | cinza-azulado | relógio | neutra: ainda sem data, nada a temer |
| Agendada | azul | calendário | azul = informação e planejamento |
| Atrasada | vermelho | alerta | exige atenção; **sem alarmismo** (o texto diz "Atrasada" e o que fazer) |
| Aplicada | verde de folha | visto | cumprido |
| Cancelada | cinza | traço | encerrado, sem destaque |

**O verde da marca e o verde de "Aplicada" são diferentes de propósito:** ficam separados por matiz (cerca de 58°) e por função, e o "Aplicada" sempre vem com o ícone de visto e o texto. Assim, a cor da marca nunca é lida como estado da dose.

**Nunca só pela cor.** Cerca de 1 em cada 12 homens tem alguma dificuldade de distinguir cores, e muitos idosos perdem sensibilidade ao contraste. Por isso cor, ícone e texto andam juntos em todo estado (RNF04).

**Três temas.** *Claro* (padrão), *Escuro* (conforto à noite e menos brilho) e *Alto contraste* (fundo branco, texto preto, bordas pretas de 3 px, sem sombra, gradiente ou transparência), pensado para baixa visão. O app segue a escolha do sistema e a pessoa pode trocar na Conta. Todos os pares de cor têm o contraste calculado e conferido contra o WCAG 2.1 AA (texto normal 4,5:1; componentes 3:1).

## 5. Tipografia

**Atkinson Hyperlegible**, criada pelo Braille Institute para **máxima legibilidade por pessoas com baixa visão**: letras que não se confundem (como "I" maiúsculo, "l" minúsculo e "1", ou "O" e "0", este com corte) e formas abertas e claras. É a escolha mais coerente com o público idoso e com o princípio "legível primeiro". É uma fonte livre (sem custo de licença) e carrega pelo `expo-font`.

- **Tamanho-base de 18 dp** (acima dos 16 usuais) e nada abaixo de 16 dp. Todo texto cresce junto com a configuração de tamanho do sistema até 200% (WCAG 1.4.4) e o app oferece ainda **Normal, Grande e Maior** na Conta.
- **Só dois pesos** (regular e negrito): hierarquia simples, sem fios finos que somem em telas ruins.
- **Escala com poucos níveis** (título 1, 2 e 3, corpo, rótulo, apoio, botão, destaque e exibição): quem lê entende rápido o que é título e o que é detalhe.

## 6. Forma, espaço e profundidade

- **Cantos arredondados** (12 a 28 px; "selo" totalmente redondo): passam acolhimento e reforçam que botões e cartões são tocáveis. Na versão 2 os raios cresceram porque o visual da versão 1, de bordas retas e finas, foi considerado "engessado".
- **Superfícies com sombra suave** em vez de bordas: a profundidade indica o que é clicável e o que está em primeiro plano sem poluir. No tema Alto contraste a sombra some e a borda de 3 px faz a separação.
- **Alvos de toque grandes:** 48 dp no mínimo e 56 dp nas ações principais, com 8 dp de folga, porque dedos idosos e telas pequenas erram alvos pequenos.
- **Gradiente discreto** só no verde da marca (botão principal, botão de voz, balão do assistente): dá vida sem competir com a informação.
- **Um botão principal por tela:** a pessoa sempre sabe qual é o próximo passo.

## 7. Movimento

O movimento tem **função**: mostrar de onde veio algo (entrada dos blocos, janela do assistente), confirmar uma ação (o visto se desenha ao registrar uma aplicação, o botão encolhe ao clicar) e dar vida à apresentação (paralaxe, revelar na rolagem). Duração de 120 a 400 ms, sem nada piscando e sem animação em laço sozinha.

**Nada depende de animação.** Na Conta, o movimento tem três modos: **Animar sempre** (padrão do projeto, para a apresentação mostrar o desenho completo), **Seguir o aparelho** e **Reduzir movimento**, e há um atalho nas telas de antes do login. O tema Alto contraste sempre deixa tudo parado e quem escolhe "Seguir o aparelho" ou "Reduzir" vê tudo pronto (WCAG 2.3.3 e quem tem sensibilidade a movimento ou vestibulares).

## 8. Tom de voz

Português do Brasil, frases curtas, voz ativa, **sem "por favor", exclamação, emoji, sigla ou jargão**. Botões começam com verbo ("Agendar", "Registrar aplicação"). Erros dizem o que houve e o que fazer, nunca mensagem técnica. Os cinco estados sempre têm a mesma grafia. Por quê: o público tem pouca familiaridade digital e saúde pede seriedade; a clareza vale mais do que a simpatia forçada. **O app nunca dá orientação médica individual** e todo conteúdo vacinal mostra a fonte e a versão do calendário e o aviso de que não substitui a caderneta oficial.

## 9. Ilustrações e ícones

Ícones de traço simples, todos no mesmo estilo (traço de 2 px, pontas arredondadas), legíveis em 24 px e sempre acompanhados de texto nos itens de navegação. As ilustrações de estados vazios, de erro e de carregamento são leves e neutras, sem rostos nem situações de doença, para não assustar. Arquivos em `assets/icones/` e `assets/ilustracoes/`.

**Pessoas da apresentação.** A página inicial usa seis retratos recortados do fundo (mãe com bebê, pessoa idosa, cuidadora, bebê, criança e gestante) e um fundo de vidro. Todos foram **gerados por inteligência artificial (Gemini)**: as pessoas não existem. Isso evita direito de imagem e privacidade de pessoas reais (LGPD), e a própria página avisa que as pessoas são fictícias. No alto da página elas saem do fundo, em camadas de profundidade, com paralaxe e inclinação 3D que seguem o mouse; nas fases da vida aparecem em círculos coloridos e, na seção "Feito para quem cuida de gente", sobre quadros coloridos, uma para cada persona (PE1 Mariana, PE2 Sr. José, PE3 Carla). Ficam em `apps/mobile/assets/images/pessoas/` em WebP com transparência, reduzidas para 640 px (35 a 47 KB cada); os arquivos originais não vão para o Git. O texto alternativo de cada imagem diz que é um personagem fictício.

## 10. Onde cada decisão está no projeto

| Assunto | Arquivo |
|---|---|
| Tokens (cor, tipografia, medidas, sombras, movimento) | `docs/04-design-system/tokens.json` |
| Regras e componentes | `docs/04-design-system.md` |
| Briefing da versão 2 | `docs/04-design-system/briefing-redesign.md` |
| Logo, ícones e ilustrações | `assets/` |
| Protótipo e variáveis no Figma | `docs/04-design-system.md`, seção 8, e `docs/04-design-system/figma-plugin/` |
| Acessibilidade verificada | `docs/19-rastreabilidade.md` (RNF04) e `docs/07-testes/` |
