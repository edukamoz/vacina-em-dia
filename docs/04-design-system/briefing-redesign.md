# Vacina em Dia: briefing para o redesenho visual (web e celular)

Documento para ser colado em um chat de design (que não vê este repositório). Objetivo: pedir **dois designs distintos**, um para **web em computador** e outro para o **aplicativo de celular**, bonitos, dinâmicos e com animações, mantendo a acessibilidade, que é requisito do projeto. O resultado esperado é um protótipo navegável em **HTML** (um arquivo por plataforma, ou um só com seletor), que depois será convertido em código React Native (Expo + NativeWind).

---

## 1. O produto em um parágrafo

**Vacina em Dia** é uma carteira de vacinação digital para famílias: a pessoa cadastra quem mora com ela (filhos, pais, avós), vê quais vacinas do **Calendário Nacional de Vacinação (Ministério da Saúde)** são indicadas para a idade de cada um, registra as doses (agendar, marcar como aplicada, cancelar), recebe lembretes (aviso no app e e-mail) e tira dúvidas com um **assistente** por voz ou texto. Funciona em Android, iOS e navegador. Projeto acadêmico (Fatec Votorantim), mas deve parecer um produto real, de saúde pública, confiável e acolhedor.

**ODS atendidos:** 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades).

## 2. Quem usa (as três personas)

| Persona | Perfil | O que precisa do design |
|---|---|---|
| **Mariana, 32** | Mãe de duas crianças, usa o celular o dia todo, tem pouco tempo | Ver de relance o que está atrasado e o que vem aí; registrar dose em poucos toques |
| **Sr. José, 68** | Idoso, pouca familiaridade digital, **usa a voz** | Texto grande, contraste alto, poucos elementos por tela, microfone bem visível |
| **Carla, 45** | Cuidadora de vários familiares | Alternar entre pessoas rápido, visão da família inteira, histórico |

## 3. Princípios inegociáveis (vêm do projeto, valem mais que a estética)

O design pode ser ousado, mas **não pode quebrar** nada abaixo. Se uma ideia visual conflitar, a regra vence.

1. **Nunca só pela cor.** Todo estado de dose tem cor **+ ícone + texto** ("Atrasada" com triângulo de alerta).
2. **Contraste:** texto normal ≥ 4,5:1; texto grande e componentes ≥ 3:1 (WCAG 2.1 AA). Atenção a gradientes, vidro fosco (blur) e texto sobre imagem: o contraste vale no pior ponto do fundo.
3. **Alvos de toque** ≥ 48 px (56 px nas ações principais), com 8 px de folga entre alvos.
4. **Texto ampliável até 200%** sem quebrar layout nem esconder conteúdo. Nada de texto abaixo de 16 px. Fonte: **Atkinson Hyperlegible** (livre, pensada para baixa visão); pesos 400 e 700.
5. **Três temas:** Claro, Escuro e **Alto contraste** (fundo branco, texto preto, bordas pretas de 3 px, **sem fundos tingidos, sem gradientes, sem transparência**). O design deve mostrar como cada tela fica nos três.
6. **Movimento com respeito:** animações de 120 a 400 ms, nenhuma essencial para entender a tela, e **tudo desligável** pela configuração "reduzir movimento" do sistema (no Alto contraste, sem animações decorativas). Nada piscando mais de 3 vezes por segundo. Nada que se mova sozinho em loop sem pausa.
7. **Voz nunca é o único caminho:** sempre há campo de texto equivalente.
8. **Linguagem simples**, português do Brasil, frases curtas, sem sigla, sem "por favor", sem exclamação. Botões começam com verbo ("Agendar", "Registrar aplicação").
9. **Honestidade:** toda tela com conteúdo vacinal mostra **fonte e versão** do calendário e o aviso "O aplicativo não substitui a caderneta de vacinação oficial nem a orientação de profissionais de saúde". O assistente **não dá orientação médica**.
10. **Sem dados pessoais reais nas telas de exemplo.** Use nomes e datas fictícios.

## 4. Identidade visual atual (ponto de partida; pode evoluir)

- **Cor da marca:** verde-saúde `#0B6B52` (verde-azulado). Fundo suave de marca `#E1F2EC` / `#F2F7F5`.
- **Logo:** escudo verde com um "check" branco dentro (símbolo), em versões horizontal e vertical, e variantes clara, escura, uma cor e alto contraste. Há ainda dois símbolos alternativos (calendário e letra V).
- **Os cinco estados da dose** (cores do tema Claro; estados sempre com ícone e texto):

| Estado | Rótulo | Cor / fundo suave | Ícone | Significado |
|---|---|---|---|---|
| `PENDING` | Pendente | `#44525F` / `#ECEFF3` | relógio | ainda sem data marcada |
| `SCHEDULED` | Agendada | `#0A5C9E` / `#E3EFF9` | calendário | marcada para uma data |
| `OVERDUE` | Atrasada | `#B3261E` / `#FCE8E6` | triângulo de alerta | prazo vencido |
| `APPLIED` | Aplicada | `#2F6A1D` / `#E4F2DC` | círculo com check | já tomada |
| `CANCELLED` | Cancelada | `#5B6670` / `#EEEEEE` | círculo com X | não é mais necessária |

- **Verde da marca ≠ verde de "Aplicada":** hoje ficam separados por matiz e função. Se mudar a paleta, manter essa separação (o verde da marca nunca representa sozinho um estado de dose).
- **Texto:** `#12201B` (principal), `#40524B` (secundário). **Borda:** `#6B7D75`.
- **Raios atuais:** campo 8, cartão 12, botão 14, selo totalmente arredondado. **Bordas atuais:** 2 px (padrão), faixa lateral de 6 px nos cartões de dose.
- **O que o autor acha do visual atual:** "muito engessado". Quer algo **bonito, dinâmico, com animações e estilização inovadora**. Liberdade para: nova paleta derivada do verde-saúde (com tons de apoio), formas mais orgânicas, cartões com profundidade, ilustração, gradientes sutis nos temas Claro e Escuro, microinterações e transições entre telas. A **marca (escudo com check) e o verde-saúde devem continuar reconhecíveis**.

## 5. Arquivos de arte já disponíveis (pasta `assets/`)

Já existem em SVG e devem ser usados (ou redesenhados em mesmo estilo, se o novo visual pedir):

- **Ícones de interface** (24×24, traço de 2 px, `currentColor`): adicionar, ajustes, buscar, editar, excluir, fechar, fonte (tamanho do texto), lembrete, local, sair, voltar, **voz (microfone)**, e de navegação: **nav-doses, nav-familia, nav-historico, nav-conta**.
- **Ícones dos estados:** estado-pendente, estado-agendada, estado-atrasada, estado-aplicada, estado-cancelada.
- **Ilustrações:** vazio (prancheta com "+"), carregando, erro-sem-conexao (círculo suave `#E1F2EC` com desenho em verde e cinza).
- **Logo:** símbolo e logo horizontal/vertical em claro, escuro, uma cor e alto contraste; alternativas (calendário, letra V).
- **App:** ícone do app (normal, arredondado, escuro), ícone adaptativo do Android (frente, fundo, monocromático) e favicon.

Se faltar arte (ilustrações de boas-vindas, vitórias como "tudo em dia", personagem, padrões de fundo), o design pode propô-las; devem seguir o mesmo traço (arredondado, 2 a 3 px, poucos detalhes) e ser exportáveis em SVG.

## 6. Estrutura de navegação

**Quatro áreas principais** (mais o assistente, que é transversal):

1. **Doses**: início do app; as vacinas da pessoa escolhida.
2. **Família**: lista de pessoas; escolher quem está sendo visto; adicionar/editar.
3. **Histórico**: doses já aplicadas e canceladas da **família inteira**.
4. **Conta**: dados, tema, lembretes por e-mail, privacidade, sair, excluir conta.
5. **Assistente**: abre por um **botão flutuante (balão)** no canto inferior direito de todas as abas.

Fora das abas: apresentação (primeiro contato), entrar, criar conta, esqueci a senha, redefinir senha, consentimento, termos de uso, política de privacidade, nova pessoa, editar pessoa, nova dose, detalhe da dose.

## 7. Telas e conteúdo (o que existe e o que cada uma mostra)

### 7.1 Apresentação (primeiro contato; só para quem não entrou)
- Cabeçalho com logo e botão "Entrar".
- Promessa principal ("As vacinas da sua família, em dia") + botão "Criar conta" + painel com **3 exemplos de doses** (Gripe, Atrasada, "Prevista para 20/09/2026"; Covid-19 reforço, Agendada, "15/10/2026"; Febre amarela, Aplicada, "12/04/2026").
- Três vantagens: **Fácil de ler** (texto grande, contraste alto), **Para toda a família** (um só lugar), **Com fonte oficial** (fonte e versão sempre visíveis).
- Faixa final convidando a criar conta; aviso de que não substitui a caderneta.
- *Oportunidade:* é a página mais livre para ousar (hero animado, rolagem com revelação, ilustração).

### 7.2 Entrar / Criar conta / Esqueci a senha / Redefinir senha
- E-mail, senha (com botão "Mostrar"), links entre as telas. Na criação: confirmação de senha e **caixa de aceite** dos Termos de uso e da Política de Privacidade (com links). Mensagens de erro em texto, ligadas ao campo.
- Web: duas colunas (lateral de marca + formulário). Celular: uma coluna.

### 7.3 Consentimento (primeiro acesso)
- Texto em linguagem simples sobre o uso de dados de saúde (LGPD), botão "Aceito". Coluna de leitura.

### 7.4 Doses (a tela principal)
- Título "Doses de {primeiro nome}" e link "Trocar pessoa"; ação principal **"Adicionar dose"**.
- **Cartão de lembretes** no topo: "Vencem em até 7 dias" / "Atrasadas", com contagem.
- Três grupos: **Precisam de atenção** (atrasadas), **Próximas** (agendadas, depois pendentes) e **Aplicadas** (até 5; "Ver todas no Histórico").
- **Cartão de dose:** nome da vacina, dica de data ("Prevista para…", "Agendada para…", "Aplicada em…"), selo de estado (ícone + texto + cor), origem (calendário oficial ou "adicionada por você"); o cartão inteiro abre o detalhe.
- Estado vazio ("Tudo em dia por aqui") **comemorativo**; carregando (esqueleto); erro (com "Tentar de novo").
- Rodapé: **aviso de fonte e versão** do calendário (marca "Calendário de exemplo" se for fictício).
- *Oportunidades:* indicador de progresso da pessoa ("12 de 15 vacinas em dia", anel de progresso), destaque visual para atrasadas sem alarmismo, animação ao marcar como aplicada, linha do tempo.

### 7.5 Detalhe da dose
- Nome da vacina, selo de estado, datas (prevista, agendada, aplicada), origem.
- Ações conforme o estado: **Agendar** (escolher data ≥ hoje), **Registrar aplicação** (data ≤ hoje), **Reagendar**, **Cancelar dose** (com caixa de confirmação: consequência em uma frase, botão perigoso e "Voltar" com o mesmo peso visual).
- Regra de negócio visível: dose "Atrasada" só pode ser reagendada, aplicada ou cancelada.
- Web: painel ao lado da lista.

### 7.6 Nova dose (avulsa)
- Para vacinas fora do calendário (ex.: pedida pelo médico). Escolher pessoa, nome da vacina, estado inicial e data.

### 7.7 Família
- Lista de pessoas em **cartões de membro** (apelido, idade, parentesco, "grupo específico" como gestante). Escolher a pessoa atual. "Adicionar pessoa".
- Cadastro/edição: apelido (**sem nome completo, sem CPF**), data de nascimento, parentesco, grupo específico opcional; excluir pessoa com confirmação.
- *Oportunidade:* avatares coloridos/ilustrados por pessoa, troca rápida (carrossel no topo no celular).

### 7.8 Histórico
- Doses aplicadas e canceladas da **família toda**, agrupadas por **ano**; cada item: vacina, pessoa, data, estado.
- Web: **tabela** (Vacina, Pessoa, Data, Estado). Celular: cartões.

### 7.9 Assistente (chat + voz)
- Conversa em balões: pergunta da pessoa e resposta do assistente **com fonte oficial citada**; sugestões de perguntas ("Para que serve a vacina BCG?").
- **Botão grande de voz** ("Perguntar por voz") com estados: pronto, **ouvindo** (animação), processando, erro; mostra o texto que entendeu e oferece "Digitar".
- Em pergunta de saúde (sintoma, reação, remédio) o assistente **não responde clinicamente**: orienta procurar um profissional ou ligar para o SAMU (192). Esse tipo de resposta tem visual próprio (aviso, não erro).
- Botão flutuante (balão) em todas as abas para abrir o assistente.
- *Oportunidades:* onda sonora animada durante a gravação, indicador "digitando", cartões de resposta com fonte.

### 7.10 Conta
- "Seus dados" (e-mail); **tema** (Seguir o aparelho, Claro, Escuro, Alto contraste) em botões de rádio; **tamanho do texto**; **lembretes por e-mail** (liga/desliga; 7 dias antes e no dia); links para Termos e Privacidade; **Sair**; **Excluir minha conta** (confirmação forte, ação perigosa).

### 7.11 Termos de uso e Política de privacidade
- Texto longo em coluna de leitura, com títulos de seção e índice; foco total em legibilidade.

## 8. Dois designs distintos

### 8.1 Web (computador, 1024 px ou mais; também deve funcionar em 600 a 1023 px)
- **Barra lateral fixa** (248 px, com logo e texto em cada item; no tablet, compacta de 96 px) com os 4 itens + assistente.
- Conteúdo com no máximo 960 px, **cartões em duas colunas**, **ação principal à direita do título**, painel de detalhe ao lado da lista.
- Interação por mouse e teclado: **estados de passar o mouse**, foco visível (anel de 3 px), atalhos, link "Pular para o conteúdo", tabela no histórico.
- Pode usar mais espaço: cabeçalho com saudação, resumo da família, gráficos simples (progresso), hero animado na apresentação, ilustrações grandes.
- Animações de web: entrada escalonada de cartões, transições suaves de página, hover com elevação, números que contam, scroll reveal na apresentação.

### 8.2 App de celular (menos de 600 px; Android e iOS)
- **Barra inferior** com 4 itens + botão flutuante do assistente (que **não** pode cobrir conteúdo nem a barra).
- Uma coluna, margem de 16 px, **gestos** (puxar para atualizar, deslizar no cartão para ações rápidas — sempre com alternativa em botão), folhas inferiores (bottom sheets) para agendar/confirmar, polegar-primeiro (ações principais na metade de baixo).
- Cabeçalho que encolhe na rolagem; troca de pessoa por carrossel de avatares no topo.
- Animações de celular: transições nativas entre telas, mola (spring) em botões, check animado ao registrar a aplicação, confete leve **opcional e desligável** ao zerar atrasadas, onda sonora na voz, háptica (vibração leve) na confirmação.
- Considerar área segura (notch, barra de gestos) e teclado aberto.

## 9. Entregáveis pedidos ao chat de design

1. **Direção visual** em poucas linhas: conceito, paleta (claro, escuro e alto contraste, com os valores e contrastes calculados), tipografia (manter Atkinson Hyperlegible; sugerir uso de pesos/tamanhos), formas, profundidade, tom das ilustrações.
2. **Design web** em HTML navegável, com as telas 7.1 a 7.10 (pelo menos: Apresentação, Entrar, Doses, Detalhe da dose, Família, Histórico, Assistente e Conta) e a troca entre os três temas.
3. **Design de celular** em HTML (moldura de 390×844), com as mesmas telas adaptadas e os gestos descritos.
4. **Componentes** isolados: cartão de dose (5 estados), selo, botão (principal, secundário, perigo; todos os estados), campo de texto, cartão de membro, balão do chat, botão de voz (todos os estados), caixa de confirmação, estados vazio/carregando/erro, navegação.
5. **Catálogo de animações:** nome, gatilho, duração, curva, e a versão com "reduzir movimento".
6. **Tokens em JSON** (cores por tema, espaçamento, raios, sombras, durações e curvas), com os nomes semânticos acima (`fundo`, `superficie`, `texto`, `textoSecundario`, `borda`, `primaria`, `sobrePrimaria`, `primariaSuave`, `pendente`/`agendada`/`atrasada`/`aplicada`/`cancelada` + `...Suave`, `foco`, `erro`, `erroSuave`).
7. **Nota de acessibilidade:** onde o novo visual se aproxima do limite de contraste, e como o Alto contraste se comporta.

## 10. Restrições técnicas (para o protótipo ser aproveitável)

- O código final é **React Native (Expo) + NativeWind (Tailwind) + Expo Router**, um só código para web e celular. Portanto o protótipo deve ser pensado em **componentes simples** (caixas, texto, imagens SVG), com CSS que tenha equivalente em React Native.
- **Evitar** o que não existe (ou é caro) em React Native: `backdrop-filter` complexo, `position: sticky` em tudo, CSS Grid avançado, `clip-path` complicado, fontes extras. Preferir: Flexbox, sombras simples, gradientes lineares, SVG, transformações e opacidade.
- Animações: preferir as que o **Reanimated** faz bem (opacidade, translação, escala, mola, entrada escalonada); evitar animar `width/height` de listas grandes.
- Ícones e ilustrações em **SVG**; sem fotos de pessoas reais.
- Peso: o app web é servido pelo Azure Static Web Apps; manter o protótipo leve.

## 11. Ideias de funcionalidades para parecer produto de verdade (a aprovar, **fora do escopo atual**)

Só entram com aprovação do autor; o design pode prever o espaço sem depender delas:

- **Progresso por pessoa** (anel "12 de 15 em dia") e **linha do tempo** da vida vacinal.
- **Conquistas leves** (por exemplo, "Tudo em dia") sem gamificação infantilizada.
- **Avatar** por pessoa (ilustração escolhida, sem foto).
- **Próxima dose** em destaque (cartão grande na Doses).
- **Onboarding** curto em 3 passos depois do primeiro cadastro.
- Versão completa do projeto (só se o cronograma permitir): **mapa de unidades de saúde**, **exportar carteira em PDF**, **compartilhar com cuidador**.

## 12. Fora do escopo (o design não deve sugerir)

Diagnóstico ou orientação médica individual; substituir a caderneta oficial; integração com sistemas oficiais; agendamento em unidades; IA generativa; uso offline completo; coleta de CPF ou Cartão Nacional de Saúde.

## 13. Dados fictícios sugeridos para as telas

- Família: **Ana** (mãe, 34), **Pedro** (filho, 3 anos), **Luísa** (filha, 8 meses), **Vovô José** (68).
- Vacinas: BCG, Hepatite B, Pentavalente, Poliomielite, Rotavírus, Pneumocócica, Meningocócica C, Febre amarela, Tríplice viral, Influenza (gripe), Covid-19 (reforço), dTpa (gestante).
- Fonte para o rodapé: "Calendário Nacional de Vacinação, Ministério da Saúde. Versão de exemplo." (marcar como exemplo).
- Endereço do app para o QR/URL de demonstração: `blue-rock-0d7abc710.4.azurestaticapps.net`.

## 14. Como devolver o resultado para o desenvolvimento

Exportar os HTML e salvar em `design/web/` e `design/mobile/` na raiz do repositório (ou me enviar), junto com o JSON de tokens. Com isso eu: (1) comparo com o código atual; (2) proponho um plano por etapas (tokens, componentes, telas, animações); (3) implemento um PR por etapa, mantendo os testes e a acessibilidade verificada nos três temas.
