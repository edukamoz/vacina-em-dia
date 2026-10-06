# ADR-011: Design system universal (celular e web), com três temas e fonte Atkinson Hyperlegible

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RNF04, RNF09, RNF06

## Contexto

O app é uma base de código única para Android, iOS e web (ADR-006) e atende pessoas idosas e com pouca familiaridade digital. Era preciso decidir como organizar os tokens visuais, os temas e a fonte para que o mesmo código funcione bem com toque e com mouse e teclado.

## Decisão

- **Tokens em um único arquivo** (`docs/04-design-system/tokens.json`), usado como fonte para o Figma e para o `tailwind.config` do NativeWind.
- **Três temas:** Claro, Escuro e Alto contraste, com a cor da marca em verde-saúde e os estados da dose sempre com cor, ícone e texto. O tema segue o sistema por padrão; o Alto contraste é escolha do usuário.
- **Fonte Atkinson Hyperlegible**, carregada com `expo-font`, com base de 18 dp e escala de texto do sistema até 200%.
- **Responsividade em três faixas** (compacto, médio e expandido), com o mesmo componente mudando de disposição, e foco por teclado e estados de mouse na web.
- **Alvos de toque** de 48 dp (56 dp nas ações principais) e **contraste** acima do mínimo AA em todos os textos.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Dois conjuntos de componentes (um para app e outro para web) | Duplica código e teste; contraria o RNF09. |
| Apenas tema claro e escuro | Não atende quem precisa de contraste máximo. |
| Fonte do sistema | Sem custo de carregamento, mas muda de aparência entre plataformas e não foi pensada para baixa visão. |
| Alvo de 44 dp (mínimo do WCAG AAA) | Pesquisas com pessoas idosas apontam alvos maiores. |

## Consequências

- Mais um tema para manter e testar (o de Alto contraste), com checklist de acessibilidade em toda tela.
- A fonte precisa ser carregada também na web; testar o carregamento e usar fonte reserva.
- O suporte à preferência de contraste do navegador varia; validar no SCRUM-23.
- Mudanças visuais passam por `tokens.json` e pelos contrastes: todo valor novo precisa ser conferido.

## Verificações e fontes

- Contrastes calculados pela fórmula do WCAG 2.1 em 06/10/2026 (resultados em `docs/04-design-system.md`).
- Pacote da fonte: `@expo-google-fonts/atkinson-hyperlegible` (MIT e OFL), versão 0.4.1 no npm em 06/10/2026.
- WCAG 2.1, critérios 1.4.3, 1.4.4, 1.4.11 e 2.5.5.
