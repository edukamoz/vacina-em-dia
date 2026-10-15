# Plugins do Figma: design system e telas da versão 2

O Figma do projeto ([Vacina-em-dia](https://www.figma.com/design/lZboLAlTDtA2cJQRyKtcdW/Vacina-em-dia)) foi atualizado para a versão 2 do design system (`tokens.json` 2.0.0) em duas etapas, com dois plugins locais. Eles existem porque o Figma MCP, no plano Starter com assento View, permite só 20 chamadas por mês; plugins locais não têm esse limite.

## Estado em 15/10/2026

- **Etapa 1, tokens: feita** (pelo Figma MCP, com o mesmo código de `code.js`). Foram criadas 15 variáveis de cor em cada tema (a versão anterior deste arquivo dizia 14; o Figma contou 15), 4 medidas (`raio/quadro`, `raio/folha`, `borda/fina`, `toque/folga`), 2 estilos de texto (Exibição e Destaque) e as 6 sombras (`Sombra/1`, `2` e `3` em Claro e Escuro, com as camadas de `tokens.json`). Os 21 valores antigos de cada tema foram corrigidos.
- **Etapa 2, telas: pendente**, por falta de chamadas do MCP. O plugin `telas.js` constrói as telas; **ainda não foi executado no Figma** (foi testado só contra um Figma simulado).
- Os componentes e as 4 telas antigas (página "Telas: celular") continuam na versão 1. Depois de rodar o plugin de telas e conferir, apague as telas antigas à mão.

## Plugin 1: sincronizar design system (`manifest.json`, `code.js`)

Cria e atualiza variáveis de cor (3 temas), medidas, estilos de texto e sombras. Pode repetir sem risco: só cria o que falta e corrige os valores. Já foi aplicado em 15/10/2026; rode de novo se `tokens.json` mudar (antes, `python docs/04-design-system/figma-plugin/gerar.py` regenera o `code.js`).

Correção de 15/10/2026: o gerador não reconhecia sombras escritas como `0 1px 2px rgba(...)` (o `0` sem `px`) e gerava estilos de sombra vazios; agora reconhece e falha se não entender uma sombra.

## Plugin 2: construir telas v2 (`manifest-telas.json`, `telas.js`)

Monta, com auto layout e ligadas às variáveis e aos estilos do arquivo (trocar de tema é só trocar a coleção de cor):

- **Página "Telas: celular" (390 x 844):** Entrar, Doses, Família, Histórico, Conta, Detalhe da dose e Assistente (tema Claro), mais Doses nos temas Escuro e Alto contraste.
- **Página "Telas: tablet e web" (1280 x 800):** Doses com menu lateral, nos temas Claro e Escuro.

Não apaga nada: se uma tela com o mesmo nome já existe, ela é pulada; se uma tela falha, as outras continuam e o aviso final lista o erro. Como o desenho copia o que o app faz hoje (cores, medidas, ícones e textos da tela de exemplo), mudanças no app exigem ajustar o `telas.js`.

### Como rodar (uma vez, no app de computador do Figma)

1. Abra o arquivo Vacina-em-dia no **aplicativo de computador** do Figma (plugins locais não rodam no navegador). A fonte **Atkinson Hyperlegible** precisa estar instalada.
2. **Plugins > Development > Import plugin from manifest...** e escolha `docs/04-design-system/figma-plugin/manifest-telas.json`.
3. **Plugins > Development > Vacina em Dia: construir telas v2**.
4. A mensagem final diz quantas telas foram criadas, quantas foram puladas e os erros, se houver. Se houver erro, copie a mensagem para o Claude corrigir.

## Limites conhecidos

- O desenho não usa componentes do Figma: as telas são montadas por funções (selo, botão, cartão de dose etc.), o que permite trocar de tema, mas elas não são instâncias dos componentes da página "Fundamentos e componentes", que seguem na versão 1. Reconstruir a biblioteca de componentes v2 é a próxima etapa.
- Faltam no Figma: Postos (mapa), Apresentação (com as fotos de pessoas fictícias), Criar conta, Esqueci a senha e o tema Alto contraste na versão web.
- Para continuar pelo MCP (com verificação por captura de tela), o plano Education do Figma libera 200 chamadas por dia.
