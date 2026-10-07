# Login próprio (RF01, SCRUM-13, ADR-014)

Cadastro e entrada por e-mail e senha, na própria API. Decisão e alternativas: `docs/05-adrs/ADR-014-autenticacao-propria.md`.

## Estado (07/10/2026)

| Parte | Situação |
|---|---|
| Rotas `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Prontas, no Swagger, com testes |
| Hash de senha (scrypt), política de senha, JWT HS256, token de renovação com rotação, bloqueio por falhas | Prontos, com testes |
| Contas, tokens, consentimento, membros e doses no **Azure SQL** | Prontos e verificados em 07/10/2026 contra o banco real (ver `docs/15-persistencia-sql.md`). Ligados na API pelas variáveis `SQL_SERVER` e `SQL_DATABASE`; **ainda não ligados no Azure** (ver abaixo) |
| Telas Apresentação, Entrar e Criar conta no app | Prontas (web e celular), com testes; renovação automática da sessão; armazenamento do token pela ADR-009 (SecureStore no celular, `sessionStorage` com CSP na web) |
| Recuperação de senha e confirmação de e-mail | A fazer; exige serviço de e-mail (ver ADR-014) |
| `AUTH_TOKEN_SECRET` | Criado em 07/10/2026 como configuração da Function App (valor aleatório de 48 bytes, fora do Git). Mover para o Key Vault quando houver o papel de escrita |

## Como funciona

1. `POST /auth/register` ou `/auth/login` devolve `accessToken` (JWT, 15 minutos), `refreshToken` (opaco, 30 dias) e a conta.
2. As demais rotas recebem `Authorization: Bearer <accessToken>`. O dono dos dados é o `sub` do token.
3. Antes de o token vencer, `POST /auth/refresh` troca o `refreshToken` por uma sessão nova. **Cada token só vale uma vez**; apresentar um já usado revoga todas as sessões da conta.
4. `POST /auth/logout` revoga o `refreshToken`.

## Segurança aplicada

- Senha: só o hash scrypt (N=2^15, r=8, p=3, sal de 16 bytes), com os parâmetros dentro do hash. Mínimo de 8 caracteres, máximo de 128, recusa de senhas comuns, sem regra de composição.
- Mensagem única "E-mail ou senha incorretos" para conta inexistente e senha errada, com o mesmo custo de cálculo.
- 5 falhas em 15 minutos bloqueiam o e-mail; 20 falhas em 15 minutos bloqueiam a origem (429 com `Retry-After`). Cadastro: 10 por hora por origem.
- O JWT só aceita HS256 (recusa `none`), confere emissor e validade; a chave tem pelo menos 32 caracteres e vem do ambiente.
- E-mail, senha e tokens não vão para logs; os contadores usam hash do e-mail e da origem.
- Um token `Bearer` inválido **não** cai para a sessão de demonstração.

## Configuração

| Variável | Para quê |
|---|---|
| `AUTH_TOKEN_SECRET` | Chave de assinatura (32 caracteres ou mais; Key Vault). Sem ela, o login responde 503 |
| `DEMO_SESSION_ENABLED` | `false` desliga o cabeçalho `x-demo-session` (ADR-013). Hoje fica ligado até o app usar o login |

## Testes

| IDs | O que verifica |
|---|---|
| CT-AUTH-01 a 06 | Hash scrypt (sal, Unicode, hash malformado) e política de senha |
| CT-AUTH-10 a 16 | JWT (assinatura, validade exata, adulteração, `none`, emissor) e token de renovação |
| CT-AUTH-20 a 23 | Bloqueio por falhas |
| CT-AUTH-30 a 35 | Cadastro (e-mail repetido, senha fraca, limites) |
| CT-AUTH-40 a 45 | Login (resposta única, bloqueio por e-mail e por origem, zerar falhas) |
| CT-AUTH-50 a 54, 60 | Renovação com rotação, reuso suspeito, saída, exclusão |
| CT-AUTH-H01 a H08 | Handlers HTTP |
| CT-AUTH-S01 a S05 | Esquemas compartilhados |
| CT-SEG-10 a 13 | Descoberta do dono (Bearer, demonstração) |

## Próximos passos

1. ~~Persistência no Azure SQL~~ (feito). **Ligar no Azure** (`SQL_SERVER` e `SQL_DATABASE`) só junto com o app usando o login: com o banco ligado, a sessão de demonstração deixa de funcionar, porque os dados passam a pertencer a uma conta.
2. ~~Telas Entrar e Criar conta~~ (feito, ver abaixo).
3. `AUTH_TOKEN_SECRET` no Key Vault; depois `DEMO_SESSION_ENABLED=false`.
4. Recuperação de senha e confirmação de e-mail, com um serviço de e-mail transacional (a aprovar).

## Telas e sessão no app (SCRUM-13)

Referência visual: as telas de `design-vacina-em-dia/telas` (Apresentação, Entrar e Criar conta), com os tokens do design system. A pasta de design é só apoio e não é versionada.

| Tela | Rota | Observações |
|---|---|---|
| Apresentação | `/apresentacao` | Promessa do app, três vantagens e o aviso de que não substitui a caderneta; vantagens lado a lado no computador |
| Entrar | `/entrar` | E-mail e senha, com "Mostrar a senha"; "Esqueci minha senha" explica que a recuperação ainda não existe |
| Criar conta | `/criar-conta` | Só e-mail e senha (mínimo 8 caracteres); o consentimento vem na tela seguinte |
| Conta | `/conta` (aba) | Mostra o e-mail, "Sair da conta" e a exclusão da conta e dos dados |

Diferenças em relação ao desenho (decisões de privacidade): **não pedimos "Nome"** no cadastro (o app guarda o mínimo; nomes são dos membros da família) e **não há caixa "Li e aceito"** no cadastro, porque o consentimento já tem tela própria, obrigatória antes de qualquer dado (RF09). O desenho não previa tema escuro; as telas usam os três temas.

- **Rotas protegidas** (`Stack.Protected`): sem sessão, só Apresentação, Entrar e Criar conta; com sessão, o resto. Uma URL de dentro do app abre a Apresentação para quem não entrou.
- **Sessão:** `SessionProvider` guarda o token de acesso (15 min) e o de renovação (30 dias). Renova antes de vencer (30 s de margem) e ao receber 401, **uma renovação por vez** (o token só vale uma vez). Só uma recusa 401 do servidor encerra a sessão; falta de rede ou erro 5xx não tira a pessoa do app. Ao entrar e ao sair, o cache de dados é esvaziado.
- **Modo demonstração:** só existe com a propriedade `sessionId` do provedor (usada nos testes); o app publicado sempre exige login.
- **Segurança da web (ADR-009):** `public/staticwebapp.config.json` e `nginx.conf` definem a política de segurança de conteúdo (CSP): só scripts do próprio site, `connect-src` só para o site e a API, sem frames. Verificado em 07/10/2026 com o build servido com esses cabeçalhos: a página carrega, as fontes carregam e o console não tem violação. O mesmo arquivo define o `navigationFallback` do Static Web Apps (abrir ou recarregar `/entrar` direto não dá 404).
- **Testes:** CT-SES-10 a 26 (provedor), CT-SES-30 a 38 (armazenamento), CT-APP-L01 a L31 (telas).
- **Verificado no navegador** (web, API local com login): cadastro, entrada, erro de senha, redirecionamento ao consentimento, rotas protegidas; no celular de 375 px, uma coluna, margem de 16 e alvos de toque de 48 a 56. **Não verificado:** celular real (Android e iOS), leitor de tela, tema de alto contraste.
