# ADR-007: Monorepo com npm workspaces e pacote compartilhado (Zod)

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RNF06, RNF07, RNF08

## Contexto

O projeto é feito por uma pessoa, com app e API em TypeScript e um serviço de PLN em Python. Tipos, esquemas de validação e a máquina de estados da dose precisam ser iguais no app e na API. A entrega final exige uma pasta `doctos/` na raiz e um zip do repositório.

## Decisão

- **Um único repositório** com **npm workspaces**:
  - `apps/mobile` (Expo), `apps/api` (Azure Functions) e `packages/shared`.
  - `apps/nlp` (Python) fica no mesmo repositório, mas **não** é workspace npm.
- `packages/shared` contém tipos, **esquemas Zod** e o **domínio puro** (máquina de estados da dose, como função pura), sem dependência de rede nem de frameworks.
- Um único pipeline no GitHub Actions cobre tudo (instalação, lint, typecheck, build, testes com cobertura, TypeDoc e `npm audit`).
- Gerenciador de pacotes: **npm** (sem Yarn nem pnpm).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Vários repositórios | Contratos duplicados, vários pipelines e dificuldade de versionar tipos para uma pessoa só. |
| Nx ou Turborepo | Ferramenta extra sem necessidade para o tamanho do projeto. |
| pnpm ou Yarn workspaces | Sem ganho relevante; npm basta e reduz o que o autor precisa aprender. |

## Consequências

- Contrato único entre app e API; mudança de regra aparece no compilador dos dois lados.
- O Metro (bundler do Expo) com workspaces pode exigir configuração; tratar no SCRUM-23.
- O pacote `shared` precisa ser pequeno e livre de dependências de plataforma para ser usado no app e na Function.
- O serviço Python tem pipeline e ambiente próprios dentro do mesmo fluxo de CI.
- Estrutura e comandos estáveis conforme o `CLAUDE.md` §5 e §6.

## Verificações e fontes

- Quadro 6 da Fase 0 e `CLAUDE.md` §5.
