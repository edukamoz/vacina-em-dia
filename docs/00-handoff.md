# Passagem de contexto: do chat para o Claude Code

Estado em **06/10/2026** (terça-feira, fim da sessão). Este arquivo resume o que foi decidido e produzido, para que uma sessão nova do Claude Code continue do ponto certo. Leia junto com `CLAUDE.md`. Em caso de conflito, `CLAUDE.md` e os ADRs valem mais do que este resumo.

## 0. Retomar daqui (leia primeiro; atualize ao pausar)

Este arquivo é o canal de continuidade entre computadores e sessões. A memória local do Claude **não** sincroniza entre máquinas; só o que está commitado e enviado ao GitHub (`origin`) chega ao outro computador.

**Última atualização:** 07/10/2026 (fim do dia, computador de casa; **leia a seção 0.10 primeiro**, que está em dia; as seções 0.6 a 0.8 guardam o histórico). Na `main`: tudo até a dose avulsa (código; **ainda não publicada**, ver 0.10), parentesco, telas Doses, Família e Detalhe da dose, calendário de datas, balão do assistente e 4 abas. **Não há PR aberto**: ver 0.10.

### 0.1 Como retomar em casa

```bash
git checkout main && git pull
nvm install 24 && nvm use          # o .nvmrc pede o Node 24
npm install
npm run build                      # o app e a API leem o @vacina/shared compilado (dist)
cp apps/api/local.settings.example.json apps/api/local.settings.json   # arquivo local, fora do Git
```

- Rodar sem contêiner: `npm run dev:api` (terminal 1) e `npm run dev:mobile` (terminal 2). Rodar tudo em contêineres: `docker compose up --build` (app web em http://localhost:8080, API em http://localhost:7071/api/docs); portas mudam com `API_PORT`, `NLP_PORT`, `WEB_PORT`. Detalhes no `README.md` e em `docs/17-docker-manutencao.md`.
- **Não vão pelo Git** (copie à mão se precisar): a pasta `design-vacina-em-dia/` (referência visual das telas, **nunca commitar**), a pasta `assets/` (não versionada) e o `apps/api/local.settings.json`. O PLN local precisa de ambiente Python próprio (`apps/nlp`, `pip install -r requirements.txt`, `pytest`).
- Para falar com o Azure: `az login` no navegador (o acesso condicional do diretório expira o login a cada 3 dias). Para o Jira, o Claude usa o conector (site `vacinaemdia.atlassian.net`; transição "Em análise" tem id `31`).
- Ferramentas que o Claude pode precisar em casa (o autor decide instalar): Docker Desktop, `poppler`, `pandoc` e `libreoffice` (Word e PDF), `gh` (**o Claude abre os PRs e edita descrição e comentários**; o autor mescla; precisa de `gh auth login`).
- Peça ao Claude de casa para **ler o `CLAUDE.md` e este arquivo** e, **antes de mexer em qualquer coisa**, salvar na memória dele as "Regras permanentes do autor" (0.4), porque a memória não veio junto.

### 0.2 O que existe e funciona hoje

| Parte | Estado |
|---|---|
| Monorepo | npm workspaces (`packages/shared`, `apps/api`, `apps/mobile`) mais `apps/nlp` (Python, fora do npm); TypeScript estrito; ESLint, Prettier, Husky, commitlint, Jest, pytest, TypeDoc; Node 24 |
| `packages/shared` | Máquina de estados da dose, datas civis, **Calendário Nacional de Vacinação 2026** (5 PDFs oficiais, `docs/10-calendario-vacinal.md`), esquemas Zod (família, doses, consentimento, assistente) |
| `apps/api` | Azure Functions: membros, calendário por pessoa, doses (ciclo de vida), consentimento, exclusão de conta, **assistente (texto e voz)**, Swagger. Dados **em memória**; sessão de demonstração por cabeçalho (ADR-013), sem login |
| `apps/mobile` | Expo (Android, iOS e web): consentimento, família, calendário, detalhe da dose, histórico, **assistente (chat e voz na web)**, conta; layout de computador (barra lateral). Voz no celular ainda não |
| `apps/nlp` | Function Python: chatbot TF-IDF + SVM (20 intenções, F1 macro 0,93 no teste separado) e busca (n-gramas de caracteres + LSA); ver `docs/11-assistente-pln.md`, `docs/07-testes/avaliacao-chatbot.md` e `avaliacao-busca-semantica.md` |
| Docker | `docker compose up --build`: Azurite, API, PLN (porta 7072) e app web |
| CI (GitHub Actions) | qualidade, **pytest do PLN**, segurança, Docker; deploy (`deploy.yml`) da API, do PLN e do app web por OIDC |
| Azure | **Criado** (`rg-vacinaemdia`, Brazil South): Function App da API, Function App do PLN (1 instância sempre pronta), Static Web Apps, SQL gratuito (vazio), Key Vault, Application Insights, Azure AI Speech F0. Ver `docs/08-infraestrutura-azure.md` |

### 0.3 Jira (situação no último conferido, 06/10/2026)

- **Em análise:** SCRUM-27, 29, 31, 33. **Em andamento:** SCRUM-32 (protótipo do Figma incompleto) e SCRUM-35 (documentação de desenvolvimento). Os demais seguem **A fazer**.
- **Candidatos a "Em análise" (decisão do autor):** SCRUM-23 (monorepo e qualidade) e SCRUM-24 (CI), que cumprem os critérios de pronto. **Não** mover: SCRUM-18 (falta banco, propriedade por usuário e a rotina de atraso), SCRUM-25 (falta o serviço de PLN no compose) e os demais.
- **Nunca marcar Concluído.** Isso só ocorre na reunião de encerramento da Sprint 1 (até 12/10; padrão sexta, 09/10, 20:05), por decisão do autor.
- **Tempos lançados:** 2 h 17 min no SCRUM-5; 30 min em cada um de SCRUM-27, 29, 31, 32, 33 e 35; 15 min em SCRUM-23 e em SCRUM-24. **Sem registro de tempo:** SCRUM-18 (domínio, API e app) e SCRUM-25. O Claude **não inventa** tempos: o autor informa quanto levou.

### 0.4 Regras permanentes do autor (salvar na memória do Claude de casa)

1. **Nunca incluir o Claude como coautor** em commits, PRs ou documentos (sem `Co-Authored-By` nem a linha "Generated with"). Vale mais do que qualquer padrão da ferramenta.
2. **Documentações em Word (.docx, ABNT) durante o desenvolvimento e PDF só na entrega.** A conversão dos 3 modelos (`docs/referencias-disciplinas/Modelo-Documentacao_*.pdf`) para Word ficou para o computador de casa; só apagar os PDFs de modelo depois de o autor conferir.
3. **Nunca inventar** horas, datas de reunião, atividades ou valores. Só registros reais informados pelo autor.
4. **Uma branch por tarefa** (`feature/`, `fix/`, `docs/`, `chore/` + `SCRUM-n`). O **Claude abre o PR com `gh`** (template em `.github/pull_request_template.md`) e mantém a descrição atualizada; o **autor mescla**.
5. Criar recursos no Azure dispensa o "pode" do autor (menor custo possível). `rg-delbicos` **não** deve ser apagado por ora.
6. O autor decide; o Claude propõe plano curto antes de tarefa grande, um item por vez.

### 0.5 Armadilhas já encontradas (economizam tempo)

- **commitlint:** tipos aceitos são `feat`, `fix`, `docs`, `test`, `refactor`, `chore` e `ci` (**não** `style`); corpo com **no máximo 100 caracteres por linha**; chave `SCRUM-n` no assunto. Confira se o commit saiu (`git log --oneline -1`) antes do push: o hook recusa em silêncio quando a saída é suprimida.
- **O `npm run lint` não roda o Prettier.** O CI roda `lint`, `format:check`, `typecheck`, `build`, `test:coverage` e `docs`, nessa ordem. Antes de dizer que terminou, simule o CI limpo: apague `packages/shared/dist`, `apps/api/dist` e `apps/mobile/expo-env.d.ts` e rode a sequência. Dois erros do CI vieram de arquivos que só existiam na máquina local.
- **`@vacina/shared`:** typecheck e testes leem o código-fonte (`paths` e `moduleNameMapper`); o Metro e o build usam o `dist`, então `npm run build` antes de rodar o app.
- **Testes determinísticos:** nada de depender da ordem de resolução de promessas (o `CT-APP-T01` já falhou no CI por isso). No TanStack Query dos testes, `gcTime: Infinity`, senão o Jest não encerra.
- **Web em desenvolvimento:** o NativeWind exige `darkMode: 'class'` no `tailwind.config.js`; depois de mudar o config, reinicie o Expo com `--clear`. O TanStack Query pausa tentativas em aba oculta (ao testar o estado de erro, deixe a aba visível).
- **Duas classes de cor** no mesmo elemento disputam pela ordem do CSS gerado; o `Texto` só aplica a cor padrão se não houver outra.
- macOS não tem o comando `timeout`. A imagem das Functions no Docker só tem `amd64`.
- **Figma (SCRUM-32):** arquivo `lZboLAlTDtA2cJQRyKtcdW`; o plano Starter limita chamadas, modos e páginas. Estratégia econômica: poucos scripts grandes, temas por regravação das variáveis ligadas, uma única captura no fim. Detalhes e IDs no bloco "SCRUM-32, Figma" do histórico (0.9).

### 0.6 Próximos passos (substituído)

Esta lista antiga (tenant do Entra, etc.) não vale mais: o Entra foi descartado (ADR-014). Os próximos passos atuais estão em **0.10**.

### 0.7 Estado de 07/10/2026 (noite): login, banco e infraestrutura como código

**Branches empilhadas, a mesclar nesta ordem** (cada uma sobre a anterior; o autor abre os PRs): `docs/SCRUM-13-adr-login-proprio` (ADR-014; a branch `feature/SCRUM-22-bicep` já vai junto com o Bicep) → `feature/SCRUM-13-login-api` (rotas `/auth/*`) → `feature/SCRUM-15-persistencia-sql` (Azure SQL) → `feature/SCRUM-13-telas-login` (telas e sessão no app). Em separado: `docs/SCRUM-26-custos-azure`.

- **Decisão:** login próprio (ADR-014 substitui o Entra, bloqueado pelo diretório da faculdade). Docs: `14-login-proprio.md`, `15-persistencia-sql.md`, `16-custos-azure.md`, `13-avaliacao-criterios-banca.md` (avaliação contra os critérios da banca) e `infra/README.md` (Bicep).
- **No Azure já feito:** `AUTH_TOKEN_SECRET` na Function App; esquema no `sqldb-vacinaemdia`; usuário do banco para a identidade da API; `httpsOnly` do PLN corrigido. **Ainda não ligado:** `SQL_SERVER`, `SQL_DATABASE` e `DEMO_SESSION_ENABLED=false` na API (ligar **depois** de publicar o app com as telas de login).
- **Pendências do autor:** o Douglas mover o `rg-delbicos` para a assinatura dele (já é Owner); mover chaves ao Key Vault (papel de escrita); testar a voz com microfone real; revisar o dataset do chatbot e o termo de consentimento; tempos reais no Jira.
- **Próximos passos do Claude:** ligar o banco na API publicada e conferir o ponto a ponto na nuvem; recuperação de senha com e-mail (a decidir: Brevo ou Azure Communication Services, ver `16-custos-azure.md`); Bicep: adicionar `AUTH_TOKEN_SECRET`, `SQL_SERVER` e `SQL_DATABASE` à API; tabela de execução dos testes (caixa preta), busca semântica com LSA, seção de manutenção do Docker; telas restantes conforme `design-vacina-em-dia`.
- **Armadilhas novas:** `.expo/types` desatualizado quebra o typecheck local (mover para `types.old`); heredoc do shell com aspas falha (usar a ferramenta de escrita); a porta 7071 pode estar ocupada por um `func` do autor (usar outra porta); o navegador embutido não tira captura com o painel oculto (medir pelo DOM); a API de preços da Azure limita a taxa (429).

### 0.8 Estado de 07/10/2026 (fim do dia): o que mudou desde o 0.7 e por onde seguir

**Feito e na `main`:** telas de apresentação, entrar, criar conta, esqueci a senha e redefinir (SCRUM-13); recuperação de senha com Brevo (ADR-015, `docs/14-login-proprio.md`); Azure SQL ligado e API na nuvem com login ponta a ponta; caixa preta com 127 casos e tabelas de execução (`docs/07-testes/caixa-preta-*.md`, `execucao-estados-dose.md`, gerada por `scripts/gerar-execucao-estados.mjs`); busca com LSA e n-gramas, avaliada em 63 consultas (`docs/07-testes/avaliacao-busca-semantica.md`; o LSA isolado tem efeito pequeno com 22 documentos, e o relatório diz isso); Bicep em `infra/` e tabela AWS para Azure em `docs/08`; custos em `docs/16-custos-azure.md` (só o PLN com instância sempre pronta pesa, cerca de US$ 6,48 por mês).

**Na branch `docs/SCRUM-25-docker-manutencao` (abrir PR e mesclar):** `docs/17-docker-manutencao.md`; compose com login e chatbot funcionando localmente (chaves locais públicas de desenvolvimento, `docker/nlp-host-secrets.json`); teste de fumaça do CI com cadastro e pergunta ao chatbot (**ainda não rodou no GitHub**; se o job `docker` falhar, ver os registros na execução); formatação do `search_test_set.json` (o Prettier do CI reprovava).

**Pendências que dependem do autor (nenhuma é feita pelo Claude):**
1. **E-mail de recuperação desligado em produção.** As chaves do Brevo coladas no chat ficaram expostas (SMTP, API v3 e a "MCP", que é a mesma chave em base64): **revogar as três**, criar uma chave de API v3 nova, **verificar o remetente** no Brevo e rodar (trocando os valores; nunca colar a chave no chat nem gravar no repositório):
   `az functionapp config appsettings set -g rg-vacinaemdia -n func-vacinaemdia-vedia6398 --settings "BREVO_API_KEY=..." "EMAIL_SENDER_ADDRESS=..." "WEB_BASE_URL=https://blue-rock-0d7abc710.4.azurestaticapps.net"`. Depois o Claude testa o fluxo no site publicado.
2. O Douglas (douglas.nunes2@aluno.cps.sp.gov.br, assinatura `a19676d5-2ed0-4482-a6bf-c98a08eb01b3`, já Owner) mover o `rg-delbicos` com `az resource move`.
3. Papel Key Vault Secrets Officer no `kv-vedia6398` para mover chaves ao cofre; testar a voz com microfone real; revisar o dataset do chatbot, o termo de consentimento e as consultas de teste da busca; tempos reais no Jira (SCRUM-18, 20, 21, 22, 25, 26, 28 e 13); apagar `D:\c`.
4. Itens que só o autor fornece (critérios da banca, `docs/13`): estado inicial (CN2), definição do Product Owner, datas e tempos das reuniões, confirmação da tabela AWS para Azure com o professor.

**Próximos passos do Claude, em ordem sugerida:**
1. Conferir se o CI do PR do Docker ficou verde.
2. **Telas restantes conforme `design-vacina-em-dia/`** (ler o `LEIA-ME.md`, usar `telas/` e `tokens.json` só como referência): Doses, Detalhe da dose, Família, Histórico e Conta. Começar por Doses.
3. Testar o e-mail real assim que o item 1 acima for feito.
4. Documentações em Word (SCRUM-35 em andamento; a técnica, SCRUM-34, está em `doctos/Documentacao_Tecnica.docx` e a do usuário, SCRUM-36, em `doctos/Documentacao_do_Usuario.docx`, ambas a revisar pelo autor), panfleto (SCRUM-37), **checklist OWASP Top 10 e carga leve em `docs/21-seguranca-owasp-e-carga.md` (achado: 503 intermitentes na API real; **resolvido em 07/10/2026 ligando 1 instância sempre pronta na API**, cerca de US$ 6,50 por mês a mais, fora do Bicep), cabeçalhos de segurança na API**, **mapa de rastreabilidade (`docs/19-rastreabilidade.md`) e roteiro de demonstração por persona (`docs/20-roteiro-de-demonstracao.md`) escritos em 07/10/2026**, **voz no celular implementada em 07/10/2026 (`expo-audio`, PCM → WAV no aparelho), testada pelo autor no emulador Android; falta celular físico e iOS**, confirmação de e-mail no cadastro (não implementada). **Lembretes (SCRUM-19) implementados em 07/10/2026 (ADR-017), em PR: aplicar a migração 005 no Azure SQL antes de mesclar (o deploy não aplica migrações).** Embeddings na busca só com custo aprovado.
5. **Não** aplicar o Bicep no grupo de recursos atual (o `what-if` mostra recriações; o `infra.yml` só compila e valida).

**Armadilhas novas:** o deploy **não** aplica migrações do banco (usar `scripts/db-migrate.mjs`); o `npm run format:check` local reclama de CRLF no Windows (use `--end-of-line auto`); o commitlint recusa `style`; a porta 7071 e a 8081 podem estar ocupadas por `func` e Expo do autor (use outras portas); a documentação do Docker lista as outras.

### 0.10 Estado em 07/10/2026 (fim do dia): o que está pronto, o que está aberto e o que falta

**Na `main`:** login próprio e recuperação de senha (Brevo, **funcionando em produção**); Azure SQL; Bicep, custos e equivalência AWS para Azure; caixa preta (179 casos, inclui parentesco e dose avulsa); busca com LSA; Docker com manutenção documentada; **telas no padrão do design:** 4 abas (Doses, Família, Histórico, Conta), balão flutuante do assistente, tela Doses (atenção, próximas, aplicadas), Família com resumo e **parentesco** (select, migração 003 **aplicada**), Detalhe da dose com **calendário** para escolher datas (`SeletorDeData`), **dose avulsa** (ADR-016) com etiqueta "Oficial" ou "Adicionada por você".

**PRs de 07/10/2026 (todos mesclados na `main`; o Claude abre e mescla a pedido do autor):** #45 contrato do repositório SQL (liberou a dose avulsa), #46 web fiel ao design, #47 Histórico e Conta, #49 Apresentação, Entrar e Criar conta, #50 correção de um teste instável da tela Doses (`CT-APP-K01`, que reprovava PRs sem relação) e #48 este handoff. As branches foram apagadas.

**Publicação da dose avulsa:** a migração `004-dose-avulsa.sql` **já foi aplicada** no `sqldb-vacinaemdia`; o deploy do PR #44 foi cancelado de propósito (rodaria antes do banco) e a publicação veio com o PR #45. **Confira no site publicado** (cadastrar uma dose avulsa e abrir o Histórico).

**Pendências do autor:**
1. **Apagar a regra de firewall do SQL** (`az sql server firewall-rule delete -g rg-vacinaemdia -s sql-vacinaemdia-vedia6398 -n migracao-temporaria`); conferir com `az sql server firewall-rule list ... --query "[].name" -o tsv`. Para rodar migrações de novo, a regra é recriada com o IP do computador.
2. **Brevo:** apagar no painel a chave de API que apareceu no terminal (já houve outras expostas) e gerar uma nova; atualizar na Function App.
3. Itens antigos: o Douglas mover o `rg-delbicos`; Key Vault (papel de escrita); voz com microfone real; revisar dataset do chatbot e o termo de consentimento; tempos reais no Jira; apagar `D:\c`.

**Próximos passos do Claude, em ordem sugerida:**
1. Conferir o deploy da `main` no site publicado (dose avulsa, parentesco, telas novas) e o CI da `main`.
2. Fidelidade ao design que ainda falta: **Criar conta** (Termos de uso e Política de privacidade escritos em 07/10/2026, com aceite obrigatório e rascunho a validar: `docs/18-termos-e-privacidade.md`; o campo Nome do design **não** foi implementado, por decisão do autor, para guardar só e-mail e senha), e tablet (600 a 1023 px, não desenhado). Temas Escuro e Alto contraste conferidos em 07/10/2026 (ver item 4).
3. Caixa preta de parentesco e dose avulsa: **feita** (179 casos no total, `docs/07-testes/caixa-preta-execucao.md`); falta revisão por outra pessoa (por exemplo, o professor).
4. Telas ainda sem referência no design: Assistente, Consentimento, Membro (formulário), Redefinir senha; temas Escuro e Alto contraste conferidos em 07/10/2026 por medição no navegador (contraste do texto calculado no DOM, mínimo 4,5:1, sem falhas em Doses, Família, Histórico, Conta, Detalhe da dose, Nova dose, Pessoa e Privacidade no Escuro; abas no Alto contraste). Achado e corrigido: o fundo cinza fixo do navegador de telas aparecia nos temas Escuro e Alto contraste. **Não** conferido a olho nem em leitor de tela.
5. Confirmação de e-mail no cadastro (não existe); lembretes e voz no celular já feitos (ver item 4); documentações em Word (SCRUM-34, 35; a do usuário, SCRUM-36, foi escrita em 07/10/2026 em `doctos/Documentacao_do_Usuario.docx`, a revisar pelo autor, sem capturas de tela) e panfleto (SCRUM-37), só com dados reais do autor; estado inicial (CN2) e Product Owner dependem do autor.

**Decisões do autor nesta fase:** o parentesco é opcional e escolhido em lista; a dose avulsa tem nome e dose em texto livre e data prevista por calendário (hoje em diante; para o que já foi tomado, cadastrar e registrar a aplicação); segue o mesmo ciclo de estados; o Claude **abre os PRs e edita descrição e comentários**, o autor mescla.

**Armadilhas novas (além das de 0.5):**
- **Nunca rode `git checkout -- .`** nem comandos que descartem alterações: já apagou trabalho não commitado uma vez (refeito). Commite cedo.
- Heredoc ou `sed` do shell com aspas falha; escreva scripts Python com a ferramenta de arquivos e rode o arquivo.
- `gh pr create` usa GraphQL e pode falhar quando o GitHub está instável; a API REST pode ajudar. `gh run cancel <id>` cancela um deploy que não pode ir ao ar.
- **O deploy não aplica migrações:** aplique (`node scripts/db-migrate.mjs --server sql-vacinaemdia-vedia6398.database.windows.net --database sqldb-vacinaemdia`, com `az login` e IP liberado) **antes** de publicar código que as use. Rode também o contrato no SQL real (`SQL_TEST_SERVER` e `SQL_TEST_DATABASE`); ele já pegou um desvio que os testes em memória não pegaram.
- Teste no navegador embutido: clique em `Adicionar dose` da tela anterior pode pegar o botão errado (telas da pilha continuam no DOM); use o último elemento com o mesmo rótulo. `form_input` não atualiza o estado do React; digite ou use o setter nativo com `input`.
- Localmente: `npm run dev:api` precisa do Azurite (`docker compose up -d azurite`) e de `AUTH_TOKEN_SECRET` no `apps/api/local.settings.json`; no emulador do Android o app usa `10.0.2.2` sozinho.
- Pastas fora do Git que precisam ser copiadas à mão: `design-vacina-em-dia/` (nunca commitar), `assets/`, `apps/api/local.settings.json`.

### 0.9 Histórico detalhado das sessões (referência; a retomada está em 0.1 a 0.6)

**Atualização de 07/10/2026 (sessão de entrega acelerada):** deploy no Azure funcionando por OIDC (`docs/08`); calendário oficial; família, doses, consentimento e exclusão (ADR-013); layout web em computador; serviço de PLN e voz com Azure AI Speech; chat com voz na web. Armadilhas novas: o plano Linux Consumption (Y1) travou em 503, por isso o Flex Consumption; o PLN precisa de instância sempre pronta e paralelismo HTTP 8 (senão ~5 s de espera entre chamadas); o subject do OIDC deste repositório leva IDs numéricos; o `npm run lint` só passa com `.venv` ignorado; o shell do Claude trava com textos longos com aspas (usar a ferramenta de arquivos).


Este arquivo é o canal de continuidade entre computadores e sessões. A memória local do Claude **não** sincroniza entre máquinas; só o que está commitado e enviado ao GitHub (`origin`) chega ao outro computador.

**Última atualização:** 06/10/2026, computador do trabalho/faculdade.

**Feito:**
- Commit inicial na `main` (`0f64b2c`): `CLAUDE.md`, `README.md`, `.gitignore`, `LICENSE` e `docs/` (sem os PDFs de referência).
- Branch `docs/SCRUM-5-claude-md-word-e-pdf`: `CLAUDE.md` atualizado com a regra "Word (ABNT) durante o desenvolvimento, PDF só na entrega".
- Jira SCRUM-5: comentário com o commit e worklog de 2h 17m lançados. Status **não** alterado.

**Atualização de 06/10/2026 (SCRUM-35 e status do Jira):**
- Itens movidos para **Em análise** pelo Claude, a pedido do autor, por terem cumprido os critérios de pronto: SCRUM-27, SCRUM-29, SCRUM-31 e SCRUM-33. SCRUM-32 segue em andamento (protótipo do Figma incompleto). Nada está Concluído; isso só ocorre na reunião de encerramento da Sprint 1 (até 12/10).
- `docs/09-documentacao-de-desenvolvimento.md` criado com a estrutura do modelo (o modelo pula da seção 3 para a 6; a numeração aqui é contínua). Foram preenchidos só os fatos verificáveis. **Tempos, horários e durações ficam `[a informar]`**: o autor precisa informá-los; o Claude não os inventa (CLAUDE.md §13 e critério "tempos reais" do SCRUM-35). Já registrado de verdade: 2 h 17 min no SCRUM-5. Custo de nuvem: zero, confirmado pelo autor.
- `poppler` instalado via Homebrew (`pdftotext` e `pdftoppm` disponíveis).
- Dados informados pelo autor em 06/10/2026: RA 3011392413005; tempo médio de 30 min por item (já lançado como worklog em SCRUM-27, 29, 31, 32, 33 e 35); reuniões às sextas, 20:05, de 30 a 40 min; rotina de estudo de segunda a sexta, 19:00 às 21:45 (PLN segunda, Nuvem terça, Mineração de Dados quarta, Qualidade quinta, reunião com o professor sexta). Registros de aprendizagem e de reuniões só entram **depois de ocorrerem**, com a data real.
- Pendências do autor para o SCRUM-35: data da reunião de planejamento da Sprint 1 e o local; informar após cada reunião e cada estudo a data e o tempo efetivos.

**Atualização de 06/10/2026 (SCRUM-32, Figma):**
- Doc do design system e `tokens.json` já estão na `main`. O arquivo do Figma (chave `lZboLAlTDtA2cJQRyKtcdW`, link em `docs/04-design-system.md` §8) foi construído até o limite de chamadas do Figma MCP no plano Starter (também só 1 modo por coleção e 3 páginas).
- **Feito no Figma:** coleções de cor por tema (Claro `4:2`, Escuro `4:24`, Alto contraste `4:46`) e Medidas (`4:68`); 8 estilos de texto Atkinson; 14 componentes na página `0:1`: Selo `5:32`, Botão `6:20` (props `Texto#6:0`, `Tipo`, `Estado`), Campo `6:36` (`Rotulo#6:10`, `Valor#6:14`, `Estado`), Cartão de dose `7:77` (`Vacina#7:0`, `Detalhe#7:6`, `Estado`), Voz `7:96`, Aviso `7:103`, Vazio `8:27`, Erro `8:37`, Carregando `8:46`, Navegação `8:149`, Membro `9:65` (`Nome#9:0`, `Idade#9:3`, `Situacao`) e Mensagem `9:72` (`Mensagem#9:6`, `Autor`). Nomes de variantes são em ASCII (por exemplo `Tipo=Principal, Estado=Padrao`).
- **Telas de celular criadas na página `4:104` e ainda não conferidas visualmente:** Entrar `10:39`, Consentimento `10:58`, Família `10:71`, Calendário `10:138`. Conferir com `get_screenshot` antes de continuar.
- **Falta:** celular (Detalhe da dose, Confirmação de cancelamento, Voz, Assistente, Histórico, Conta); tablet 768 e web 1280 na página `4:105`; cópias do Calendário nos temas Escuro e Alto contraste (trocar as variáveis ligadas pelas de mesmo nome na outra coleção); títulos de seção na página de componentes; amostra das cores por tema.
- **Como continuar:** esperar a renovação do limite do Figma MCP ou ampliar o plano e o assento (o plano Education do Figma, para estudantes, costuma liberar o Professional; conferir). Para continuar, carregar as skills `figma-use`, `figma-generate-library` e `figma-generate-design` e reutilizar os IDs acima. Os arquivos de Figma não ficam no repositório; este bloco e o §8 do design system são o registro.

**Atualização de 06/10/2026 (SCRUM-31, UML e DER):**
- Branch `docs/SCRUM-31-uml-der` com casos de uso, classes, 3 sequências (login, registrar dose, lembrete), arquitetura, DER e dicionário de dados em `docs/03-uml/`. Todos os diagramas Mermaid foram validados e renderizados com o `@mermaid-js/mermaid-cli` (instalado só na pasta temporária da sessão, fora do projeto; reinstalar com `npm install @mermaid-js/mermaid-cli` num diretório de scratch se precisar validar de novo). PNGs não foram versionados; gerar na hora de montar os Word (SCRUM-34).
- Decisões de modelagem adotadas por padrão (autor delegou): lembrete por push do Expo + sinalização no app (sem e-mail); doses gravadas no banco ao cadastrar o membro; só a data de aplicação (sem lote e local); tabela de eventos da dose; exclusão em cascata; consentimento com versão do termo e declaração de responsável para menores.
- **Pendências do autor:** fornecer ou confirmar os dados oficiais do calendário do PNI (até lá, o seed é `FICTITIOUS`); validar a antecedência dos lembretes e a lista de grupos específicos.

**Atualização de 06/10/2026 (SCRUM-23, Fase C, app):**
- Branch `feature/SCRUM-23-app-temas-e-tokens`: NativeWind 4.2.7 + Tailwind 3.4.19 lendo `tokens.json`, `ThemeProvider` com 3 temas, fonte Atkinson (verificada na web), componentes base, tela provisória com doses de exemplo `FICTITIOUS` e testes do app (jest-expo + Testing Library, cobertura de linhas 100%). Detalhes em `docs/04-design-system.md` §6.
- **Falta da Fase C:** API de doses de exemplo + OpenAPI/Swagger (ADR-012; depende do PR da branch `docs/SCRUM-23-openapi-swagger` estar na `main`), depois `docker-compose.yml` (SCRUM-25) e a Fase D (Azure, SCRUM-22).
- Para o app achar `@vacina/shared`, rode `npm run build` na raiz antes de `npm run dev:mobile` (o pacote aponta para `dist`); nos testes o Jest lê o código-fonte direto.

**Atualização de 06/10/2026 (SCRUM-18 e SCRUM-23, API de doses e Swagger):**
- Branch `feature/SCRUM-18-api-doses-swagger`: `GET /api/doses`, `GET /api/doses/{id}`, `POST /api/doses/{id}/events` (usa a máquina de estados; erros 400, 404, 409, 422, 500), `GET /api/openapi.json` e `GET /api/docs` (Swagger UI, só com `DOCS_ENABLED=true`). Dados em memória com seed `FICTITIOUS` (ids `ex-1` a `ex-5`), sem login e sem dados pessoais. O "hoje" das regras é o dia civil de Brasília.
- Camadas: `handlers` → `services` → `domain` (`@vacina/shared`) → `repositories` (em memória; o banco entra no SCRUM-22). A montagem com `new Date()` fica só em `src/functions/composition.ts`.
- Código 401, 403 e 429 só constam na especificação quando existirem login e rate limit (SCRUM-13).
- O app **ainda não chama a API** (decisão do autor: PR separado). Próximo passo: TanStack Query + `EXPO_PUBLIC_API_URL` + CORS, depois `docker-compose` (SCRUM-25) e Azure mínimo (SCRUM-22).
- Node 24 LTS adotado (`.nvmrc`); no computador de casa, `nvm install 24 && nvm use`.

**Atualização de 06/10/2026 (SCRUM-18, app consome a API):**
- Branch `feature/SCRUM-18-app-consome-api`: a tela de doses busca `GET /api/doses` com TanStack Query (`src/api`, `src/features/doses`), valida a resposta com o mesmo esquema Zod, mostra carregando, erro (com "Tentar de novo") e vazio, e exibe fonte e versão do calendário vindas da API. O conjunto de exemplo interno do app foi removido.
- `EXPO_PUBLIC_API_URL` define a API (padrão `http://localhost:7071/api`). Para celular real: `npm run dev:api:rede` (a API escuta em `0.0.0.0`) e o IP do computador. Emulador de Android: `10.0.2.2`.
- Corrigido bug de contraste: `text-texto` e `text-sobrePrimaria` disputavam no CSS e o botão selecionado ficava com texto quase invisível (cerca de 1,6:1 no tema Escuro). Agora o mínimo medido é 6,5:1.
- Verificado no navegador com API e app reais (dados ao vivo, erro com a API desligada, recuperação). Nota: o TanStack Query pausa tentativas em aba oculta; ao testar o erro, deixe a aba visível.
- Ainda **não** verificado: celular real e emuladores com esta versão. Próximos passos: `docker-compose` (SCRUM-25) e Azure mínimo (SCRUM-22).

**Atualização de 06/10/2026 (SCRUM-25, Docker):**
- Branch `feature/SCRUM-25-docker`: `docker compose up --build` sobe Azurite 3.37.0, a API (host oficial `azure-functions/node:4-node24`, só amd64, emulada em Mac M1/M2) e o app web (build do Expo servido por nginx 1.31.6, que repassa `/api` para a API: mesma origem, sem CORS). Dockerfiles em `apps/api/` e `apps/mobile/`, contexto de build é a raiz. Portas só em `127.0.0.1`: web 8080, API 7071, Azurite 10000 a 10002.
- O app aceita `EXPO_PUBLIC_API_URL=/api` (caminho na mesma origem; `//host` é rejeitado). A imagem web usa esse valor por padrão.
- Validado aqui: build das duas imagens, subida do zero com `down -v` e `up --build --wait`, API direta, via nginx, Swagger, POST, Azurite recebendo requisições do host e o app aberto no navegador pelo contêiner. Novo job `docker` no CI faz o mesmo (em amd64 nativo); ainda não rodou no GitHub.
- **O SCRUM-25 ainda não está completo:** o critério pede o serviço de PLN no compose, que só existe com SCRUM-20 e SCRUM-21. Não mover para "Em análise" antes disso (ou combinar com o autor a divisão do item).

**Lembretes por item (revisar com o autor quando o item começar):**

| Item | O que revisar |
|---|---|
| SCRUM-22 | Registrar os provedores `Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory`; criar o tenant externo (diretório do Centro Paula Souza); recursos antigos do DelBicos no Azure (inventário feito em 06/10/2026: `rg-delbicos` e `DefaultResourceGroup-CQ`; nada foi apagado e é preciso decidir com o autor, pois podem consumir o crédito) |
| SCRUM-13 | Bloqueio de tentativas de login no Entra; validar o ADR-009 (token) com o fluxo real e escolher entre MSAL e `expo-auth-session` |
| SCRUM-14 | Texto de consentimento mencionando a transferência de dados para fora do Brasil (Entra sem região no Brasil) |
| SCRUM-19 | Antecedência dos lembretes; texto genérico da notificação |
| SCRUM-20 e 21 | Calibrar os limites do ADR-010; rede entre API e PLN |
| SCRUM-26 | Confirmar custos na calculadora oficial (Speech F0, Functions, Application Insights) |

**Atualização de 06/10/2026 (fim da sessão):**
- SCRUM-5: PR #1 já mesclado na `main`.
- SCRUM-27 (plano de teste): `docs/07-testes/plano-de-teste.md`, branch `docs/SCRUM-27-plano-de-teste`, enviada ao GitHub; PR a abrir pelo autor.
- SCRUM-33 (ADRs): `docs/05-adrs/` com ADR-001 a ADR-010, todos **Aceita**, branch `docs/SCRUM-33-adrs`, enviada ao GitHub; PR a abrir pelo autor. O autor deve revisar os ADRs (em especial os valores iniciais de limite de taxa no ADR-010 e a nota de residência de dados no ADR-005).
- Verificações no Azure (somente leitura, via `az`): assinatura `Azure for Students` compatível com o SQL gratuito; política de regiões permitidas (Central US, Brazil South, Chile Central, South Africa North, North Central US); provedores `Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory` ainda **não registrados** (registrar no SCRUM-22). O `az login` expira a cada 3 dias por acesso condicional do diretório (Centro Paula Souza); o autor refaz o login no navegador.
- Nenhum recurso foi criado no Azure. Jira: SCRUM-27 e SCRUM-33 estão "Em andamento"; nada marcado como Concluído.
- Próximo item da ordem da Sprint 1: SCRUM-31 (UML restante e DER), depois SCRUM-32 (design system) e SCRUM-35.

**Pendente (em andamento): converter os 3 modelos de documentação para Word**
- Arquivos: `docs/referencias-disciplinas/Modelo-Documentacao_tecnica.pdf`, `..._desenvolvimento.pdf` e `..._usuario.pdf`.
- Objetivo: gerar `.docx` editáveis em `doctos/`, formatados fielmente pela ABNT (a formatação do PDF original pode ser perdida), já com a estrutura do modelo para preencher. Horas, datas e reuniões da Documentação de Desenvolvimento ficam em branco (são do autor).
- Só apagar os 3 PDFs de modelo depois que o autor conferir os Word. Os outros 3 PDFs de `referencias-disciplinas/` permanecem como PDF.
- Ferramentas que faltavam na máquina onde isso foi tentado (autor decide instalar): `poppler` (ler PDF), `pandoc` e `libreoffice` (renderizar e conferir o Word), via Homebrew.
- Os 6 PDFs de `docs/referencias-disciplinas/` estão versionados na branch `docs/SCRUM-5-claude-md-word-e-pdf`, então chegam ao outro computador com `git pull`.

**Próximo passo depois disso:** abrir PR da branch `docs/SCRUM-5-...` para a `main` e seguir a Sprint 1 (ver §4).

**Regras do autor desta fase:** nunca se incluir como coautor em commits/PRs; a partir de agora, uma branch por tarefa (`feature/SCRUM-n-...`, `docs/SCRUM-n-...`); nunca marcar Jira como Concluído; não inventar horas.

**Como retomar em outro computador:** `git fetch`, trocar para a branch indicada acima, ler `CLAUDE.md` e este arquivo, e confirmar o estado com `git status` e `git log --oneline -5`. Ao pausar: atualizar esta seção, commitar e dar push da branch.

## 1. Onde estamos

- Projeto: **Vacina em Dia** (carteira de vacinação digital com lembretes, busca por voz e chatbot), solo, na Azure. PI-VI da Fatec Votorantim.
- Fase 0 (fundação) concluída em rascunho: visão e escopo, requisitos, backlog no Jira, diagrama de estados da dose, casos de teste e `CLAUDE.md`. Tudo isso está **em análise do autor**, ainda não aprovado em reunião de sprint.
- Já existe código: monorepo, domínio da dose, API de exemplo, app com temas, Docker e CI (ver 0.2). Ainda **não há** Azure provisionado, login, banco, PLN nem calendário oficial do PNI.
- Datas: **12/11** Qualidade e Testes, **16/11** PLN (voz e chatbot), **19/11** entrega total. A data de Computação em Nuvem II está a confirmar.

## 2. O que já existe (neste pacote)

| Arquivo | Conteúdo | Situação |
|---|---|---|
| `CLAUDE.md` | Regras de trabalho, stack, convenções, segurança, DoD | Pronto; revisar §14 (decisões em aberto) |
| `docs/Fase0_Documento_de_Visao_e_Escopo.docx` | Documento formal em ABNT | Rascunho; falta RA na folha de rosto |
| `docs/01-visao-e-escopo.md` | Mesma Fase 0 em Markdown | Gerado do .docx |
| `docs/02-requisitos.md` | RF01 a RF12 e RNF01 a RNF10 | Extraído da Fase 0 |
| `docs/03-uml/estados-dose.*` | Diagrama de estados da dose (Mermaid, PNG, SVG) e tabelas | Rascunho; Mermaid validado com o mermaid-cli em 06/10/2026 (renderiza sem erro) |
| `docs/07-testes/casos-teste-estados-dose.md` | 42 casos de teste (CT-...) | Rascunho (SCRUM-29) |
| `docs/referencias-disciplinas/` | PDFs do PI-VI, modelos de documentação, Qualidade e Testes, PLN | Material da faculdade, só leitura |

**Já existem:** ADRs (`docs/05-adrs/`), plano de teste (`docs/07-testes/plano-de-teste.md`), UML, DER e dicionário de dados (`docs/03-uml/`). `docs/04-design-system.md` e `docs/tech-versions.md` também existem agora. **Ainda não existe:** `docs/06-seguranca-e-lgpd.md`.

## 3. Jira (projeto SCRUM, site vacinaemdia.atlassian.net)

**Convenção de status (exigida pelo professor):** A fazer, Em andamento (sprint iniciada), Em análise (terminou dentro da data da sprint) e Concluído (só após análise na reunião de encerramento). **Nunca marcar Concluído.** As metas de sprint ficam vazias de propósito.

**Épicos:** SCRUM-5 Fundação e documentação; SCRUM-6 Infraestrutura, Azure e DevOps; SCRUM-7 Conta e privacidade; SCRUM-8 Família e calendário vacinal; SCRUM-9 Doses e lembretes; SCRUM-10 PLN (voz e chatbot); SCRUM-11 Qualidade e testes; SCRUM-12 Versão completa.

**Itens:**

| Chave | Item |
|---|---|
| SCRUM-13 / 14 | Cadastro e login (RF01) / Consentimento e exclusão (RF09) |
| SCRUM-15 / 16 / 17 | Membros (RF02) / Calendário (RF03) / Histórico (RF08) |
| SCRUM-18 / 19 | Registro e ciclo de vida da dose (RF04) / Lembretes (RF05) |
| SCRUM-20 / 21 | Busca por voz (RF06) / Chatbot (RF07) |
| SCRUM-22 / 23 / 24 | Provisionar Azure / Monorepo e qualidade / Pipeline CI |
| SCRUM-25 / 26 | Docker / Estimativa de custo e alertas |
| SCRUM-27 / 28 / 29 / 30 | Plano de teste / Caixa preta / UML de estados e casos / Jest |
| SCRUM-31 / 32 / 33 | UML e DER / Design system / ADRs |
| SCRUM-34 / 35 / 36 / 37 | Doc. técnica / Doc. de desenvolvimento / Doc. do usuário / Panfleto |
| SCRUM-38 / 39 / 40 | Mapa de UBS / Exportar PDF / Compartilhar (versão completa) |

**Sprints semanais:**

| Sprint | Período | Itens |
|---|---|---|
| 1 (ativa) | 06/10 a 12/10 | SCRUM-31, 33, 27, 29, 32, 35 |
| 2 | 13/10 a 19/10 | SCRUM-22, 23, 24, 13 |
| 3 | 20/10 a 26/10 | SCRUM-15, 16, 18, 28 |
| 4 | 27/10 a 02/11 | SCRUM-14, 17, 19, 20, 30 |
| 5 | 03/11 a 09/11 | SCRUM-21, 25, 26, 34 |
| 6 | 10/11 a 19/11 | SCRUM-36, 37 e ajustes |

O SCRUM-35 (documentação de desenvolvimento) corre em todas as sprints.

Os itens que alimentam a entrega de **12/11** (SCRUM-27, 29, 24, 28 e 30) estão nas Sprints 1 a 4, que terminam em 02/11. A Sprint 5 (03/11 a 09/11) serve de folga antes do prazo. A entrega de PLN (16/11) depende do SCRUM-20 (Sprint 4) e do SCRUM-21 (Sprint 5), ou seja, sem muita margem; vigiar esse prazo.

## 4. Próximos passos

A ordem atual está em **0.6**. A lista original da Sprint 1 (itens 1 a 6: commit inicial, plano de teste, ADRs, UML e DER, design system, documentação de desenvolvimento) já foi cumprida, salvo o protótipo do Figma e a atualização contínua do SCRUM-35.

## 5. Decisões já tomadas (resumo)

- Um único repositório (monorepo): `apps/mobile`, `apps/api`, `apps/nlp`, `packages/shared`, `docs`, `doctos`.
- API em **Azure Functions (Node/TS), sem Express**; PLN em Function Python; voz com Azure AI Speech; **Azure SQL**; Key Vault e Application Insights.
- Testes em **Jest** (decisão do autor, apesar de o PI-VI citar JUnit/Selenium); 100% de aprovação, cobertura mínima de 80% e meta de 90%.
- Chatbot por regras com TF-IDF + SVM, **sem IA generativa**.
- Calendário vacinal sempre de **fonte oficial (PNI)**, nunca de memória.
- Sem coleta de CPF nem Cartão Nacional de Saúde.

## 6. Pendências e pontos em aberto

- **Autor:** preencher o RA na folha de rosto da Fase 0; revisar o nome "Vacina em Dia"; completar as datas das referências de web (`[s. d.]`); revogar o token de API do Jira que foi colado no chat.
- Confirmar com o professor: Jest como ferramenta, se o código Python entra na meta de cobertura, e a data de Computação em Nuvem II.
- Verificar no portal da Azure: Entra External ID (ADR-005) e camada gratuita do Azure SQL.
- Definir: armazenamento seguro de token na web (o `expo-secure-store` não funciona na web), mecanismo de limitação de taxa e a confirmação de Context API + TanStack Query (ADR-006).
- Validar as decisões de modelagem do ciclo da dose (estados finais, atraso pela rotina de prazo).

## 7. Divisão de trabalho sugerida

- **Claude Code (neste repositório):** código, testes, CI, Docker, ADRs, diagramas e documentos em Markdown.
- **Chat de planejamento:** documentos formais em Word ou PDF (Fase 0, documentações técnica, de desenvolvimento e do usuário, panfleto) e operações no Jira (criar e editar itens), se o conector estiver disponível.

## 8. Prompts para a primeira sessão

**Sessão 1: organizar o repositório (sem código)**

```text
Leia CLAUDE.md e docs/00-handoff.md. Depois confira se os arquivos de docs/ estão
no lugar. Crie o README.md inicial (visão curta, estrutura de pastas, como contribuir),
um .gitignore adequado a Node, Expo e Python (sem segredos) e faça o commit inicial
em português seguindo Conventional Commits. Não crie código de aplicação ainda.
Me mostre o que vai fazer antes e peça confirmação.
```

**Sessão 2: SCRUM-27 (plano de teste)**

```text
Leia CLAUDE.md, docs/00-handoff.md, docs/01-visao-e-escopo.md, docs/02-requisitos.md
e docs/07-testes/casos-teste-estados-dose.md. Estamos na Sprint 1. Vou trabalhar o
SCRUM-27 (plano de teste, requisitos relevantes e papéis do processo de teste) para
a entrega de Qualidade e Testes de 12/11; os requisitos da entrega estão em
docs/referencias-disciplinas. Antes de escrever, proponha a estrutura do documento e
liste suas dúvidas. Não mova nada no Jira para Concluído.
```
