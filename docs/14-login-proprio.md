# Login próprio (RF01, SCRUM-13, ADR-014)

Cadastro e entrada por e-mail e senha, na própria API. Decisão e alternativas: `docs/05-adrs/ADR-014-autenticacao-propria.md`.

## Estado (07/10/2026)

| Parte | Situação |
|---|---|
| Rotas `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Prontas, no Swagger, com testes |
| Hash de senha (scrypt), política de senha, JWT HS256, token de renovação com rotação, bloqueio por falhas | Prontos, com testes |
| Contas **em memória** | Provisório: somem ao reiniciar a API. O ADR-014 exige o **Azure SQL** (próximo passo) |
| Telas Entrar e Criar conta no app | A fazer |
| Recuperação de senha e confirmação de e-mail | A fazer; exige serviço de e-mail (ver ADR-014) |
| `AUTH_TOKEN_SECRET` no Key Vault e nas configurações da API | A fazer (sem ele, as rotas respondem 503) |

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

1. Persistência no Azure SQL (usuário do banco para a identidade da API, tabelas, migrações) e repositórios SQL das contas, membros, doses e consentimento.
2. Telas Entrar e Criar conta (`design-vacina-em-dia/telas`), cliente com renovação automática e armazenamento do token (ADR-009).
3. `AUTH_TOKEN_SECRET` no Key Vault; depois `DEMO_SESSION_ENABLED=false`.
4. Recuperação de senha e confirmação de e-mail, com um serviço de e-mail transacional (a aprovar).
