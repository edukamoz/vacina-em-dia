# Comparação das técnicas de PLN das aulas com o projeto

> **Arquivo gerado** por `python -m vacina_nlp.comparacao --write-report ...` (dentro de `apps/nlp`). Não edite à mão.

- **Data:** 2026-10-21
- **Chatbot:** 490 frases de treino e 100 de teste, separadas (o script recusa vazamento); 20 intenções.
- **Busca:** 63 consultas sobre as vacinas do calendário.
- **Bibliotecas:** scikit-learn 1.7.2, numpy 2.5.3. Semente fixa (42).

Objetivo: mostrar, com números, por que o projeto usa o que usa, relacionando com as aulas de Pré-processamento (tokenização, normalização, stopwords, stemming), Vetorização (Bag-of-Words e TF-IDF) e Classificação (SVM, KNN e Naive Bayes; Regressão Logística no Chatbot II).

## 1. Classificador de intenções: algoritmos e vetorização

Todos usam as mesmas palavras (1 e 2 termos) para isolar o efeito do algoritmo; a última linha é o modelo que roda no app. A validação cruzada (5 partes) usa só o treino.

| Configuração | Acurácia (teste) | F1 macro (teste) | Acurácia (validação cruzada) | F1 macro (validação cruzada) |
|---|---|---|---|---|
| Bag-of-Words + Naive Bayes | 91.0% | 0.903 | 62.2% | 0.618 |
| TF-IDF + Naive Bayes | 98.0% | 0.980 | 63.1% | 0.621 |
| TF-IDF + KNN (k = 3, cosseno) | 86.0% | 0.859 | 52.4% | 0.522 |
| TF-IDF + Regressão Logística | 90.0% | 0.896 | 64.9% | 0.640 |
| TF-IDF + SVM linear | 96.0% | 0.960 | 66.3% | 0.660 |
| Produção: TF-IDF (palavras e letras) + SVM calibrado | 94.0% | 0.932 | 68.8% | 0.670 |

## 2. Chatbot: pré-processamento (stopwords e radical)

Mesmo modelo de produção; só muda o tratamento do texto antes da vetorização. Stopwords: lista curta escrita à mão (`STOPWORDS_PT`, inclui "como", "quando", "não"). Radical: remoção de sufixos por regras simples (`radical`), no espírito do RSLP e do lematizador rudimentar da aula, **sem** biblioteca nova.

| Configuração | Acurácia (teste) | F1 macro (teste) | Acurácia (validação cruzada) | F1 macro (validação cruzada) |
|---|---|---|---|---|
| Normalização (o que o projeto usa) | 94.0% | 0.932 | 68.8% | 0.670 |
| + remover stopwords | 88.0% | 0.876 | 64.1% | 0.619 |
| + radical (stemming rudimentar) | 95.0% | 0.945 | 68.2% | 0.662 |
| + stopwords e radical | 85.0% | 0.845 | 63.3% | 0.612 |

## 3. Busca: vetorização e pré-processamento

Acerto na 1ª posição, entre as 3 primeiras e MRR nas consultas de vacinas (mesmo conjunto de `avaliacao-busca-semantica.md`).

| Configuração | Acerto na 1ª | Acerto nas 3 primeiras | MRR |
|---|---|---|---|
| Bag-of-Words (contagem de palavras), documento enriquecido | 57.1% | 74.6% | 0.679 |
| TF-IDF de palavras (configuração B) | 74.6% | 85.7% | 0.816 |
| TF-IDF de palavras sem stopwords | 74.6% | 87.3% | 0.814 |
| TF-IDF de palavras com radical | 69.8% | 87.3% | 0.793 |
| TF-IDF de palavras sem stopwords e com radical | 71.4% | 85.7% | 0.795 |
| TF-IDF de caracteres (configuração C) | 88.9% | 95.2% | 0.926 |
| TF-IDF de caracteres com radical | 90.5% | 95.2% | 0.933 |
| Padrão do projeto: caracteres + LSA (configuração F) | 88.9% | 95.2% | 0.928 |

## Como interpretar

- **Leia como indício, não como prova.** O teste do chatbot tem 100 frases (cada uma vale 1 ponto percentual) e o da busca, poucas dezenas de consultas; diferenças pequenas não são conclusivas. As frases e as consultas foram escritas por uma pessoa só.
- **Algoritmos (tabela 1):** no conjunto de teste, o Naive Bayes com TF-IDF ficou **acima** do SVM de produção; na validação cruzada (490 frases, 5 partes), o SVM ficou na frente. Com só 100 frases de teste, a diferença são poucas frases e **não dá para afirmar qual é melhor**. O SVM linear segue como escolha do projeto (exigência do `CLAUDE.md`) e a calibração (Platt) dá a probabilidade usada no limiar de confiança; o Naive Bayes costuma dar probabilidades extremas, o que atrapalharia esse limiar. Trocar de algoritmo seria decisão do autor, com novo ADR.
- **Stopwords e radical:** as aulas apresentam esses passos como padrão. Aqui o efeito é medido, não assumido: veja a tabela 2. Em perguntas curtas, palavras como "como", "quando" e "não" carregam a intenção, e o pré-processamento pode piorar o resultado. O modelo de produção também usa trechos de letras (3 a 5), que já absorvem parte da variação que o radical trataria.
- **Bag-of-Words contra TF-IDF:** o TF-IDF dá menos peso às palavras presentes em muitos documentos; a tabela 3 mostra o efeito na busca.
- Nada disso muda o que está em produção: é a justificativa das escolhas.

