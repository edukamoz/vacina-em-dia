# Serviço de PLN: chatbot e busca (apps/nlp)

Azure Function em Python (ADR-002) com o chatbot por regras e classificação de intenções (TF-IDF + SVM, scikit-learn) e a busca sobre o Calendário Nacional de Vacinação. Sem IA generativa. Documentação completa em `docs/11-assistente-pln.md`.

Não é workspace npm: tem ambiente e testes próprios.

## Como rodar

```bash
cd apps/nlp
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # Linux/macOS: .venv/bin/python
.venv/Scripts/python -m pytest --cov                           # testes (mínimo de 80% de cobertura)
.venv/Scripts/python -m vacina_nlp.evaluate                    # acurácia e F1 no conjunto de teste
.venv/Scripts/python -m vacina_nlp.evaluate --write-report ../../docs/07-testes/avaliacao-chatbot.md
```

Em contêiner (a partir da raiz do repositório): `docker compose up --build nlp` e `curl http://localhost:7072/api/health`.

## Atualizar o calendário

O calendário vem do pacote TypeScript. Depois de mudar o dado oficial em `packages/shared`:

```bash
npm run build -w @vacina/shared && npm run export:calendar
```

## Dados que exigem revisão humana

`vacina_nlp/data/intents.json` (treino), `test_set.json` (teste, separado) e `responses.json` (respostas curadas). Nunca coloque dado pessoal real neles.
