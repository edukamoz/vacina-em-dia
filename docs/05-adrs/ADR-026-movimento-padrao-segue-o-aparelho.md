# ADR-026: Movimento padrão segue o aparelho

- **Status:** proposto em 24/10/2026 (aguarda a confirmação do autor; muda uma decisão anterior dele, ver Contexto)
- **Item do backlog:** a definir (levantamento do design system, item P3)
- **Relacionados:** ADR-011 (design system universal e acessível), `docs/04-design-system.md` §2.4, `docs/22-identidade-visual.md`, WCAG 2.1 critério 2.3.3 (animação a partir de interações) e 2.2.2.

## Contexto

A Conta tem três modos de movimento: **Animar sempre**, **Seguir o aparelho** e **Reduzir movimento**. Até aqui o padrão de quem nunca escolheu era **Animar sempre**, que ignora o pedido do sistema ("reduzir movimento" no Android, iOS, macOS e Windows). O motivo registrado em `docs/22` foi a apresentação: com a opção do sistema ligada (no Windows, "Mostrar animações" desligado), o app ficava parado e a demonstração não mostrava o desenho completo.

O problema é quem pediu menos movimento por necessidade: sensibilidade a movimento, distúrbios vestibulares, enxaqueca, dificuldade de atenção. Para essas pessoas o app animava por cima de um pedido explícito, e elas só percebiam a opção ao abrir a Conta. O público do projeto inclui idosos (persona PE2), entre quem esses casos são mais comuns. O CLAUDE.md pede acessibilidade "desde o início".

Na web, o app já lê o pedido do sistema (`AccessibilityInfo.isReduceMotionEnabled`, que o React Native Web liga a `prefers-reduced-motion`) e o aplica em `<html data-movimento>`; só o padrão ignorava a leitura.

## Decisão

1. **O padrão passa a ser "Seguir o aparelho"** (`MOVIMENTO_PADRAO = 'sistema'`). Quem não pediu menos movimento ao sistema continua vendo tudo animado; quem pediu, vê tudo parado.
2. **"Animar sempre" continua existindo** como escolha explícita na Conta. O atalho "Reduzir movimento" das telas de antes do login também continua.
3. **Quem já escolheu mantém a escolha.** A preferência é guardada no aparelho; nada é migrado. Quem tinha "Animar sempre" guardado continua com ele.
4. O tema **Alto contraste** continua sempre parado, qualquer que seja o modo.

## Alternativas descartadas

- **Manter "Animar sempre" como padrão:** ignora um pedido explícito do sistema; contraria o WCAG 2.3.3 e o princípio de acessibilidade como regra, não como acabamento.
- **Remover "Animar sempre":** tira da pessoa uma escolha legítima (por exemplo, quem desligou animações do sistema por desempenho e ainda quer ver o app animado).
- **Perguntar no primeiro acesso:** acrescenta um passo antes do uso, para uma preferência que o sistema já informa.

## Consequências

- **Demonstração (19/11):** num computador com as animações do sistema desligadas, o app abre parado. Antes da apresentação, escolher **Animar sempre** na Conta (ou ligar as animações do sistema). Vale entrar no roteiro de demonstração (`docs/20`).
- **Sem escolha migrada:** uma pessoa que só mudou o tamanho do texto antes desta mudança tem "Animar sempre" guardado (a escolha de movimento era gravada junto) e não verá a mudança até trocar o modo.
- **Verificação em aparelho:** o efeito em iOS e Android reais depende do ajuste do sistema; só o autor pode confirmar em aparelho físico.
