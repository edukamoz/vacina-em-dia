# Login próprio (RF01, SCRUM-13, ADR-014)

Cadastro e entrada por e-mail e senha, na própria API. Decisão e alternativas: `docs/05-adrs/ADR-014-autenticacao-propria.md`.

## Estado (07/10/2026)

| Parte | Situação |
|---|---|
| Rotas `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Prontas, no Swagger, com testes |
| Hash de senha (scrypt), política de senha, JWT HS256, token de renovação com rotação, bloqueio por falhas | Prontos, com testes |
| Contas, tokens, consentimento, membros e doses no **Azure SQL** | Prontos e verificados em 07/10/2026 contra o banco real (ver `docs/15-persistencia-sql.md`). Ligados na API pelas variáveis `SQL_SERVER` e `SQL_DATABASE`; **ainda não ligados no Azure** (ver abaixo) |
| Telas Entrar e Criar conta no app | A fazer |
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
2. Telas Entrar e Criar conta (`design-vacina-em-dia/telas`), cliente com renovação automática e armazenamento do token (ADR-009).
3. `AUTH_TOKEN_SECRET` no Key Vault; depois `DEMO_SESSION_ENABLED=false`.
4. Recuperação de senha e confirmação de e-mail, com um serviço de e-mail transacional (a aprovar).
