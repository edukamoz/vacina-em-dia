# ADR-002: Serviço de PLN separado, em Azure Function com Python

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF06, RF07, RNF01, RNF10

## Contexto

O chatbot usa regras e classificação de intenções com **TF-IDF e SVM** (exigência da disciplina de PLN), sem IA generativa. As bibliotecas usuais para isso (scikit-learn) são em Python, enquanto a API principal é em TypeScript (ADR-001).

## Decisão

- Criar um **serviço de PLN separado** (`apps/nlp`), em **Azure Function com Python**, usando scikit-learn.
- O modelo é **treinado offline** a partir de um dataset de intenções criado e revisado manualmente (sem dados pessoais) e guardado como artefato versionado, carregado na inicialização da Function.
- A resposta final é sempre **curada** e com fonte oficial; abaixo do limiar de confiança, devolve a resposta padrão que orienta procurar um profissional ou uma unidade de saúde.
- O serviço não é workspace npm; tem ambiente e testes próprios (pytest).
- A chamada API → PLN usa rede e credencial gerenciadas (detalhe a definir no SCRUM-21).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Classificador em Node.js na própria API | Ecossistema fraco para TF-IDF e SVM; o professor espera scikit-learn. |
| Azure AI Language (CLU) | Gerenciado, mas esconde o algoritmo; não atende à exigência de TF-IDF e SVM. |
| IA generativa | Fora do escopo; risco de conteúdo médico inventado (RNF10). |

## Consequências

- Separação clara de responsabilidades; PLN pode evoluir e ser testado sozinho.
- Um segundo aplicativo para implantar e monitorar, com partida a frio própria; a busca por voz (RF06) tem meta de 3 s, então o tempo total precisa ser medido.
- Cobertura do código Python na meta de 80%: **a confirmar com o professor** (CLAUDE.md §11).
- Dataset pequeno é um risco conhecido (R4 da Fase 0): relatar F1 e limitações.

## Verificações e fontes

- Exigência de TF-IDF e SVM: enunciado da disciplina de PLN (`docs/referencias-disciplinas/pln_aula-introducao.pdf`) e `docs/01-visao-e-escopo.md`.
