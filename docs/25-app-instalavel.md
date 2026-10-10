# Vacina em Dia: app instalável (PWA)

> Item do backlog: B51. Atualizado em 10/10/2026.

A versão web do Vacina em Dia pode ser **instalada** no computador e no celular, sem loja de aplicativos: ela ganha ícone próprio, abre em janela própria (sem barra de endereço) e tem atalhos. O celular continua tendo o aplicativo nativo (Expo); isto é só o jeito de levar a versão web para a tela inicial.

## Como instalar

| Onde | Passo |
|---|---|
| **Chrome ou Edge no computador** | Abrir o endereço do app e clicar no ícone de instalar, no fim da barra de endereço (ou menu > "Instalar Vacina em Dia") |
| **Chrome no Android** | Menu (três pontos) > "Instalar app" ou "Adicionar à tela inicial" |
| **Safari no iPhone ou iPad** | Botão de compartilhar > "Adicionar à Tela de Início" |

Depois de instalado, o toque longo (ou clique com o botão direito) no ícone mostra os atalhos **Doses**, **Postos de saúde** e **Histórico**.

## O que foi feito

- `apps/mobile/public/manifest.webmanifest`: nome, nome curto, descrição, idioma `pt-BR`, `display: standalone`, cores da marca (`#0B6B52`), categorias de saúde, quatro ícones (192 e 512 px, comuns e "mascaráveis" para o Android) e três atalhos.
- `apps/mobile/public/index.html`: página-modelo que liga o manifesto, o ícone do iOS (`apple-touch-icon`) e o modo de aplicativo do iOS. A língua da página passou de `en` para `pt-BR`, o que também ajuda leitores de tela.
- `apps/mobile/app.json` (`web`): idioma, descrição e cor do tema, que o Expo coloca nas etiquetas `<meta>`.
- `apps/mobile/public/staticwebapp.config.json`: o manifesto e os ícones não passam pelo redirecionamento para `index.html`, e `.webmanifest` tem o tipo certo (`application/manifest+json`). No Docker, o nginx já serve o tipo certo.
- Ícones em `apps/mobile/public/icons/`, gerados a partir de `assets/images/icon.png` e do primeiro plano do ícone adaptativo.

Conferido com o Chrome (protocolo de depuração `Page.getInstallabilityErrors`): **nenhum erro de instalação**; o manifesto foi lido sem avisos. Testes automáticos: `CT-PWA-01` a `CT-PWA-05` (`apps/mobile/src/pwa.test.ts`).

## O que não faz (de propósito)

- **Não há service worker, então não há uso offline.** O app continua precisando de internet, como o escopo do projeto prevê (uso offline completo está fora do escopo). Só o mapa de postos guarda a última lista para consulta sem internet.
- Sem notificações do navegador. O lembrete continua sendo por e-mail e pela lista na tela inicial.
- Instalar não muda dados nem permissões: o login, o consentimento e a política de privacidade valem como no navegador.

## Como conferir à mão

1. Abrir o app publicado no Chrome e instalar.
2. Conferir o ícone, o nome e a janela sem barra de endereço.
3. No DevTools do Chrome, aba **Application > Manifest**: sem avisos e com os quatro ícones.
