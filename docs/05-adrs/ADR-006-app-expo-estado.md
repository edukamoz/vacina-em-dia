# ADR-006: App com Expo, NativeWind e Expo Router; Context API e TanStack Query

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF01 a RF09, RNF04, RNF06, RNF09

## Contexto

O app precisa rodar em Android, iOS e web a partir de uma base de código única (RNF09), com acessibilidade WCAG 2.1 AA e público que inclui idosos (RNF04). O estado do app tem dois tipos bem diferentes: estado global leve (sessão e tema) e dados que vêm do servidor (membros, doses, calendário).

## Decisão

- **React Native com Expo**, em TypeScript estrito.
- **Expo Router** para navegação baseada em arquivos, que cobre mobile e web.
- **NativeWind** para estilos, com os tokens do design system (`docs/04-design-system.md`).
- **Context API** para **sessão e tema** apenas.
- **TanStack Query** para **dados do servidor** (cache, recarga, estados de carregamento e erro).
- Validação de formulários e respostas com os esquemas Zod compartilhados (ADR-007).
- Versões exatas ficam em `docs/tech-versions.md` (SCRUM-23).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Redux ou Zustand para tudo | Mistura cache de servidor com estado de interface; mais código para o mesmo resultado. |
| Apps nativos separados | Três bases de código para uma pessoa; contraria o RNF09. |
| Flutter | Fora da stack do curso e do restante do projeto em TypeScript. |
| Context API para dados do servidor | Sem cache, recarga nem controle de requisições; reimplementaria o TanStack Query. |

## Consequências

- Uma base de código para as três plataformas; diferenças (armazenamento de token e áudio) tratadas por camadas de abstração (ADR-009 e ADR-003).
- Context API não deve crescer: se surgir estado global além de sessão e tema, rever esta decisão.
- Recursos exclusivos de mobile precisam de plano para a web (por exemplo, `expo-secure-store` não funciona na web).
- Acessibilidade e áreas de toque são responsabilidade dos componentes do design system.

## Verificações e fontes

- Decisão de separar estado global leve e cache de servidor: Quadro 6 da Fase 0 e confirmação do autor em 06/10/2026.
- Documentação do Expo, a conferir ao fixar versões no SCRUM-23.
