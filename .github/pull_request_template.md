## Item do Jira

SCRUM-__ (link: https://vacinaemdia.atlassian.net/browse/SCRUM-__)

## Resumo

<!-- Em 2 a 4 linhas: o que muda para quem usa o app e por quê. Linguagem simples. -->

## O que mudou

<!-- Lista curta, por camada. Apague as linhas que não se aplicam. -->

- **Domínio e esquemas (`packages/shared`):**
- **API (`apps/api`):**
- **App (`apps/mobile`):**
- **PLN (`apps/nlp`):**
- **Banco e infraestrutura (`infra`, migrações):**
- **Documentação e ADR:**

## Como verificar

<!-- Passo a passo para quem for conferir: comandos e o caminho pelas telas. -->

1.
2.

## Testes

<!-- Resultado real, copiado da execução. Não escreva "passou" sem ter rodado. -->

| Verificação | Resultado |
|---|---|
| `npm run lint` | |
| `npm run format:check` | |
| `npm run typecheck` | |
| `npm run test:coverage` (cobertura mínima 80%) | |
| `pytest` em `apps/nlp` (se mexeu no PLN) | |
| Conferido no navegador ou no emulador | |

Casos de teste (IDs `CT-...`) novos ou alterados:

## Atenção antes de publicar

<!-- Migração de banco a aplicar antes do deploy, variável de configuração nova, segredo, ordem de mesclagem
     com outras branches. Escreva "Nada" se não houver. -->

## Pendências e limites

<!-- O que NÃO foi feito, o que não deu para verificar (por exemplo, celular real, leitor de tela, tema Escuro)
     e decisões que dependem do autor. -->

## Definição de pronto (`CLAUDE.md`, seção 16)

- [ ] Atende aos critérios de aceite do item no Jira
- [ ] Testes escritos e passando, incluindo erros e valores limite; cobertura sem cair abaixo do limite
- [ ] `lint`, `typecheck` e `build` limpos; pipeline verde
- [ ] TSDoc nos símbolos exportados novos
- [ ] Endpoints novos ou alterados registrados no OpenAPI/Swagger
- [ ] Sem segredo, dado pessoal ou log sensível; regras de segurança e LGPD respeitadas
- [ ] Acessibilidade conferida nas telas afetadas (contraste, área de toque, rótulos)
- [ ] Documentação e, se houver decisão nova, ADR atualizados
- [ ] Commits com a chave `SCRUM-n`

## Capturas de tela

<!-- Antes e depois, em tamanho de celular e de computador, quando houver mudança visual. -->
