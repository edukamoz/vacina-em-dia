# ADR-018: Mapa de postos de saúde com dados oficiais e funcionamento sem internet (RF10)

- **Status:** aceito em 08/10/2026 (decisão do autor)
- **Item do Jira:** SCRUM-32 (redesenho) e RF10 (versão completa, pedido explícito do autor)
- **Relacionados:** ADR-010 (limite de uso), `docs/18-termos-e-privacidade.md`.

## Contexto

O RF10 (localizar unidades de saúde em mapa) estava na versão completa e foi pedido pelo autor. Os dados vacinais e de locais **não podem ser inventados** (`CLAUDE.md`, seção 8): precisam vir de fonte oficial. Foram verificadas duas fontes do Ministério da Saúde:

1. **Arquivo "Unidades Básicas de Saúde (UBS)"** do portal de dados abertos (CSV de 1,9 MB, atualizado em 07/10/2026): código CNES, UF, município (IBGE), nome, logradouro, bairro, latitude e longitude. **Não** traz telefone, horário nem se há sala de vacina.
2. **API de dados abertos do Ministério da Saúde** (`apidadosabertos.saude.gov.br/cnes/estabelecimentos`): filtra por município e tipo de unidade e traz também telefone, turno de atendimento, número do endereço e data de atualização. Devolve no máximo 20 registros por página e **não libera CORS**, então só um servidor consegue chamá-la.

Nenhuma das duas diz **quais unidades têm sala de vacina**. O cadastro de salas de vacina no CNES tem inconsistências conhecidas (nota da COSEMS-SC, 2020), e o conjunto "UBS" não separa essa informação.

## Decisão

1. **Arquivo local versionado (base que sempre funciona):** `apps/api/src/data/ubs.json`, gerado por `scripts/importar-ubs.mjs` a partir do CSV oficial. Ficam 45.588 unidades das 47.986 do arquivo; saem as **sem coordenada** (1.921), as de **coordenada imprecisa** (menos de 3 casas decimais, erro de mais de 100 m: 476) e uma sem nome. Registra fonte, editor, licença e a data da versão. Para atualizar, baixe o CSV novo e rode o script.
2. **API do Vacina em Dia:** `GET /api/units/nearby?lat&lon&radiusKm&limit` (autenticada, limite de 60 buscas a cada 10 minutos por conta). Filtra o arquivo local por caixa e distância (haversine) e devolve da mais perto para a mais longe.
3. **Atualização quando há internet:** a API consulta a API oficial pelos municípios das unidades devolvidas (no máximo 3, tipos 2 e 1), com tempo máximo de 4 s, e acrescenta **telefone, turno e número do endereço**. O resultado de cada município é guardado em memória por 12 horas. Se a API oficial falhar ou demorar, a resposta sai só com o arquivo local (`source.live = false`). **A posição da pessoa nunca vai para a API oficial**; só o código do município.
4. **Offline primeiro no app:** o app guarda no aparelho a última lista recebida e a mostra na hora, com "dados salvos em dd/mm"; com internet, busca a lista atual. Sem internet, reordena a lista guardada pela posição atual. O mapa em si (imagens de ruas) precisa de internet; a lista funciona sempre.
5. **Texto honesto:** toda resposta e toda tela dizem que a lista traz **unidades básicas de saúde**, que **nem todas têm sala de vacina** e que é preciso ligar antes de ir. O app não afirma que há a vacina X na unidade.
6. **Mapa:** Leaflet com mapas do OpenStreetMap (sem chave de API), na web direto no navegador e no celular dentro de uma `WebView`. Evita a chave do Google Maps no Android. Atribuição "© colaboradores do OpenStreetMap" sempre visível.

## Privacidade (LGPD)

- A posição é dado pessoal. O app só pede a localização **quando a pessoa toca em "Usar minha localização"** e explica para quê. A permissão é "durante o uso", sem segundo plano.
- A API **não guarda** a posição e **não a registra em log** (os testes conferem que o log de falhas não contém coordenadas). O que o app guarda no aparelho é a lista de unidades e a data, não a posição.
- A API oficial recebe só o código IBGE do município.

## Consequências

- **Dependências novas no app** (aprovadas pelo autor em 08/10/2026): `expo-location`, `react-native-webview`, `leaflet` e `@react-native-async-storage/async-storage`. Versões em `docs/tech-versions.md`.
- **Licença:** o portal de dados abertos do Ministério da Saúde publica sob Creative Commons Atribuição-SemDerivações 3.0. O app **filtra e exibe** os dados sem alterá-los (nomes recebem só acentos e caixa), cita a fonte e a data. Fica como ponto a confirmar com o professor se a limpeza de nomes conta como "derivação".
- **Dados envelhecem:** o arquivo local tem a data da versão e a API oficial cobre telefone e turno; endereço e coordenadas só mudam com nova importação.
- **Tamanho:** o arquivo tem cerca de 5 MB (1,3 MB compactado no Git) e é lido uma vez por instância (cerca de 200 ms na partida).
- **Sem serviço Azure novo** e sem custo: a consulta à API oficial sai da função da API.
- **Limite honesto:** o comportamento da API oficial em grande volume (municípios com centenas de unidades levam muitas páginas de 20) não foi medido; o tempo máximo de 4 s protege a resposta, e o cache de 12 horas evita repetir a consulta.

## Alternativas consideradas

- **Só a API oficial ao vivo:** sempre atual, mas sem internet ou com a API fora do ar o mapa não funcionaria, e a API não filtra por distância. Rejeitada como única fonte.
- **App consulta a API oficial direto:** bloqueado por CORS na web e expõe a posição a terceiros. Rejeitada.
- **Google Maps (`react-native-maps`):** exige chave de API no Android, com cobrança por uso. Rejeitada em favor de Leaflet e OpenStreetMap.
- **Dados do OpenStreetMap:** cobertura irregular e sem garantia oficial. Rejeitada para a lista de unidades.
