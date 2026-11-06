# Vacina em Dia: roteiro de testes manuais de acessibilidade

Estado em 24/10/2026. Complementa o teste automatizado (axe-core, `ponta-a-ponta-e-acessibilidade.md`), que cobre só o que uma máquina enxerga. Aqui ficam as sessões que dependem de uma pessoa, de um aparelho ou de um leitor de tela. Cumpre o último item do checklist da seção 5 de `docs/04-design-system.md` (RNF04).

> **Atenção:** este documento é um **roteiro**. **Nenhuma sessão foi executada.** As colunas de resultado estão vazias de propósito; quem testa e anota é o autor (CLAUDE.md §13: nada de resultado inventado). Registre data, aparelho, versão do app e do leitor de tela em cada sessão.

## 1 Como usar

1. Escolha uma sessão, reserve o tempo indicado e registre o ambiente na tabela de cabeçalho.
2. Percorra o **fluxo base** (seção 2) com a técnica da sessão. Marque cada passo como OK, Falha ou N/A.
3. Todo achado vira item do backlog (tipo Bug), com a tela, o passo e o que você esperava. Depois de corrigido, ganha um teste automatizado quando for possível (plano de teste §4.4).
4. Refaça a sessão depois de mudanças grandes de interface (plano de teste §4.5).

## 2 Fluxo base

Todas as sessões percorrem os mesmos passos, para os resultados serem comparáveis:

| Passo | Tela | Ação |
|---|---|---|
| F1 | Apresentação e Criar conta | Chegar ao cadastro e criar uma conta de teste |
| F2 | Consentimento | Ler e aceitar o termo |
| F3 | Família | Adicionar uma pessoa |
| F4 | Doses | Abrir uma dose, agendar, registrar a aplicação |
| F5 | Assistente | Fazer uma pergunta por texto |
| F6 | Painel de gráficos | Abrir e ler os números |
| F7 | Conta | Trocar tema, tamanho do texto e movimento; sair |

## 3 Sessões

### S1 Só teclado (web, computador)

- **Tempo:** 30 minutos. **Ambiente:** Chrome, Edge e Firefox atuais; sem mouse.
- **Técnica:** Tab, Shift+Tab, Enter, Espaço, setas e Esc em todo o fluxo.
- **O que observar:**
  - O primeiro Tab mostra o link "Pular para o conteúdo" e o Enter leva ao conteúdo da tela.
  - Todo elemento interativo mostra o anel de foco, inclusive o botão principal sobre o verde.
  - A ordem do foco segue a ordem visual; nada fica preso (janelas fecham com Esc e devolvem o foco).
  - Botões desativados e "carregando" não recebem o toque, mas o foco passa por eles de modo previsível.
- **Resultado:**

| Passo | Navegador | OK / Falha | Observação |
|---|---|---|---|
| F1 a F7 | | | |

### S2 Leitor de tela na web

- **Tempo:** 45 minutos. **Ambiente:** NVDA (gratuito) com Firefox ou Chrome no Windows; opcionalmente VoiceOver no Safari.
- **Técnica:** navegar por títulos (H), por botões (B), por campos (F) e por regiões; ouvir cada tela do início ao fim.
- **O que observar:**
  - Cada tela tem um título (nível 1) e o nome da tela é anunciado ao abrir.
  - Botões e campos têm nome, papel e estado ("desativado", "ocupado", "selecionado").
  - Erros de formulário são anunciados e ligados ao campo.
  - Os gráficos têm descrição em texto com os mesmos números da tela.
  - Os selos de estado da dose dizem o estado ("Dose atrasada").
  - As janelas (adicionar dose, detalhe) anunciam o título e prendem o foco.
- **Resultado:**

| Passo | Leitor | OK / Falha | O que foi dito | Observação |
|---|---|---|---|---|
| F1 a F7 | | | | |

### S3 TalkBack (Android, aparelho físico)

- **Tempo:** 45 minutos. **Ambiente:** celular Android real, app instalado (APK da pré-release `apk-latest`).
- **Técnica:** deslizar para a direita e para a esquerda, toque duplo para ativar, menu de ações do TalkBack.
- **O que observar:** os mesmos pontos da S2, mais o tamanho dos alvos de toque (48 dp), a barra inferior acima da barra do sistema, a leitura do mapa de postos (lista como alternativa) e a gravação de voz com permissão negada.
- **Resultado:**

| Passo | Aparelho e Android | OK / Falha | Observação |
|---|---|---|---|
| F1 a F7 | | | |

### S4 VoiceOver (iOS, aparelho físico)

- **Tempo:** 45 minutos. **Ambiente:** iPhone real (nada do projeto foi testado em iOS até aqui).
- **Técnica:** rotor, deslizar, toque duplo.
- **O que observar:** os mesmos pontos da S3 e o comportamento da barra de abas e das janelas em folha.
- **Resultado:**

| Passo | Aparelho e iOS | OK / Falha | Observação |
|---|---|---|---|
| F1 a F7 | | | |

### S5 Texto grande (200%)

- **Tempo:** 30 minutos.
- **Técnica:** (a) na web, zoom do navegador a 200% (Ctrl e +) e depois só o texto a 200% nas configurações do navegador; (b) no celular, tamanho da fonte do sistema no máximo mais "Maior" em Conta, Tamanho do texto.
- **O que observar:** sem rolagem horizontal, sem texto cortado ou sobreposto, botões e rótulos ainda legíveis, datas que quebram em duas linhas sem perder informação, cartões de dose com títulos longos.
- **Resultado:**

| Passo | Ambiente | OK / Falha | Observação |
|---|---|---|---|
| F1 a F7 | | | |

### S6 Contraste: Alto contraste, contraste do sistema e Escuro

- **Tempo:** 30 minutos.
- **Técnica:** (a) escolher cada tema na Conta; (b) ligar "Aumentar contraste" no sistema (iOS), "Texto de alto contraste" (Android) ou o modo de contraste do Windows e abrir o app com "Seguir o aparelho"; (c) em locais com muita luz, usar o app ao ar livre.
- **O que observar:** o app abre em Alto contraste quando o sistema pede; nada fica ilegível em cores forçadas (gradientes, cartões, logo); os selos e os gráficos continuam compreensíveis.
- **Resultado:**

| Tema ou ajuste | Ambiente | OK / Falha | Observação |
|---|---|---|---|
| Claro | | | |
| Escuro | | | |
| Alto contraste (escolha) | | | |
| Contraste do sistema (iOS, Android, Windows) | | | |

### S7 Movimento

- **Tempo:** 20 minutos.
- **Técnica:** com "Mostrar animações" desligado no Windows (ou "Remover animações" no Android e "Reduzir movimento" no iOS), abrir o app sem escolha guardada; depois testar "Animar sempre" e "Reduzir movimento" na Conta.
- **O que observar:** sem escolha guardada, o app abre parado quando o sistema pede; "Animar sempre" anima mesmo assim; nada essencial depende de animação. **Antes da apresentação de 19/11**, confirmar o modo escolhido no computador de demonstração (ADR-026).
- **Resultado:**

| Ajuste do sistema | Modo na Conta | OK / Falha | Observação |
|---|---|---|---|
| Animações ligadas | Seguir o aparelho | | |
| Animações desligadas | Seguir o aparelho | | |
| Animações desligadas | Animar sempre | | |

### S8 Cores e daltonismo

- **Tempo:** 20 minutos.
- **Técnica:** simulador de daltonismo do Chrome (DevTools, Rendering, Emulate vision deficiencies) e tons de cinza do sistema.
- **O que observar:** os cinco estados da dose continuam distinguíveis pelo ícone e pelo texto; os gráficos do painel se distinguem pela textura (lisa, listras, pontos e grade); o botão de perigo e o de erro não dependem só do vermelho.
- **Resultado:**

| Simulação | OK / Falha | Observação |
|---|---|---|
| Protanopia | | |
| Deuteranopia | | |
| Tritanopia | | |
| Tons de cinza | | |

## 4 Critérios de saída

A acessibilidade é considerada verificada para a entrega quando:

- Todas as sessões foram executadas ao menos uma vez e registradas (S3 e S4 dependem de aparelho físico; se algum não estiver disponível, escrever isso em "Limites" abaixo).
- Nenhuma falha de gravidade crítica ou alta continua aberta.
- O checklist da seção 5 de `docs/04-design-system.md` foi marcado com data e referência a esta execução.

## 5 Limites

- O roteiro cobre as telas do fluxo base. Telas fora dele (Termos, Privacidade, Postos de saúde, Apoie o projeto, Ler caderneta por foto) entram numa segunda passada.
- A leitura do mapa em leitor de tela depende do componente de mapa de cada plataforma; a lista de postos é a alternativa acessível.
- O resultado vale para a versão do app e do sistema anotados; mudança de interface pede nova rodada.
