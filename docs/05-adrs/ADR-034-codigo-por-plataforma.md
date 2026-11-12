# ADR-034: Código de celular e código de web em arquivos separados

- **Status:** aceito em 12/11/2026 (decisão do autor: separar por arquivo, sem dividir o app em dois)
- **Relacionados:** ADR-001 (Expo), ADR-018 (mapa de postos), ADR-022 (leitura por foto), ADR-028 (avisos no aparelho)

## Contexto

O `apps/mobile` gera a **web** (PWA) e o **app instalável** (Android e iOS) com o mesmo código (Expo universal, `react-native-web`). Mais de 90% dos arquivos são iguais nas duas plataformas; só havia 7 arquivos com versão `.web`. O build web, porém, carregava código só de celular: medido em 12/11/2026, o pacote web trazia `expo-notifications`, `expo-text-extractor` e o módulo `expo-file-system` (que na web só avisa "não suportado"), sem usar nada disso.

## Decisão

1. **Um app só, com a plataforma decidida por arquivo.** Não dividimos em `apps/web` e `apps/mobile`: seria duplicar cerca de 160 arquivos (telas, hooks, formulários), dois testes, dois CI e dois deploys, sem ganho enquanto as telas forem as mesmas.
2. **Convenção de arquivos** (o Metro escolhe pela plataforma; o `tsc` só enxerga o arquivo sem sufixo):
   - `x.ts` ou `x.tsx` **sem sufixo**: versão do **celular** e padrão do código.
   - `x.web.ts` ou `x.web.tsx`: versão da **web**; o build web a usa no lugar da anterior.
   - `x.native.ts` também vale para código só do celular, quando não há `.web` correspondente.
   - O que as duas versões têm em comum (tipos, constantes, funções puras) vai num terceiro arquivo (`x-comum.ts`, `x-tipos.ts`) importado pelas duas.
3. **Bibliotecas só de celular** (`expo-notifications`, `expo-text-extractor`, `react-native-webview`, `expo-secure-store`, `expo-file-system`, `expo-sharing`) só podem ser importadas em arquivo `.native` ou em arquivo sem sufixo **que tenha um irmão `.web`**. **Bibliotecas só da web** (`react-dom`, `react-native-web`) só em arquivo `.web`.
4. **A regra é automática:** `eslint.config.mjs` descobre sozinho quais arquivos têm irmão `.web` e usa `no-restricted-imports`; o CI (lint) reprova a violação. Testes ficam fora da regra.
5. **A variante `.web` precisa exportar o mesmo que a do celular**, senão a tela quebra numa plataforma e passa na outra: `plataforma.test.ts` (`CT-PLAT-01` a `03`) compara as exportações.
6. **Bibliotecas que funcionam nas duas** (`expo-image-picker`, `expo-image-manipulator`, `expo-location`, `expo-clipboard`, `expo-audio`) não entram na regra; ficam fora porque a web as usa de verdade (foto de perfil, postos, copiar código, voz).

## Resultado medido

Mesma versão do app, `expo export --platform web`: o pacote caiu de 2.529.169 para **2.441.598 bytes** (−87,6 KB), e `expo-notifications`, `expo-text-extractor` e o módulo de arquivos saíram do pacote web. Os 7 arquivos `.web` que já existiam passam a valer pela mesma regra; foram 2 pares novos (`avisos-aparelho` e `ler-documento`).

## Consequências

- Para criar um recurso só de celular: escrever `x.ts` com a biblioteca, `x.web.ts` com um substituto simples (ou vazio) e, se precisar, `x-comum.ts` com o que é igual. A lista de exportações precisa bater (teste).
- A pasta ainda é `apps/mobile`, nome que engana. Renomear (por exemplo, `apps/app`) mexe em CI, Dockerfile e docs e fica para depois da apresentação.
- Se um dia a web ganhar telas realmente diferentes, a divisão em dois apps e um `packages/ui` volta a ser considerada.
