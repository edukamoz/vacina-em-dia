# Plugins do Figma: design system e telas da versão 2

O Figma do projeto ([Vacina-em-dia](https://www.figma.com/design/lZboLAlTDtA2cJQRyKtcdW/Vacina-em-dia)) foi atualizado para a versão 2 do design system (`tokens.json` 2.0.0) em duas etapas, com dois plugins locais. Eles existem porque o Figma MCP, no plano Starter com assento View, permite só 20 chamadas por mês; plugins locais não têm esse limite.

## Estado em 20/10/2026

- **Etapa 1, tokens: feita** em 15/10/2026 (pelo Figma MCP, com o mesmo código de `code.js`): 36 variáveis de cor por tema (Claro, Escuro e Alto contraste), 21 medidas, 10 estilos de texto e 6 sombras.
- **Etapa 2, telas: feita** em 20/10/2026, também pelo Figma MCP, rodando o código de `telas.js` (adaptado: sem `closePlugin`) e mais três scripts para as telas que o plugin não tinha. Como o plano permitiu, o plugin local deixou de ser necessário; ele continua aqui para refazer as telas por conta própria.
  - **Página "Telas: celular":** as 9 do plugin (Entrar, Doses em três temas, Família, Histórico, Conta, Detalhe da dose, Assistente) e 9 novas: Apresentação, Criar conta, Esqueci a senha, Postos de saúde, Conta completa, e as janelas Adicionar dose, Adicionar pessoa, Apoie o projeto (QR de exemplo, com chave fictícia) e Ler caderneta por foto.
  - **Página "Telas: tablet e web":** Doses (Claro, Escuro e Alto contraste), Conta com cartões de mesma altura, a janela Adicionar dose e a Apresentação em web grande e web pequena.
- As 4 telas antigas (versão 1) foram **renomeadas** com o prefixo "v1 ·", sem apagar. Depois de conferir as novas, apague-as à mão.
- **Componentes v2:** seção "Componentes v2 (tema Claro)" da página "Fundamentos e componentes", com Botão, Campo de texto, Selo de estado, Cartão de dose, Item de navegação, Cartão de membro, Opção, Interruptor, Avatar, Botão de voz, Cartão de seção, Aviso de fonte e versão, Estado vazio, Estado de erro, Estado carregando e Mensagem do chat; os componentes da versão 1 também ganharam o prefixo "v1 ·".
- **Telas finais do celular:** além das listadas acima, Consentimento, Redefinir senha, Termos de uso, Política de privacidade e a Apresentação em Escuro e Alto contraste.

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

- O desenho não usa componentes do Figma: as telas são montadas por funções (selo, botão, cartão de dose etc.), o que permite trocar de tema, mas elas não são instâncias dos componentes da página "Fundamentos e componentes", que seguem na versão 1. Em 20/10/2026 foi criada uma biblioteca v2 (16 componentes com variantes, tema Claro) na página de componentes; ligar as telas a ela é uma próxima etapa.
- O Figma MCP não importa imagens: a Apresentação usa avatares coloridos no lugar das fotos das pessoas fictícias (as fotos existem no app).
- O QR da janela "Apoie o projeto" é um exemplo gerado com uma chave Pix fictícia; não use no app.
- Faltam: a Apresentação web em Escuro e Alto contraste; as capturas das Apresentações em Escuro e Alto contraste do celular não foram conferidas (o limite do MCP acabou).
- Os scripts das telas novas foram executados pelo Figma MCP e não estão salvos neste repositório; o arquivo do Figma é o registro. Se o app mudar, ajuste as telas no Figma ou refaça-as.
- Para continuar pelo MCP (com verificação por captura de tela), o plano Education do Figma libera 200 chamadas por dia; a conta gratuita tem créditos limitados, então agrupe várias telas por chamada, como foi feito aqui (4 chamadas de escrita e 2 de ajuste para 25 telas).
