# Vacina em Dia

Carteira de vacinação digital com lembretes e assistente por voz. Aplicativo multiplataforma (Android, iOS e web) para famílias organizarem o calendário vacinal de seus membros, registrarem doses, receberem lembretes e tirarem dúvidas por **busca por voz** e por um **chatbot** de intenções. Roda na **Microsoft Azure**.

Projeto Interdisciplinar VI (PI-VI) da Fatec Votorantim, curso de Desenvolvimento de Software Multiplataforma. Atende aos ODS 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades).

> **Aviso:** o app não substitui a caderneta oficial de vacinação nem a orientação de profissionais de saúde. O calendário vem do PNI (Ministério da Saúde), com fonte e versão indicadas.

## Estado atual

Fase inicial de construção. Já existem o monorepo com qualidade configurada, a **máquina de estados da dose** (com testes dos casos de teste do `docs/07-testes`), uma API mínima (`/api/health`) e o esqueleto do app Expo. O estado detalhado e os próximos passos estão em [`docs/00-handoff.md`](docs/00-handoff.md).

## Como rodar

Requer Node 22.13 ou mais novo; o projeto usa o Node 24 LTS (veja `.nvmrc`).

```bash
npm install            # instala todos os workspaces
npm run build          # compila shared, API e exporta a versão web do app
npm test               # testes (Jest)
npm run test:coverage  # testes com cobertura (mínimo de 80%)
npm run lint           # ESLint
npm run typecheck      # TypeScript estrito
npm run docs           # documentação do código (TypeDoc), gerada em docs/api
npm run dev:mobile     # app Expo (celular e web)
npm run dev:api        # API local (Azure Functions Core Tools)
```

Para a API local, copie `apps/api/local.settings.example.json` para `apps/api/local.settings.json`.

Com a API no ar (`npm run dev:api`), a documentação interativa (Swagger UI) fica em http://localhost:7071/api/docs e a especificação OpenAPI em http://localhost:7071/api/openapi.json. Ela só responde com `DOCS_ENABLED=true` (já ligado no arquivo de exemplo).

## Escopo

- **MVP (RF01 a RF09):** cadastro e login, membros da família, calendário vacinal por faixa etária, registro e ciclo de vida das doses, lembretes, busca por voz, chatbot, histórico, consentimento e exclusão de dados.
- **Versão completa (RF10 a RF12):** mapa de UBS, exportar PDF e compartilhar com cuidador, apenas se o cronograma permitir.

## Tecnologias

React Native com Expo e TypeScript no app; Azure Functions (Node.js) na API; Azure Function em Python (scikit-learn, TF-IDF + SVM) no chatbot; Azure AI Speech, Azure SQL, Key Vault, Application Insights e Entra External ID; Jest e pytest nos testes; GitHub Actions e Docker. A lista completa e as versões exatas ficam em [`docs/tech-versions.md`](docs/tech-versions.md).

## Estrutura de pastas

Monorepo único. Itens marcados com (planejado) ainda não existem.

```
vacina-em-dia/
├── CLAUDE.md             # regras de trabalho do projeto
├── README.md
├── docs/                 # documentação-fonte (visão, requisitos, UML, testes)
├── doctos/               # (planejado) documentações finais e panfleto
├── apps/
│   ├── mobile/           # Expo: Android, iOS e web
│   ├── api/              # Azure Functions em TypeScript
│   └── nlp/              # (planejado) Azure Function em Python: chatbot e intenções
└── packages/
    └── shared/           # tipos, esquemas Zod e domínio puro (máquina de estados da dose)
```

## Como contribuir

1. Leia [`CLAUDE.md`](CLAUDE.md) e [`docs/00-handoff.md`](docs/00-handoff.md).
2. Trabalhe **um item do Jira (projeto SCRUM) por vez**, na ordem da sprint ativa.
3. Crie uma branch por item: `feature/SCRUM-<n>-descricao-curta`, `fix/SCRUM-<n>-...` ou `docs/SCRUM-<n>-...`.
4. Faça commits pequenos no padrão Conventional Commits, em português, citando a chave do Jira:
   `feat(api): registrar aplicação de dose (SCRUM-18)`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
5. Escreva os testes junto com o código. O pipeline exige 100% dos testes passando e cobertura mínima de 80%.
6. Nunca versione segredos, dados pessoais reais ou arquivos gerados. Use `.env.example` sem valores reais.
7. Abra PRs pequenos referenciando o item do Jira. Atualize a documentação (e crie um ADR, se houver decisão técnica) junto com a mudança.

## Licença

[MIT](LICENSE).
