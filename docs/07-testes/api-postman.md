# Vacina em Dia: testes de API com Postman

Material da atividade "Ambientes e ferramentas de teste" (Qualidade e Testes de Software). A coleção testa a API real do projeto: 8 pastas, 39 requisições e 59 testes automáticos. Ela fica em `postman/` e é gerada por `scripts/postman/gerar-colecao.mjs`.

## 1 O que existe

| Arquivo | Para quê |
|---|---|
| `postman/vacina-em-dia.postman_collection.json` | A coleção (requisições, testes `pm.test`, token e ids encadeados). |
| `postman/local.postman_environment.json` | Ambiente **local**: `base_url = http://localhost:7071/api` (Docker). |
| `postman/nuvem.postman_environment.json` | Ambiente **nuvem**: `base_url` da API publicada na Azure. |
| `scripts/postman/gerar-colecao.mjs` | Gera os três arquivos acima. Os testes ficam aqui, em texto legível. |
| `scripts/postman/executar-colecao.mjs` | Roda a mesma coleção no terminal, sem Postman (ver seção 5). |

## 2 Como rodar no Postman

1. Suba a API local (seção 4) ou use o ambiente `nuvem`.
2. No Postman: **Import** e escolha os três arquivos de `postman/`.
3. No canto superior direito, selecione o ambiente (**local** ou **nuvem**).
4. Clique na coleção, depois em **Run**, e rode tudo na ordem. A pasta 1 cria a conta de teste e guarda o token; as seguintes dependem dele; a pasta 7 apaga a conta.

Resultado esperado: 59 testes passando.

> **Ao reimportar:** o Postman guarda uma cópia da coleção. Depois de atualizar o repositório, apague a coleção antiga e importe de novo, senão você roda a versão velha.
>
> **Assistente na nuvem:** depois de um tempo parado, o serviço de PLN demora a acordar (treina o classificador) e a API, que espera 15 s por ele, responde 503 `ASSISTANT_UNAVAILABLE`. As duas requisições "Aquecer o assistente" da pasta 5 absorvem isso e aceitam 200 ou 503; se os testes seguintes ainda falharem com 503, rode a pasta 5 de novo.

> Se rodar a coleção várias vezes seguidas, o cadastro da pasta 1 passa a responder **429** (limite de uso, ADR-010) e o resto falha em cascata com 401. Espere a janela do limite passar ou, no ambiente local, reinicie a API (`docker restart vacina-em-dia-api-1`), que zera os contadores.
>
> As datas da coleção (`hoje` e `amanha`) são calculadas no fuso de São Paulo (UTC-3), o mesmo que a API usa para o dia civil. Em UTC, depois das 21h o "hoje" seria o dia seguinte e "Aplicar hoje" daria 422 (corrigido em 22/10/2026, achado ao rodar a coleção às 21h20).

> Cuidado com o ambiente **nuvem**: a coleção cria e depois apaga uma conta de teste de verdade no banco de produção. Se um teste falhar no meio, a conta pode ficar lá. Para ensaios, prefira o local.

## 3 O que cada pasta cobre

| Pasta | Requisito | Técnica das aulas |
|---|---|---|
| 0. Ambiente | RNF01 | Teste de fumaça; resposta em menos de 3 s. |
| 1. Conta e login | RF01, RNF02 | Partição de equivalência e valor limite (senha de 7 caracteres é inválida, 8 é válida), e-mail repetido, credencial errada, rota sem token (autorização). |
| 2. Consentimento | RF09, RNF03 | Regra de negócio: sem aceite, `POST /members` responde 403. |
| 3. Família e calendário | RF02, RF03, RNF10 | Classes válidas e inválidas de nome e data; fonte oficial e aviso presentes; membro de outro usuário ou inexistente responde 404. |
| 4. Ciclo de vida da dose | RF04 | Teste baseado em estados pela API: guardas de data (422), transição inválida (409), cancelar exige confirmação, T2, T3 e T8. |
| 5. Assistente | RF07, RNF10 | Resposta curada com fonte; pergunta de saúde individual é recusada pela regra de segurança. |
| 6. Lembretes, novidades e postos | RF05 | Leituras e ordenação por distância; parâmetro obrigatório ausente. |
| 7. Limpeza | RF09 | Exclusão de conta (204) e prova de que o login deixa de valer. |

## 4 Subindo a API local

```bash
docker compose up -d --build azurite api nlp
```

Sobem só o necessário para a API (o serviço `web` não é preciso para o Postman). Espere a API ficar `healthy` (`docker compose ps`) e confira em `http://localhost:7071/api/health`.

**Dois defeitos conhecidos do Docker local (22/10/2026), que derrubam só a pasta 7:** a exclusão de conta responde 500 porque o cliente de arquivos não alcança o Azurite no Compose (a cadeia `DevelopmentStorageProxyUri` é tratada como proxy HTTP pelo SDK, e o Azurite 3.37.0 recusa a versão de API que o SDK usa). Isso afeta também a foto de perfil no Docker local; na Azure, com a conta de armazenamento real, não se aplica. Enquanto o conserto não entra no repositório, use um `docker-compose.override.yml` local (não versionado) com a cadeia explícita do Azurite e `--skipApiVersionCheck`; com ele a coleção passa por inteiro. Sem ele, o Postman mostra 57 de 59 testes verdes e as duas falhas esperadas na pasta 7. O teste fez o que deveria: achou um defeito real.

## 5 Rodar sem o Postman

```bash
node scripts/postman/executar-colecao.mjs
node scripts/postman/executar-colecao.mjs --ambiente postman/nuvem.postman_environment.json
```

Reproduz o mesmo fluxo no terminal (sem instalar nada) e sai com código 1 se algum teste falhar. **Limite:** implementa só o pedaço de `pm.*` que a coleção usa; não é o motor do Postman. A verificação que vale para a atividade é o Runner do Postman. Estado verificado: a coleção foi executada com este script contra a API local (59 de 59 com a correção local do Azurite; 57 de 59 sem ela). **A importação no aplicativo do Postman não foi testada por mim**: faça um ensaio antes de apresentar.

## 6 Roteiro de 5 minutos

| Tempo | O que mostrar | O que dizer |
|---|---|---|
| 0:00 a 0:40 | Ambiente **local** selecionado; variável `base_url`. | Um ambiente de teste é uma configuração controlada para validar o sistema antes dos usuários reais. Com `{{base_url}}`, trocar local por nuvem muda **um** valor, não 39 requisições. |
| 0:40 a 1:40 | Pasta 1, requisição **Cadastrar conta (válida)**: abas Body e Tests. | O script da aba Tests usa `pm.test` (cria o teste), `pm.response` (a resposta do servidor) e `pm.expect` (a asserção). `pm.environment.set('access_token', ...)` guarda o token para as próximas requisições. |
| 1:40 a 3:20 | **Run** da coleção inteira. | Os testes são encadeados: conta, consentimento, membro, calendário, doses. 59 verdes. É o teste de regressão da API, repetível a qualquer mudança. |
| 3:20 a 4:20 | Dois testes de erro: **senha de 7 caracteres** (400) e **Aplicar de novo** (409). | Valor limite e classe inválida (caixa preta) e transição inválida da máquina de estados. A API responde sempre no mesmo formato de erro. |
| 4:20 a 5:00 | Pasta 2 (403 sem consentimento) e pasta 7 (exclusão). | Privacidade (LGPD) testada na API. Limite: a coleção cobre a API, a interface é testada com Playwright; o Postman roda hoje à mão, o CI roda os testes Jest e Playwright. |

### Respostas às questões do material

1. **O que é um ambiente de teste e por que importa?** Configuração controlada de hardware, software, dados e rede para validar o sistema antes de usuários reais; reduz risco de falha em produção e isola cada equipe.
2. **O que faz `pm.response.json()`?** Converte o corpo da resposta (texto JSON) num objeto JavaScript para ler campos, como `corpo.accessToken`.
3. **Para que serve `pm.environment.set()`?** Cria ou atualiza uma variável do ambiente ativo; é como o token e os ids passam de uma requisição para a seguinte.
4. **Por que `{{base_url}}` e não a URL completa?** Troca-se o servidor em um só lugar (local, nuvem), sem editar cada requisição.

## 7 Limites

- A coleção testa a API, não a interface (essa parte é do Playwright e do axe, ver `ponta-a-ponta-e-acessibilidade.md`).
- Não roda no pipeline: o CI hoje executa Jest, Playwright e o teste de fumaça do Docker. Rodar esta coleção no CI exigiria subir a API no job (ou o Newman); fica como decisão futura.
- Não cobre rotas que dependem de serviço externo real: voz (Azure Speech), e-mail e envio de foto.
- O ambiente `nuvem` toca no banco de produção (conta de teste criada e apagada).
