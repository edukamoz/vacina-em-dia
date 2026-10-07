# Vacina em Dia

Carteira de vacinação digital com lembretes e assistente por voz. Aplicativo multiplataforma (Android, iOS e web) para famílias organizarem o calendário vacinal de seus membros, registrarem doses, receberem lembretes e tirarem dúvidas por **busca por voz** e por um **chatbot** de intenções. Roda na **Microsoft Azure**.

Projeto Interdisciplinar VI (PI-VI) da Fatec Votorantim, curso de Desenvolvimento de Software Multiplataforma. Atende aos ODS 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades).

> **Aviso:** o app não substitui a caderneta oficial de vacinação nem a orientação de profissionais de saúde. O calendário vem do PNI (Ministério da Saúde), com fonte e versão indicadas.

## Estado atual

Em construção para a entrega de 19/11/2026. Já funcionam: login próprio com recuperação de senha, família, calendário vacinal oficial (PNI 2026), ciclo de vida das doses, consentimento e exclusão de dados, chatbot e busca por voz, deploy na Azure e testes automatizados. O estado detalhado e os próximos passos estão em [`docs/00-handoff.md`](docs/00-handoff.md).

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

### Tudo em contêineres (um comando)

Requer o Docker (Docker Desktop ou Docker Engine com Compose). Na raiz do projeto:

```bash
docker compose up --build
```

Sobe quatro serviços: o **Azurite** (emulador local do Armazenamento do Azure), a **API** e o **PLN** (chatbot e busca; hosts oficiais do Azure Functions) e o **app web**. Quando terminar de iniciar:

- App web: http://localhost:8080 (o nginx repassa `/api` para a API, então não há CORS)
- API: http://localhost:7071/api/health e Swagger em http://localhost:7071/api/docs
- PLN: http://localhost:7072/api/health

Crie uma conta na tela inicial para entrar (o login funciona no ambiente local; os dados ficam **em memória** e somem ao reiniciar a API). A pergunta por voz e o e-mail de recuperação de senha ficam desligados localmente (precisam de chaves do Azure AI Speech e do Brevo).

Para parar, `Ctrl+C` e depois `docker compose down` (use `docker compose down -v` para apagar também os dados do Azurite). As portas só aceitam conexões do próprio computador e mudam com `API_PORT`, `NLP_PORT` e `WEB_PORT` se estiverem em uso. Manutenção, configuração, atualização de versões e solução de problemas: [`docs/17-docker-manutencao.md`](docs/17-docker-manutencao.md).

Em Mac com Apple Silicon, a imagem oficial do host das Functions só existe para `amd64` e roda emulada, então a primeira subida é mais lenta.

### Modo desenvolvimento (sem contêiner)

O app busca as doses na API; suba a API antes (`npm run dev:api`) e o app depois (`npm run dev:mobile`). O endereço da API vem de `EXPO_PUBLIC_API_URL` (copie `.env.example` para `apps/mobile/.env` se precisar mudar; o padrão é `http://localhost:7071/api`, que serve para a web e para o simulador de iOS). No emulador de Android use `http://10.0.2.2:7071/api`. No celular real, suba a API com `npm run dev:api:rede` (ela passa a aceitar conexões da rede local, só com dados fictícios) e use o IP do computador. Reinicie o Expo depois de mudar a variável.

Com a API no ar (`npm run dev:api`), a documentação interativa (Swagger UI) fica em http://localhost:7071/api/docs e a especificação OpenAPI em http://localhost:7071/api/openapi.json. Ela só responde com `DOCS_ENABLED=true` (já ligado no arquivo de exemplo).

## Escopo

- **MVP (RF01 a RF09):** cadastro e login, membros da família, calendário vacinal por faixa etária, registro e ciclo de vida das doses, lembretes, busca por voz, chatbot, histórico, consentimento e exclusão de dados.
- **Versão completa (RF10 a RF12):** mapa de UBS, exportar PDF e compartilhar com cuidador, apenas se o cronograma permitir.

## Tecnologias

React Native com Expo e TypeScript no app; Azure Functions (Node.js) na API; Azure Function em Python (scikit-learn, TF-IDF + SVM) no chatbot; Azure AI Speech, Azure SQL (inclui as contas do login próprio), Key Vault e Application Insights; Jest e pytest nos testes; GitHub Actions e Docker. A lista completa e as versões exatas ficam em [`docs/tech-versions.md`](docs/tech-versions.md).

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
