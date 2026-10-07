# Checklist OWASP Top 10 e carga leve (RNF01 e RNF02)

Item do Jira: SCRUM-30. Estado em 07/10/2026. Fecha duas lacunas do `docs/19-rastreabilidade.md`: o checklist de segurança do RNF02 e a medição de desempenho do RNF01. A lista é a **OWASP Top 10:2021**. Cada linha diz o que existe, onde verificar e o que **não** está resolvido. É uma autoavaliação do projeto, não um teste de invasão.

## Parte 1: OWASP Top 10:2021

| # | Risco | O que o projeto faz (evidência) | Lacuna ou risco aceito |
|---|---|---|---|
| A01 | Controle de acesso quebrado | Todo método dos repositórios recebe o dono; no SQL toda consulta filtra por `account_id` e a dose só é alcançada pelo membro do dono (`CT-SQL-11`). IDs vindos do cliente nunca bastam (`CT-LEM-23`, `CT-FAM-*`). No app, as rotas internas só abrem com sessão (`Stack.Protected`). A sessão de demonstração está **desligada** na Function App real (`DEMO_SESSION_ENABLED=false`, conferido em 07/10/2026) | Documentação interativa `/api/docs` ligada em produção (`DOCS_ENABLED=true`), de propósito para a avaliação; desligar depois da apresentação se preferir |
| A02 | Falhas criptográficas | Senha com scrypt (N=2^15, r=8, p=3, sal aleatório, comparação em tempo constante); tokens de renovação e de redefinição guardados só como hash; JWT HS256 com algoritmo fixo na conferência; HTTPS obrigatório (`httpsOnly`), TLS mínimo 1.2, FTPS apenas (conferido nas configurações reais); HSTS e `Cache-Control: no-store` nas respostas da API (`CT-SEG-10`/`11`, adicionado nesta entrega); token de redefinição no fragmento da URL, que não vai ao servidor | A chave `AUTH_TOKEN_SECRET` e a chave do Brevo estão como **configuração da aplicação**, não no Key Vault (falta o papel de escrita no cofre, ADR-008). Criptografia em repouso do Azure SQL é a padrão da plataforma, não conferida por nós |
| A03 | Injeção | Consultas SQL sempre parametrizadas (`CT-SQL-10` prova que valores hostis não entram no texto SQL); toda entrada externa passa por esquema Zod; o React escapa texto; CSP `script-src 'self'` no site; e-mails montados só com números e com o token codificado | O e-mail de recuperação inclui HTML montado por texto; só recebe o token (codificado) e o endereço do app, sem dado do usuário |
| A04 | Projeto inseguro | Dados mínimos (sem CPF nem CNS); consentimento obrigatório antes de cadastrar pessoas (`CT-FAM-01`); regras de estado no servidor, nunca no cliente (atraso só pela rotina); pedido de recuperação responde sempre 202, sem revelar quais e-mails existem; lembrete por e-mail traz só quantidades | Diferença de tempo de resposta pode revelar e-mail cadastrado (risco residual aceito na ADR-015) |
| A05 | Configuração incorreta de segurança | CORS da API restrito ao endereço do app web (conferido); site com CSP, `X-Frame-Options: DENY`, `nosniff`; API agora com `nosniff`, HSTS e `no-store`; sem cabeçalho de versão do servidor além do `Server: Kestrel` da plataforma; segredos fora do repositório (GitGuardian no CI) | A regra `AllowAzureServices` do Azure SQL libera **qualquer** serviço do Azure (conferida em 07/10/2026); trocar por regra só da Function App (IP de saída ou rede privada) é melhoria pendente |
| A06 | Componentes vulneráveis e desatualizados | `npm audit` no CI: falha em severidade alta na API e no pacote compartilhado, e em crítica no restante; versões fixadas e registradas em `docs/tech-versions.md` | **Dependências Python do PLN não são auditadas** (sem `pip-audit` no CI) e não há Dependabot. A auditoria do app tolera falha (`|| true`) fora dos pacotes da API |
| A07 | Falhas de identificação e autenticação | Senha de 8 caracteres ou mais, com lista das mais comuns recusada (NIST SP 800-63B); bloqueio por e-mail e por origem após falhas repetidas; token de acesso de 15 minutos; token de renovação com rotação e **revogação de todos ao detectar reuso** (`CT-AUTH-*`); token de redefinição de uso único e validade de 60 minutos (`CT-RST-*`); mensagem de erro igual para e-mail inexistente e senha errada, com hash de uma senha falsa para o tempo de resposta não revelar a diferença | Sem autenticação em dois fatores. Sem confirmação de e-mail no cadastro (risco aceito, ADR-015). Limitadores em memória: valem por instância da Function App (ADR-010) |
| A08 | Falhas de integridade de software e dados | Entrega só pela `main`, por Actions com login federado (OIDC, sem senha guardada); migrações de banco versionadas e aplicadas à mão, com registro em `schema_migration`; calendário vacinal versionado com fonte | Sem SBOM nem assinatura de artefatos. Proteção de branch no GitHub **não conferida** neste levantamento |
| A09 | Falhas de registro e monitoramento | Logs sem dado pessoal por regra (só tipo do erro e contagens); rotina de lembretes registra só totais; Application Insights ligado à Function App | **Não há painéis nem alertas** (RNF05). Na consulta de 07/10/2026 a tabela de requisições do Application Insights veio **vazia**; é preciso conferir se a telemetria está chegando |
| A10 | Falsificação de requisição no servidor (SSRF) | A API só chama endereços fixos de configuração (Brevo, Azure AI Speech, PLN); nenhuma URL vem do usuário | Nenhuma conhecida |

### O que mudou no código por causa deste checklist

- Toda resposta da API (rotas autenticadas, de login e `health`) passou a levar `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` e `Strict-Transport-Security` (`apps/api/src/http.ts`, `withSecurityHeaders`). Um cabeçalho que o handler já definiu é mantido. Testes `CT-SEG-10` e `CT-SEG-11`; conferido com `curl` na API local.

### Recomendações, por prioridade

1. Investigar os **503 intermitentes** da API real (parte 2).
2. Acrescentar `pip-audit` ao job do PLN no CI (A06).
3. Mover `AUTH_TOKEN_SECRET` e a chave do Brevo para o Key Vault, quando o papel de escrita existir (A02).
4. Trocar a regra `AllowAzureServices` por uma regra específica (A05).
5. Criar alertas básicos no Application Insights e confirmar a chegada da telemetria (A09, RNF05).
6. Ligar o Dependabot e conferir a proteção da branch `main` (A06 e A08).

## Parte 2: carga leve (RNF01)

**Ferramenta:** `scripts/carga-leve.mjs`, sem dependência externa (usa o `fetch` do Node). Dispara requisições concorrentes por rota e calcula p50, p90, p95, máximo, percentual abaixo de 3 s e falhas. Exemplo: `node scripts/carga-leve.mjs --base http://localhost:7081/api --registrar`. O `--registrar` cria uma conta de teste e só deve ser usado em API **local ou de teste**.

### Resultado A: API local (Docker, dados em memória)

150 requisições por rota, 10 simultâneas, em 07/10/2026:

| Rota | p50 (ms) | p90 (ms) | p95 (ms) | máx (ms) | Abaixo de 3 s | Falhas |
|---|---|---|---|---|---|---|
| `GET /health` | 9 | 14 | 16 | 19 | 100% | 0 |
| `GET /members` | 10 | 15 | 18 | 21 | 100% | 0 |
| `GET /reminders` | 9 | 13 | 14 | 15 | 100% | 0 |
| `GET /consent` | 7 | 13 | 14 | 21 | 100% | 0 |

Isso mede o código da API, sem rede e sem banco. **Não** representa a produção.

### Resultado B: API real na Azure (somente `GET /health`)

Só a rota pública foi medida na produção; as rotas autenticadas não foram, porque exigiriam criar uma conta de teste no ambiente real. Três execuções em 07/10/2026, 100 requisições e 5 simultâneas cada:

| Execução | p50 (ms) | p90 (ms) | p95 (ms) | Abaixo de 3 s | Falhas |
|---|---|---|---|---|---|
| 1 | 99 | 195 | 203 | 98,0% | 2 (503) |
| 2 | 85 | 107 | 148 | 97,0% | 3 (503) |
| 3 | 40 | 74 | 93 | 96,0% | 1 (503) |

- **O critério de 90% abaixo de 3 s é atendido** na rota medida (96% a 98%).
- **Mas há falhas reais:** em cada rodada, de 1 a 3 requisições receberam **HTTP 503 depois de cerca de 60 segundos**, e outras poucas passaram de 3 s. Em 25 requisições sequenciais seguintes não houve falha; em outra sequência curta antes delas, uma de seis falhou. O problema aparece em rajadas e logo depois delas.
- **Causa não determinada.** Hipóteses, nenhuma confirmada: reinício ou troca da instância do plano Flex Consumption (a API está com zero instâncias sempre prontas e o `maximumInstanceCount` do modelo é 1); efeito da função agendada de lembretes, que acorda o host às 8h de Brasília; ou limite de concorrência do plano. Sem telemetria legível no Application Insights, não foi possível investigar a fundo.
- **Como investigar:** (a) conferir a telemetria (hoje vazia); (b) repetir a medição com o `sendDailyReminders` desabilitado, para isolar o efeito; (c) avaliar `alwaysReady` de 1 instância para a API, **que tem custo mensal e depende de aprovação do autor** (`docs/16-custos-azure.md`).

### Conclusão para o RNF01

Cumprido no que foi medido (código local e rota pública da produção), com **ressalva**: as falhas 503 intermitentes na produção precisam ser investigadas antes da apresentação, e as rotas autenticadas reais ainda não foram medidas.
