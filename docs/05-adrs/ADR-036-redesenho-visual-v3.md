# ADR-036: Redesenho visual v3 do aplicativo (web e celular)

- **Status:** aceito em 16/11/2026 (decisão do autor: aprovou o protótipo e mandou começar o redesenho já, sem esperar a entrega de 19/11)
- **Relacionados:** ADR-011 (design system), ADR-026 (movimento padrão segue o aparelho), ADR-034 (código por plataforma); itens B77 e B78 do backlog
- **Requisitos:** RNF04 (acessibilidade), RNF09 (multiplataforma)

## Contexto

O design system (versão 2.0.0 dos tokens, 24/10/2026) nasceu com a acessibilidade como regra e a identidade verde-saúde. Desde então entraram recorrência de vacinas, avisos, família com vários responsáveis, animais de estimação, viagem, fichas das vacinas e contingência. As telas cresceram por acúmulo. Uma revisão do app publicado, feita em 16/11/2026 em tamanho de celular, achou estes problemas:

- **A tarefa principal fica escondida.** Na tela Doses, título, botão "Adicionar dose", seletor de pessoa e cartão de progresso ocupam o primeiro quadro; a dose atrasada só aparece depois de rolar.
- **O botão flutuante do assistente cobre conteúdo** em todas as abas.
- **Tudo tem o mesmo peso:** contornos de 2 px em toda parte e três botões do mesmo tamanho no detalhe da dose (o destaque ia para "Reagendar", não para "Registrar aplicação").
- **O cartão de progresso desperdiça espaço** (anel à esquerda e vazio à direita).
- **O zero cortado da Atkinson Hyperlegible** parece "Ø" em datas e contagens, o que atrapalha quem tem pouca familiaridade digital.
- **Não há regra para texto longo:** há `numberOfLines` espalhado (título da dose com 2 linhas e corte), sem critério.

O protótipo aprovado está no Claude (quadro "Vacina em Dia: novo design", privado) e cobre Doses, detalhe, Família, Histórico, Conta, Painel, Postos, janelas, acesso, landing, versão web e app instalável.

## Decisão

1. **Mantém** a paleta, os três temas (Claro, Escuro, Alto contraste), a fonte Atkinson Hyperlegible, a base de 18 dp, os alvos de 48 e 56 dp e todos os contrastes atuais. O que muda é a forma e o movimento.
2. **Forma:** menos contorno e mais superfície. Cartões com fio de 1 px e sombra suave; contorno forte de 2 px **só em controles** (botão secundário, campo, opção, interruptor), onde o contraste de 3:1 é exigido. Raios maiores (campo 16, botão 18, cartão 24, folha 32). Um bloco de resumo em degradê por tela (cor chapada no Escuro e no Alto contraste).
3. **Navegação:** o assistente vira o **botão central da barra inferior** (microfone) e o balão flutuante é removido. Na web e no tablet continua a barra lateral, com o assistente em destaque no pé.
4. **Hierarquia de botões:** principal (um por tela), secundário (contorno) e texto (perigo só em vermelho). A ação rápida "Aplicar" no cartão da dose atrasada é um botão principal compacto.
5. **Cabeçalho padrão** de tela (título 30/36, subtítulo de apoio opcional, ação à direita) e **faixa de pessoas** no topo de Doses, com ponto vermelho em quem tem dose atrasada.
6. **Movimento suave:** curva de saída `cubic-bezier(.2,.8,.2,1)`, de 200 a 450 ms, entrada em sequência de 50 ms, toque com escala de 0,95 a 0,98. Tudo continua desligável por "Reduzir movimento" (ADR-026), e o Alto contraste fica parado.
7. **Consistência verificada por lint:** texto só pelo componente `Texto` (sem tamanho de fonte avulso), cor só por token (sem hexadecimal em `.tsx`), espaçamento só na escala 4, 8, 12, 16, 24, 32 e 48.
8. **Regra de texto longo (quebra e reticências):**
   - **Quebra sempre, nunca reticências:** nome da vacina e da dose, estado, datas, mensagens de erro, botões, rótulos de campo, fonte e avisos. O cartão cresce em altura.
   - **Reticências permitidas (1 ou 2 linhas):** e-mail, nome de pessoa em ficha ou chip, endereço de posto e linhas de apoio.
   - O componente `Texto` ganha a propriedade `truncar` (número de linhas). Quem a usa dá o texto inteiro no rótulo de acessibilidade, na dica ao passar o mouse (web) e na tela de detalhe.
   - **O truncamento é desligado** quando o "Tamanho do texto" da Conta está em Grande ou Maior, ou quando o aparelho amplia a fonte além de 130%: o texto quebra. Isso preserva o critério 1.4.4 do WCAG (texto a 200% sem perder conteúdo).
   - Todo contêiner de texto tem `min-width: 0` (e `flex-shrink`) para o texto não empurrar a coluna.
9. **Instalável:** abertura verde da marca, ícone arredondado do projeto, convite de instalação depois da primeira dose registrada e passo a passo para iPhone (o Safari não oferece o aviso automático).
10. **Sem dependência nova prevista.** Degradês e SVG já existem no app; qualquer pacote novo volta ao autor antes.

## Fora desta decisão (ficam como pendência)

- **Foto por pessoa** (o protótipo mostra fotos nos membros). Hoje só existe a foto de perfil da conta. Foto por pessoa seria funcionalidade nova, com implicação de LGPD (dado de criança): vai para o B78 e **não entra** no redesenho; os membros ficam com avatar de inicial e cor.
- **Ação rápida "Aplicar".** Registra a aplicação **com a data de hoje** (regra: aplicar exige data menor ou igual a hoje) e mostra um passo de confirmação com a data e a opção de trocá-la, antes de gravar. Proposta do plano; vale como aceita se o autor não pedir outra.
- **Fonte (resolvido em 16/11/2026: fica a Atkinson Hyperlegible atual).** Testei a variante "Atkinson Hyperlegible Next" (pacote `@expo-google-fonts/atkinson-hyperlegible-next` 0.4.1, MIT e OFL-1.1): ela **mantém o zero cortado**, e nenhuma das alternativas tipográficas do arquivo (`ss01` a `ss05`, `zero`, `salt`, `cv01`, `cv02`) dá um zero liso. O zero cortado é decisão de desenho da fonte, para não confundir 0 com O, o que ajuda quem tem baixa visão. Trocar de fonte não resolve e perderia essa vantagem; o pacote foi instalado só para o teste e **removido**. A atenção a datas continua: o zero cortado aparece nas datas e contagens, e a Documentação do Usuário pode explicar. (Texto original da proposta:  só entraria se a licença permitisse e o pacote do Expo a trouxesse.)
- **Conta.** Só entram os controles que já existem. Os interruptores de lembrete do protótipo são ilustrativos.

## Alternativas consideradas

- **Não mexer** (só corrigir pontos). Rejeitada: os problemas vêm da estrutura (hierarquia, botão flutuante, contornos), não de detalhes soltos.
- **Trocar a paleta.** Rejeitada: a marca e os contrastes já foram validados nos três temas; a mudança traria risco de acessibilidade sem ganho claro.
- **Reticências em tudo para manter os cartões do mesmo tamanho.** Rejeitada: esconde o nome da vacina e viola o texto a 200%; a regra acima separa o que nunca pode ser cortado.
- **Aplicar tela por tela, cada uma com seu estilo.** Rejeitada: gera inconsistência; os componentes base entram primeiro (PR 1 e 2) e as telas os consomem.

## Consequências

- São 9 PRs pequenos (0 a 9), na ordem: documentação, componentes base, navegação, Doses, Família e janelas, Histórico, Painel e Conta, Postos, Viagem e Novidades, Acesso, Movimento e instalável, e fechamento com acessibilidade e capturas.
- Os PRs 1 e 2 mudam várias telas de uma vez, porque mexem nos componentes base. Os testes (`CT-...`) acompanham cada PR.
- As capturas da Documentação do Usuário e da Técnica, e o roteiro da apresentação, precisam ser refeitos no PR 9. O Figma (versão 2) fica defasado; o protótipo no Claude é a referência até lá.
- `tokens.json` passa para a versão 3.0.0 no PR 1 (raios, sombras e durações); o PR 0 só documenta.
- O risco principal é regressão visual em um app com 42 arquivos de teste. Mitigação: `lint`, `typecheck`, Jest e os testes de ponta a ponta com a checagem de acessibilidade rodam em cada PR, nos três temas e a 200% de texto.

## Verificações e fontes

- Revisão visual do app em 16/11/2026: build web atual (`expo export`), API falsa dos testes de ponta a ponta, janela de 390 por 844 px, com movimento reduzido.
- WCAG 2.1: critérios 1.4.3 (contraste), 1.4.4 (redimensionar texto), 1.4.11 (contraste de não texto) e 2.5.5 (tamanho do alvo).
