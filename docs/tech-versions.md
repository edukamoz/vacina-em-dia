# Tecnologias e versões

Item do Jira: SCRUM-23. A Documentação Técnica exige as versões. Todas foram **conferidas no registro do npm em 06/10/2026** (`npm view`) e fixadas nos `package.json` (sem `^`, exceto onde o Expo recomenda `~`). Atualize este arquivo sempre que uma versão mudar.

## Ambiente

| Tecnologia | Versão | Observação |
|---|---|---|
| Node.js | 24.21.0 LTS (mínimo 22.13.0) | `.nvmrc` (24) e `engines`. O Azure Functions v4 suporta Node 22 e 24; o Node 20 saiu de suporte em abril de 2026. Migração testada em 06/10/2026 (lint, tipos, build, testes, TypeDoc, API local, web do Expo e `npm audit`) |
| npm | 11.19.0 | gerenciador, com workspaces |
| Docker | 29.7.2 | contêineres (SCRUM-25) |
| Python | 3.13 (Azure Functions, CI e Docker); 3.14.7 no computador de desenvolvimento | serviço de PLN (SCRUM-21). O Flex Consumption da Azure oferece 3.10 a 3.14 (consulta de 07/10/2026) |

## App (`apps/mobile`)

| Tecnologia | Versão | Observação |
|---|---|---|
| Expo (SDK) | 57.0.27 | Android, iOS e web |
| expo-router | 57.0.25 | navegação por arquivos |
| React | 19.2.3 | **fixada** por `overrides` na raiz, para existir uma só cópia (versão do SDK 57) |
| React DOM | 19.2.3 | idem |
| React Native | 0.86.3 | versão do SDK 57 (a mais nova do npm é 0.87.1, mas o Expo recomenda a 0.86.3) |
| React Native Web | 0.21.3 | versão web |
| react-native-safe-area-context | 5.7.0 | |
| react-native-screens | 4.26.2 | |
| expo-linking / expo-constants / expo-status-bar | 57.0.12 / 57.0.21 / 57.0.1 | |
| @expo/metro-runtime | 57.0.16 | |
| NativeWind | 4.2.7 | estilos com classes no app (Android, iOS e web) |
| Tailwind CSS | 3.4.19 | o NativeWind 4 exige a série 3.4 (a 4.x ainda não é suportada) |
| react-native-reanimated / react-native-worklets | 4.5.1 / 0.10.1 | exigidos pelo NativeWind; versões do SDK 57 |
| expo-font | 57.0.4 | carrega a fonte |
| @expo-google-fonts/atkinson-hyperlegible | 0.4.1 | fonte Atkinson Hyperlegible (regular e negrito) |
| Docker / Compose (testado) | 29.7.2 / 5.4.0 | `docker compose up --build` |
| mcr.microsoft.com/azure-functions/node | 4-node24 | host oficial das Functions no contêiner da API (só `linux/amd64`) |
| mcr.microsoft.com/azure-storage/azurite | 3.37.0 | emulador do Armazenamento do Azure |
| node (imagem de build) / nginx | 24.21.0-slim / 1.31.6-alpine | compilam o app e servem o app web |
| @tanstack/react-query | 5.104.1 | dados do servidor no app (ADR-006) |
| jest-expo / @testing-library/react-native / test-renderer | 57.0.5 / 14.0.1 / 1.3.0 | testes do app (o RNTL 14 usa o `test-renderer`) |

## API (`apps/api`)

| Tecnologia | Versão | Observação |
|---|---|---|
| @azure/functions | 4.16.5 | modelo de programação v4, Node.js e TypeScript, sem Express (ADR-001) |
| Azure Functions Core Tools | 4.15.2 | `func`, instalado como dependência de desenvolvimento |

## Compartilhado e qualidade

| Tecnologia | Versão | Observação |
|---|---|---|
| TypeScript | 6.0.3 | modo estrito. A 7.0.2 é a mais nova do npm, mas `typescript-eslint`, `typedoc` e `ts-jest` ainda não a suportam; usar a 6.0.x |
| Zod | 4.6.5 | esquemas compartilhados (app, API e documentação) |
| @asteasolutions/zod-to-openapi | 9.1.0 | gera o OpenAPI 3.1 dos esquemas Zod (ADR-012) |
| Swagger UI (`swagger-ui-dist`) | 5.33.1 | página `/api/docs`, carregada da CDN jsDelivr com a versão fixa e verificação de integridade (SRI sha384); não é dependência do projeto |
| Jest | 30.5.2 | testes e cobertura (limite de 80% por pacote) |
| ts-jest | 29.4.14 | |
| @types/jest / @types/node | 30.0.0 / 24.19.1 | tipos de Node alinhados ao Node 24 |
| ESLint / @eslint/js | 10.12.0 / 10.0.1 | configuração plana em `eslint.config.mjs` |
| typescript-eslint | 8.71.1 | |
| eslint-config-prettier | 10.1.8 | |
| Prettier | 3.9.9 | |
| Husky | 9.1.7 | ganchos do Git (lint e typecheck antes do commit) |
| commitlint (cli e config-conventional) | 21.2.3 | Conventional Commits |
| TypeDoc | 0.28.20 | `npm run docs` gera `docs/api` (ignorado pelo Git) |

## Decisões de versão

- **TypeScript 6.0.x em vez da 7:** as ferramentas de lint, documentação e teste ainda não suportam a 7. Revisar quando suportarem.
- **React e React Native seguem o Expo:** o SDK define as versões compatíveis; usar `npx expo install` para atualizar.
- **Uma só cópia do React** (`overrides` no `package.json` da raiz): duas versões causam o erro "Invalid hook call".

## Riscos conhecidos de dependências (`npm audit`)

Em 06/10/2026, o `npm audit` apontou vulnerabilidades somente na cadeia de **ferramentas de build do Expo e do Metro** (por exemplo `braces`, `micromatch` e `node-forge`), que **não vão dentro do aplicativo publicado**. As correções que o `npm` sugere são retrocessos absurdos (por exemplo, `expo@44`), então não foram aplicadas. A API e o pacote compartilhado, que rodam na nuvem, têm **0 vulnerabilidades**. O CI (SCRUM-24) deve:

- falhar em qualquer vulnerabilidade **alta ou crítica** em `apps/api` e `packages/shared`;
- falhar em vulnerabilidade **crítica** no app, e listar as altas para acompanhamento.

Reavaliar a cada atualização do Expo.

## Serviço de PLN (Python, `apps/nlp`)

Versões conferidas no PyPI (`pip index versions`) em 07/10/2026 e fixadas em `apps/nlp/requirements*.txt`.

| Pacote | Versão | Uso |
|---|---|---|
| scikit-learn | 1.9.1 | TF-IDF, SVM e calibração (classificador de intenções e busca) |
| numpy | 2.5.3 | dependência do scikit-learn |
| scipy | 1.18.1 | dependência do scikit-learn |
| joblib | 1.6.0 | dependência do scikit-learn |
| threadpoolctl | 3.7.0 | dependência do scikit-learn |
| azure-functions | 2.3.0 | modelo de programação Python v2 |
| pytest | 9.1.1 | testes (somente desenvolvimento) |
| pytest-cov | 7.1.0 | cobertura (somente desenvolvimento) |
| mcr.microsoft.com/azure-functions/python | 4-python3.13 | host oficial das Functions no contêiner do PLN (só `linux/amd64`) |


## Acesso ao Azure SQL (SCRUM-15, conferido no npm em 07/10/2026)

| Tecnologia | Versão | Observação |
|---|---|---|
| mssql | 12.7.4 | Cliente do SQL Server/Azure SQL na API (`apps/api`) |
| @types/mssql | 12.3.0 | Tipos (desenvolvimento) |
| tedious (dependência do mssql) | 20.3.3 | Protocolo TDS; traz o `@azure/identity` 4.13.3 para a autenticação Entra |

## Login no app (SCRUM-13, conferido em 07/10/2026)

| Tecnologia | Versão | Observação |
|---|---|---|
| expo-secure-store | ~57.0.4 | Token de sessão no celular (Keychain e Keystore), conforme a ADR-009 |
| react-native-svg | 15.15.4 | Marca do Vacina em Dia nas telas de entrada (versão indicada pelo `expo install`) |
