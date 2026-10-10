# Assistente: chatbot e busca (RF06 e RF07, SCRUM-20 e SCRUM-21)

Serviço em `apps/nlp` (Azure Function em Python, ADR-002). **Sem IA generativa**: toda resposta é escrita à mão ou montada com dados do Calendário Nacional de Vacinação 2026.

## Como uma pergunta é respondida

1. **Texto vazio** ou sem letras: pede para repetir.
2. **Regras de segurança** (`vacina_nlp/safety.py`): sintoma, reação, remédio, "posso tomar...", emergência. A pergunta **não passa pelo modelo**: o assistente diz que não dá orientação médica, manda procurar um profissional ou a unidade de saúde e cita o SAMU (192). O nome "febre amarela" não dispara a regra de febre.
3. **Classificador de intenções** (TF-IDF + SVM): 20 intenções. Confiança abaixo do limiar (0,40) devolve a **resposta padrão**, que orienta procurar um profissional ou uma unidade de saúde. Se a pergunta cita uma vacina, o assistente explica a vacina em vez de dizer que não entendeu.
4. **Resposta**: curada. Para "para que serve", "quando toma" e "vacinas do grupo", o texto é montado a partir das linhas do calendário oficial (doenças evitadas, dose e momento) e **sempre cita a fonte e a versão**.

### Intenções

| Grupo | Intenções |
|---|---|
| Conversa | `saudacao`, `despedida_agradecimento`, `ajuda_o_que_faz` |
| Uso do app | `como_adicionar_pessoa`, `como_registrar_dose`, `como_agendar_dose`, `significado_atrasada`, `significado_estados`, `como_cancelar_dose`, `como_ver_historico`, `como_excluir_dados`, `privacidade_dados`, `fonte_calendario`, `como_usar_voz`, `lembretes` |
| Calendário oficial | `vacina_para_que_serve`, `vacina_quando`, `vacinas_do_grupo` |
| Segurança | `orientacao_medica`, `fora_do_escopo` |

O dataset (`vacina_nlp/data/intents.json`, 490 frases) e as respostas (`responses.json`) foram **escritos pelo Claude como rascunho e precisam da revisão do autor** antes da apresentação. O conjunto de teste (`test_set.json`) é separado do treino.

## Avaliação

`docs/07-testes/avaliacao-chatbot.md` (gerado por `python -m vacina_nlp.evaluate --write-report ...`): acurácia, F1 macro, métricas por intenção, erros, análise do limiar e limitações. Resultado atual e meta de F1 ≥ 0,85 (a validar com o professor): ver o relatório. O relatório registra, com honestidade, que a validação cruzada no treino é bem menor que o teste e que o treino **não** foi ajustado a partir dos erros do teste.

**Painel de métricas:** `docs/07-testes/painel-pln.html` é uma página única (abre direto no navegador, sem internet) com os mesmos números em gráficos: cartões de resumo, F1 por intenção, matriz de confusão, a curva de cobertura e acerto por limiar e a lista de erros. Gere com `python -m vacina_nlp.evaluate --write-dashboard ../../docs/07-testes/painel-pln.html` (dentro de `apps/nlp`) e tire a captura para os documentos com `node scripts/documentos/captura-painel.mjs`.

## Busca (voz)

`POST /api/search` recebe a transcrição e devolve até 5 vacinas parecidas, com doenças e indicações do calendário. Não é IA generativa. A nota de cada vacina combina duas medidas sobre um documento por vacina (nome, apelidos populares, doenças evitadas, faixas, momentos e observações do calendário):

1. **TF-IDF de n-gramas de caracteres** (3 a 5) e cosseno: acha o que a consulta e o documento têm em comum mesmo com erro de transcrição ("tuberculoze").
2. **LSA** (análise semântica latente): SVD truncado do TF-IDF (12 temas, semente fixa), que aproxima termos que aparecem juntos. Peso de 0,3 na nota final.

Nota mínima de 0,35 (abaixo disso não devolve). Índice montado na partida em cerca de 35 ms; cada consulta leva cerca de 2 ms. **Avaliação:** `docs/07-testes/avaliacao-busca-semantica.md` (gerada por `python -m vacina_nlp.search_evaluate`): acerto na 1ª posição de 68,3% no índice original para **88,9%** no atual (MRR de 0,722 para 0,928) em 63 consultas. A melhoria vem de enriquecer os documentos e dos n-gramas de caracteres; o efeito isolado do **LSA é pequeno e não distinguível de ruído** com só 22 documentos (o relatório mostra isso). Consultas com palavras ausentes dos dados ("tosse comprida") continuam difíceis; embeddings resolveriam, com custo e memória (alternativa registrada no relatório).

## Contrato do serviço (interno; a API principal é quem o chama)

| Rota | Chave | Corpo | Resposta |
|---|---|---|---|
| `POST /api/chat` | sim (função) | `{"text": "..."}` (até 300 caracteres) | `{intent, text, confidence, source{name,url?,version?}, suggestions[], fallback, safety}` |
| `POST /api/search` | sim (função) | `{"text": "..."}` | `{results[{vaccine,score,diseases,indications[]}], source, notice}` |
| `GET /api/health` | não | n/a | `{status, service, intents, calendarVersion}` |

- Erros: `400 {code:"VALIDATION_ERROR", message}` com mensagem fixa (nunca repete o texto enviado).
- **LGPD:** o texto das perguntas não é gravado nem registrado em log; o serviço não guarda estado.
- O modelo é **treinado na partida** (menos de 1 s) a partir do dataset versionado, sem arquivo binário (pickle).

## Calendário compartilhado com o TypeScript

`apps/nlp/vacina_nlp/data/pni-2026.json` é gerado do `@vacina/shared` por `npm run export:calendar`. Um teste do pacote TypeScript (`CT-NLP-01`) falha se o JSON divergir do calendário oficial: há uma única fonte de dados.

## Testes (pytest, `apps/nlp/tests`)

| IDs | O que verifica |
|---|---|
| CT-NLP-01 e 02 (Jest) | JSON do Python idêntico ao calendário oficial |
| CT-NLP-10 | Normalização de texto |
| CT-NLP-20 a 25 | Dados do calendário (fonte, versão, totais por faixa, notas) |
| CT-NLP-30 a 35 | Apelidos de vacinas e faixas da vida (limites oficiais de idade) |
| CT-NLP-40 e 41 | Regras de segurança (e que "febre amarela" não dispara) |
| CT-NLP-50 a 58 | Dataset (quantidade, sem vazamento nem dado pessoal), treino determinístico, tolerância a erro de digitação |
| CT-NLP-60 a 69 | Respostas curadas, fontes, saúde individual, entrada vazia, baixa confiança |
| CT-NLP-70 a 81 | Respostas montadas com o calendário oficial |
| CT-NLP-90 a 93 | Busca por nome, apelido e doença |
| CT-NLP-130 a 138 | Busca semântica: erro de fala, consulta de grupo, parâmetros, determinismo, documento enriquecido, fora do tema, limiar |
| CT-NLP-140 a 146 | Avaliação da busca: conjunto de teste (nomes oficiais, respostas de grupo vindas do calendário), métricas, superação do índice original, limiar e relatório |
| CT-NLP-100 a 106 | Validação das requisições e erros sem repetir o texto |
| CT-NLP-110 a 112 | Rotas, chave da função e cabeçalhos |
| CT-NLP-120 a 127 | Avaliação: F1 acima da meta, sem vazamento, limiar, relatório |

**Em aberto:** confirmar com o professor se o código Python entra na meta de cobertura (a disciplina cita Jest). Hoje o CI exige 80% também no Python.

## Riscos e pendências

- Dataset pequeno (R4 da Fase 0): os números do teste são otimistas; relatar sempre com as limitações.
- Partida a frio da Function Python (treino na partida): medir contra a meta de 3 s da voz (RNF01).
- Voz no celular (Android e iOS): implementada em 07/10/2026 com `expo-audio`; testada no emulador Android, **falta celular físico e iOS** (ver abaixo).
- Segredos (chave do PLN e da voz) estão como configuração da Function App; mover para o Key Vault (ADR-008) assim que a conta do autor tiver o papel de escrita no cofre.

## Integração: API, voz e app (SCRUM-20)

Fluxo da pergunta por voz: **app (web)** grava e converte para WAV PCM 16 kHz mono no próprio aparelho → `POST /api/assistant/voice` (corpo `audio/wav`) → **API** → **Azure AI Speech** (reconhecimento de fala curta, pt-BR) → transcrição → **serviço de PLN** (`/chat` e `/search`, em paralelo) → resposta com fonte, transcrição e vacinas encontradas. O áudio fica só em memória, durante a chamada: nunca é gravado.

| Rota da API | Corpo | Limites | Erros |
|---|---|---|---|
| `POST /api/assistant/message` | `{"text": "..."}` (até 300 caracteres) | 60 por hora por usuário | 400, 401, 429, 503 |
| `POST /api/assistant/voice` | WAV PCM 16 kHz, mono, até 60 s (o app grava até 30 s) | 20 por hora e 60 por dia por usuário | 401, 413, 415, 422 (fala não entendida), 429, 503 |

- **Limite de uso (ADR-010):** janela fixa em memória, com `Retry-After` no 429. A versão com Table Storage do ADR entra com o banco; com uma instância só, o efeito é o mesmo.
- **Sem configuração** (`NLP_BASE_URL`, `NLP_FUNCTION_KEY`, `SPEECH_ENDPOINT`, `SPEECH_KEY`), a API responde 503 "assistente indisponível" em vez de falhar.
- **Voz na web:** `MediaRecorder` grava (WebM ou MP4, conforme o navegador), `AudioContext` decodifica e o app converte para o WAV que a API de fala curta aceita. Exige **https** ou `localhost` e a permissão do microfone; negada, o app orienta a digitar.
- **Voz no celular (Android e iOS):** o app captura o microfone em **PCM** com o `AudioStream` do `expo-audio` (pedido de 16 kHz, mono, `float32`), junta os blocos e usa o **mesmo conversor da web** (`toSpeechWav`: mono, 16 kHz, WAV de 16 bits). Assim a API e o Azure AI Speech recebem o mesmo WAV de sempre, sem mudança no servidor e sem arquivo de áudio no aparelho. Por que não gravar em arquivo: o Android não grava WAV nem PCM em arquivo pelo `expo-audio` (só AAC, AMR e WebM), e a API de áudio curto do Azure só lê WAV e Ogg. O gravador é um hook (`useVoiceRecorder`) porque o módulo entrega o microfone por um objeto ligado ao componente. A permissão do microfone é pedida ao tocar em Falar; negada, o app orienta a digitar. O texto da permissão no iOS vem do plugin `expo-audio` em `app.json`.
- **Verificado:** áudio sintetizado com o próprio Azure ("Para que serve a vacina BCG?") foi reconhecido em 0,64 s e respondido de ponta a ponta (web). Os testes automatizados do gravador do celular usam o `expo-audio` simulado (permissão, conversão de 48 kHz para 16 kHz, estéreo, gravação vazia ou curta, cancelamento). Em 07/10/2026 o autor testou a voz no **emulador Android** (microfone virtual do computador): a fala foi reconhecida e respondida. Falta testar em celular físico e em iOS. Para rodar a API local com voz, são necessários o Azurite e o PLN (`docker compose up -d azurite nlp`) e `NLP_BASE_URL`, `NLP_FUNCTION_KEY`, `SPEECH_ENDPOINT` e `SPEECH_KEY` no `local.settings.json`.

### Desempenho e custo (medidos em 07/10/2026)

- Serviço de PLN na nuvem, instância já ativa: 0,05 a 0,16 s por pergunta (uma amostra isolada de 3,7 s).
- **Partida a frio do serviço Python: cerca de 50 s** (carrega as bibliotecas de ML). Por isso a Function de PLN usa **uma instância sempre pronta** (Flex Consumption, 512 MB), que custa uma pequena quantia fixa por mês (conferir na calculadora de preços, SCRUM-26). Também é necessário o paralelismo por instância em 8: com o padrão, chamadas em sequência esperavam ~5 s.
- Cada nova publicação reinicia a instância e a primeira chamada depois dela pode levar cerca de 50 s.
- O tempo de espera da API pelo PLN é de 15 s; se estourar, o app mostra "assistente indisponível".

### Testes da integração

| IDs | O que verifica |
|---|---|
| CT-AST-01 a 08 | Serviço do assistente: texto, voz, limite, áudio inválido, fala não entendida, falhas externas |
| CT-AST-H01 a H06 | Handlers: validação, tipo de áudio e mapeamento de erros HTTP |
| CT-RL-01 a 06 | Limitador de uso: janela, vários donos, várias regras, limpeza |
| CT-CLI-01 a 14 | Clientes do PLN e da voz (chave, endereço, formato do áudio, erros sem detalhe) |
| CT-WAV-01 a 07 | Conversão do áudio (WAV, mono, 16 kHz, 16 bits) |
| CT-VOZ-01 a 11 | Gravador web e erros de microfone |
| CT-APP-I01 a I06, V01 a V08 | Tela do assistente: chat, sugestões, aviso de saúde, erros e fluxo de voz |

