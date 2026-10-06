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

## Busca (voz)

`POST /api/search` recebe a transcrição e devolve até 5 vacinas parecidas (TF-IDF e cosseno sobre nome, apelidos populares e doenças evitadas), com doenças e indicações do calendário. É busca por similaridade de texto, não IA generativa.

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
| CT-NLP-100 a 106 | Validação das requisições e erros sem repetir o texto |
| CT-NLP-110 a 112 | Rotas, chave da função e cabeçalhos |
| CT-NLP-120 a 127 | Avaliação: F1 acima da meta, sem vazamento, limiar, relatório |

**Em aberto:** confirmar com o professor se o código Python entra na meta de cobertura (a disciplina cita Jest). Hoje o CI exige 80% também no Python.

## Riscos e pendências

- Dataset pequeno (R4 da Fase 0): os números do teste são otimistas; relatar sempre com as limitações.
- Partida a frio da Function Python (treino na partida): medir contra a meta de 3 s da voz (RNF01).
- Integração com a API principal, voz (Azure AI Speech) e a aba Assistente do app: próximo PR.
