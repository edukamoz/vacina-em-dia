# Vacina em Dia

Carteira de vacinação digital com lembretes e assistente por voz. Aplicativo multiplataforma (Android, iOS e web) para famílias organizarem o calendário vacinal de seus membros, registrarem doses, receberem lembretes e tirarem dúvidas por **busca por voz** e por um **chatbot** de intenções. Roda na **Microsoft Azure**.

Projeto Interdisciplinar VI (PI-VI) da Fatec Votorantim, curso de Desenvolvimento de Software Multiplataforma. Atende aos ODS 3 (Saúde e Bem-Estar) e 10 (Redução das Desigualdades).

> **Aviso:** o app não substitui a caderneta oficial de vacinação nem a orientação de profissionais de saúde. O calendário vem do PNI (Ministério da Saúde), com fonte e versão indicadas.

## Estado atual

Fase de planejamento: por enquanto o repositório contém **apenas documentação**. O código de aplicação ainda não existe. O estado detalhado e os próximos passos estão em [`docs/00-handoff.md`](docs/00-handoff.md).

## Escopo

- **MVP (RF01 a RF09):** cadastro e login, membros da família, calendário vacinal por faixa etária, registro e ciclo de vida das doses, lembretes, busca por voz, chatbot, histórico, consentimento e exclusão de dados.
- **Versão completa (RF10 a RF12):** mapa de UBS, exportar PDF e compartilhar com cuidador, apenas se o cronograma permitir.

## Tecnologias previstas

React Native com Expo e TypeScript no app; Azure Functions (Node.js) na API; Azure Function em Python (scikit-learn, TF-IDF + SVM) no chatbot; Azure AI Speech, Azure SQL, Key Vault, Application Insights e Entra External ID; Jest e pytest nos testes; GitHub Actions e Docker. A lista completa e as versões ficam em `docs/tech-versions.md` (a criar junto com o setup).

## Estrutura de pastas

Monorepo único. Itens marcados com (planejado) ainda não existem.

```
vacina-em-dia/
├── CLAUDE.md             # regras de trabalho do projeto
├── README.md
├── docs/                 # documentação-fonte (visão, requisitos, UML, testes)
├── doctos/               # (planejado) documentações finais e panfleto
├── apps/
│   ├── mobile/           # (planejado) Expo: Android, iOS e web
│   ├── api/              # (planejado) Azure Functions em TypeScript
│   └── nlp/              # (planejado) Azure Function em Python: chatbot e intenções
└── packages/
    └── shared/           # (planejado) tipos, esquemas Zod e domínio puro
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
