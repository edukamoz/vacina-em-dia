# APK do Android nas Releases do GitHub

Item B57. O workflow `.github/workflows/apk.yml` gera o APK do aplicativo e o publica nas **Releases** do repositório, sem ninguém abrir o Android Studio.

## Onde baixar

| O quê | Quando é atualizado | Onde |
|---|---|---|
| **APK mais recente** (pré-release `apk-latest`) | A cada push na `main` que mude o app (`apps/mobile`, `packages/shared`, `package.json`, `package-lock.json` ou o próprio workflow) e na execução manual | `https://github.com/edukamoz/vacina-em-dia/releases/tag/apk-latest` (arquivo `vacina-em-dia.apk`) |
| **Versão fixa** | Ao criar uma tag `v*`, por exemplo `v0.2.0` | Release com o nome da tag (arquivo `vacina-em-dia-v0.2.0.apk`) |

Cada release traz também o arquivo `.sha256` para conferir a integridade do download. A pré-release `apk-latest` é recriada a cada build (o endereço do arquivo não muda); as versões fixas ficam.

## Como instalar no celular

1. Abra a página da release no celular e baixe o `.apk`.
2. Ao abrir o arquivo, o Android pede para permitir a instalação de "fontes desconhecidas" para o navegador ou o gerenciador de arquivos; permita.
3. Instale e abra o **Vacina em Dia**. O app já aponta para a API publicada.

## Para onde o app aponta (o que evita o "não funciona depois de instalar")

O endereço da API é lido de `EXPO_PUBLIC_API_URL` **na hora do build** e fica gravado no pacote JavaScript do APK. Sem essa variável, o app usaria `http://localhost:7071/api` (o padrão de desenvolvimento), que no celular não existe. Por isso o workflow:

1. define `API_URL` com a mesma API do deploy (`https://func-vacinaemdia-vedia6398.azurewebsites.net/api`, também em `deploy.yml`) e a passa ao build como `EXPO_PUBLIC_API_URL`;
2. testa `GET /health` da API antes de compilar;
3. **abre o APK pronto e confere se o endereço está dentro do pacote**; se não estiver, o build falha e nada é publicado.

Mudou o endereço da API? Altere `API_URL` em `deploy.yml` **e** em `apk.yml`. A API aceita chamadas do app nativo sem CORS (o CORS vale só para a web).

## Como é gerado

`expo prebuild` cria o projeto Android (a pasta `apps/mobile/android` não é versionada), o número da versão (`versionCode`) é o número da execução do workflow, e `./gradlew assembleRelease` compila só as arquiteturas `arm64-v8a`, `armeabi-v7a` e `x86_64` (celulares e emulador). O JavaScript vai dentro do APK, então o app roda sem o servidor de desenvolvimento (Metro). A compilação leva cerca de 10 a 15 minutos; o cache do Gradle acelera as seguintes.

## Para criar uma versão fixa

```bash
git tag v0.2.0
git push origin v0.2.0
```

Ou use **Actions > APK do Android > Run workflow** para gerar um APK sem tag.

## Limites

- O APK é assinado com a **chave de depuração** do projeto Expo: serve para instalar direto no celular, mas **não serve para a Google Play** (que exigiria uma chave própria guardada como segredo do repositório). Atualizações por cima funcionam enquanto a chave for a mesma, o que vale para os builds do CI.
- Só Android. O iOS exigiria conta de desenvolvedor paga.
- O app instalado precisa de internet (o uso offline fica fora do escopo do projeto).
