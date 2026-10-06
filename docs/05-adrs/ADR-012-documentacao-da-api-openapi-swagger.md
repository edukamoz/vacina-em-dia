# ADR-012: Documentação da API com OpenAPI gerado dos esquemas Zod e Swagger UI

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RNF06 (manutenibilidade), RNF02 (segurança)

## Contexto

A API é um conjunto de Azure Functions HTTP sem framework web (ADR-001). Não há documentação automática dos endpoints, e a documentação escrita à mão envelhece. O autor quer visualizar e testar os endpoints facilmente (Swagger) e usar isso na apresentação e na Documentação Técnica (seção de APIs). Toda entrada externa já passa por esquemas Zod compartilhados (ADR-007).

## Decisão

- **Especificação OpenAPI 3.1 gerada a partir dos esquemas Zod** do `packages/shared`, com a biblioteca `@asteasolutions/zod-to-openapi`. Os mesmos esquemas validam a entrada e descrevem o endpoint, então a documentação não diverge do código.
- Cada endpoint é **registrado** em um registro único da API (`apps/api/src/openapi/build-spec.ts`), com resumo e descrição em português, esquemas de requisição e resposta, exemplos e **todos os códigos de resposta que o endpoint realmente devolve**. Os códigos 401, 403 e 429 passam a constar quando existirem login e limitação de taxa (SCRUM-13); documentá-los antes seria afirmar algo que a API não faz.
- A API publica `GET /api/openapi.json` (a especificação) e `GET /api/docs` (**Swagger UI**), que carrega os arquivos da interface de uma CDN com versão fixa e verificação de integridade (SRI), para não aumentar o pacote implantado. A página usa uma política de segurança (CSP) que só autoriza o script inline pelo hash e os arquivos dessa CDN.
- A exposição é controlada pela variável de configuração `DOCS_ENABLED`. Fica ligada nos ambientes local e de demonstração; a especificação não contém segredos nem dados pessoais.
- Um **teste automático** lê as funções HTTP de `src/functions` e garante que cada rota está na especificação (e que a especificação não documenta rota inexistente). A página `/docs` é a única exceção, por ser HTML.
- Os esquemas do `packages/shared` levam `.meta({ id, example })` do próprio Zod 4; o `id` vira componente nomeado (`#/components/schemas/Dose`). Isso evita aplicar `extendZodWithOpenApi`, que em Zod 4 não alcança esquemas criados antes da chamada.
- Quando o login entrar (SCRUM-13), a especificação ganha o esquema de segurança Bearer (token do Entra) e o Swagger UI passa a aceitar o token para testar os endpoints protegidos.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Escrever o `openapi.yaml` à mão | Diverge do código com o tempo; trabalho duplicado em relação aos esquemas Zod. |
| Extensão OpenAPI das Azure Functions | Existe para .NET, Java e Python; não há suporte oficial equivalente para Node.js com TypeScript. |
| Apenas JSON Schema nativo do Zod, com as rotas montadas à mão | Funciona, mas sem a camada de caminhos, parâmetros e respostas; ficaria código próprio a manter. |
| Servir o Swagger UI empacotando `swagger-ui-dist` na Function | Aumenta o pacote e a partida a frio; a CDN com versão fixa e integridade resolve sem esse custo. |
| Postman (coleção) | Boa para teste manual, mas é outra ferramenta; o OpenAPI importa em Postman se for preciso. |

## Consequências

- Uma dependência nova (`@asteasolutions/zod-to-openapi`, compatível com Zod 4). Versão exata em `docs/tech-versions.md`.
- A página `/api/docs` depende de uma CDN no navegador de quem a abre; a especificação em `/api/openapi.json` funciona sem ela e pode ser importada em outras ferramentas.
- A especificação vira a fonte da seção de APIs da Documentação Técnica (SCRUM-34).
- Em produção, avaliar desligar `DOCS_ENABLED` ou protegê-lo depois da demonstração.
- Regra de trabalho registrada no `CLAUDE.md`: endpoint sem registro na especificação não está pronto (definição de pronto).

## Verificações e fontes

- Implementado e verificado em 06/10/2026: API real respondendo às 6 rotas, Swagger UI carregando no navegador sem erro de SRI nem de CSP.

- Zod 4: `z.toJSONSchema` disponível e verificado em 06/10/2026 na versão 4.6.5.
- `@asteasolutions/zod-to-openapi` 9.1.0, peer dependency `zod ^4.0.0`, conferido no npm em 06/10/2026.
- Swagger UI (`swagger-ui-dist`) 5.33.1, conferido no npm em 06/10/2026.
