# Plugin: sincronizar o design system com o Figma

O Figma do projeto ([Vacina-em-dia](https://www.figma.com/design/lZboLAlTDtA2cJQRyKtcdW/Vacina-em-dia)) está na versão 1 do design system. Este plugin local o atualiza para a versão atual de `tokens.json` (2.0.0), sem depender do limite de chamadas do Figma MCP no plano Starter.

## O que ele faz

- **Cores:** atualiza as 21 variáveis de cada tema (`fundo` e `superficie` mudaram na versão 2) e cria as 14 novas (`fundo-profundo`, `superficie-suave`, `borda-suave`, `primaria-profunda`, `decor-menta`, `decor-sol`, `avatar-a` a `avatar-d`, `sobre-avatar` e as quatro `marca-*`), nas coleções **Cor (Claro)**, **Cor (Escuro)** e **Cor (Alto contraste)**.
- **Medidas:** corrige os raios (campo 12, botão 16, cartão 20) e cria `raio/quadro` (18), `raio/folha` (28), `borda/fina` (1) e `toque/folga` (8).
- **Texto:** atualiza os 8 estilos e cria **Titulo/Exibicao** (56/60) e **Texto/Destaque** (22/30).
- **Sombras:** cria os estilos `Sombra/1`, `2` e `3` nos temas Claro e Escuro (no Alto contraste não há sombra).

Não mexe em páginas, componentes nem telas: as telas e os componentes do Figma continuam como estavam (versão 1) e ficam para uma segunda etapa.

## Como rodar (uma vez, no app de computador do Figma)

1. Abra o arquivo Vacina-em-dia no **aplicativo de computador** do Figma (plugins locais não rodam no navegador).
2. Menu **Plugins > Development > Import plugin from manifest...** e escolha `docs/04-design-system/figma-plugin/manifest.json`.
3. Menu **Plugins > Development > Vacina em Dia: sincronizar design system**.
4. Ao terminar, uma mensagem mostra quantas variáveis foram criadas e atualizadas.

A fonte **Atkinson Hyperlegible** precisa estar instalada no computador (os estilos de texto atuais já a usam).

## Quando os tokens mudarem

Rode `python docs/04-design-system/figma-plugin/gerar.py` para regenerar `code.js` e rode o plugin de novo. É seguro repetir: ele só cria o que falta e corrige os valores.
