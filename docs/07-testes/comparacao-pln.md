# Comparação das técnicas de PLN das aulas com o projeto

> **Arquivo gerado** por `python -m vacina_nlp.comparacao --write-report ...` (dentro de `apps/nlp`). Não edite à mão.

- **Data:** 2026-11-12
- **Chatbot:** 1084 frases de treino e 205 de teste, separadas (o script recusa vazamento); 20 intenções.
- **Busca:** 63 consultas sobre as vacinas do calendário.
- **Bibliotecas:** scikit-learn 1.9.1, numpy 2.5.3. Semente fixa (42).

Objetivo: mostrar, com números, por que o projeto usa o que usa, relacionando com as aulas de Pré-processamento (tokenização, normalização, stopwords, stemming), Vetorização (Bag-of-Words e TF-IDF) e Classificação (SVM, KNN e Naive Bayes; Regressão Logística no Chatbot II).

## 1. Classificador de intenções: algoritmos e vetorização

Todos usam as mesmas palavras (1 e 2 termos) para isolar o efeito do algoritmo; a última linha é o modelo que roda no app. A validação cruzada (5 partes) usa só o treino.

| Configuração | Acurácia (teste) | F1 macro (teste) | Acurácia (validação cruzada) | F1 macro (validação cruzada) |
|---|---|---|---|---|
| Bag-of-Words + Naive Bayes | 86.3% | 0.860 | 61.7% | 0.606 |
| TF-IDF + Naive Bayes | 93.7% | 0.934 | 64.7% | 0.643 |
| TF-IDF + KNN (k = 3, cosseno) | 71.2% | 0.697 | 49.7% | 0.496 |
| TF-IDF + Regressão Logística | 84.4% | 0.844 | 60.5% | 0.614 |
| TF-IDF + SVM linear | 91.2% | 0.908 | 67.3% | 0.675 |
| Produção: TF-IDF (palavras e letras) + SVM calibrado | 89.8% | 0.890 | 72.0% | 0.711 |

## 2. Chatbot: pré-processamento (stopwords e radical)

Mesmo modelo de produção; só muda o tratamento do texto antes da vetorização. Stopwords: lista curta escrita à mão (`STOPWORDS_PT`, inclui "como", "quando", "não"). Radical: remoção de sufixos por regras simples (`radical`), no espírito do RSLP e do lematizador rudimentar da aula, **sem** biblioteca nova.

| Configuração | Acurácia (teste) | F1 macro (teste) | Acurácia (validação cruzada) | F1 macro (validação cruzada) |
|---|---|---|---|---|
| Normalização (o que o projeto usa) | 89.8% | 0.890 | 72.0% | 0.711 |
| + remover stopwords | 79.5% | 0.783 | 64.2% | 0.626 |
| + radical (stemming rudimentar) | 87.3% | 0.860 | 70.4% | 0.686 |
| + stopwords e radical | 80.5% | 0.786 | 61.3% | 0.588 |

## 3. Busca: vetorização e pré-processamento

Acerto na 1ª posição, entre as 3 primeiras e MRR nas consultas de vacinas (mesmo conjunto de `avaliacao-busca-semantica.md`).

| Configuração | Acerto na 1ª | Acerto nas 3 primeiras | MRR |
|---|---|---|---|
| Bag-of-Words (contagem de palavras), documento enriquecido | 55.6% | 73.0% | 0.677 |
| TF-IDF de palavras (configuração B) | 68.3% | 84.1% | 0.782 |
| TF-IDF de palavras sem stopwords | 68.3% | 85.7% | 0.781 |
| TF-IDF de palavras com radical | 66.7% | 87.3% | 0.778 |
| TF-IDF de palavras sem stopwords e com radical | 61.9% | 88.9% | 0.756 |
| TF-IDF de caracteres (configuração C) | 84.1% | 95.2% | 0.902 |
| TF-IDF de caracteres com radical | 84.1% | 95.2% | 0.901 |
| Padrão do projeto: caracteres + LSA (configuração F) | 84.1% | 95.2% | 0.903 |

## Como interpretar

- **Leia como indício, não como prova.** O teste do chatbot tem 100 frases (cada uma vale 1 ponto percentual) e o da busca, poucas dezenas de consultas; diferenças pequenas não são conclusivas. As frases e as consultas foram escritas por uma pessoa só.
- **Algoritmos (tabela 1):** no conjunto de teste, o Naive Bayes com TF-IDF ficou **acima** do SVM de produção; na validação cruzada (490 frases, 5 partes), o SVM ficou na frente. Com só 100 frases de teste, a diferença são poucas frases e **não dá para afirmar qual é melhor**. O SVM linear segue como escolha do projeto (exigência do `CLAUDE.md`) e a calibração (Platt) dá a probabilidade usada no limiar de confiança; o Naive Bayes costuma dar probabilidades extremas, o que atrapalharia esse limiar. Trocar de algoritmo seria decisão do autor, com novo ADR.
- **Stopwords e radical:** as aulas apresentam esses passos como padrão. Aqui o efeito é medido, não assumido: veja a tabela 2. Em perguntas curtas, palavras como "como", "quando" e "não" carregam a intenção, e o pré-processamento pode piorar o resultado. O modelo de produção também usa trechos de letras (3 a 5), que já absorvem parte da variação que o radical trataria.
- **Bag-of-Words contra TF-IDF:** o TF-IDF dá menos peso às palavras presentes em muitos documentos; a tabela 3 mostra o efeito na busca.
- Nada disso muda o que está em produção: é a justificativa das escolhas.

