"""Comparação das técnicas de PLN vistas nas aulas com o que o projeto usa.

Mede, com o mesmo conjunto de teste separado do treino, (1) algoritmos de classificação (Naive
Bayes, KNN, Regressão Logística e SVM) e a vetorização (Bag-of-Words contra TF-IDF), (2) o efeito
de remover stopwords e de reduzir as palavras ao radical (stemming) e (3) os mesmos tratamentos
na busca. Serve para justificar as escolhas do projeto com números, não para trocá-las.

Uso (dentro de ``apps/nlp``)::

    python -m vacina_nlp.comparacao
    python -m vacina_nlp.comparacao --write-report ../../docs/07-testes/comparacao-pln.md
"""

from __future__ import annotations

import argparse
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import sklearn
from sklearn.base import ClassifierMixin
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

from .calendar_data import Calendar, load_calendar
from .classifier import (
    RANDOM_STATE,
    _build_pipeline,
    load_intent_examples,
    load_test_examples,
)
from .evaluate import check_no_leak
from .preprocess import (
    normalize,
    normalize_com_radical,
    normalize_sem_stopwords,
    normalize_sem_stopwords_com_radical,
)
from .search import DEFAULT_COMPONENTS, DEFAULT_LSA_WEIGHT, VaccineSearch
from .search_evaluate import Metrics, evaluate as evaluate_search, load_test_set

Example = tuple[str, str]


@dataclass(frozen=True)
class Row:
    """Resultado de uma configuração de classificação."""

    label: str
    accuracy: float
    macro_f1: float
    cv_accuracy: float
    cv_macro_f1: float


def _score(
    label: str,
    make: Callable[[], Pipeline],
    train: list[Example],
    test: list[Example],
) -> Row:
    """Treina em ``train``, mede em ``test`` e faz validação cruzada (5 partes) só no treino."""
    x_train = [t for t, _ in train]
    y_train = [i for _, i in train]
    x_test = [t for t, _ in test]
    y_test = [i for _, i in test]
    model = make()
    model.fit(x_train, y_train)
    predicted = model.predict(x_test)
    splitter = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_predicted = cross_val_predict(make(), x_train, y_train, cv=splitter)
    return Row(
        label,
        float(accuracy_score(y_test, predicted)),
        float(f1_score(y_test, predicted, average="macro", zero_division=0)),
        float(accuracy_score(y_train, cv_predicted)),
        float(f1_score(y_train, cv_predicted, average="macro", zero_division=0)),
    )


def _words(vectorizer_class: type[CountVectorizer], classifier: ClassifierMixin) -> Pipeline:
    return Pipeline(
        [
            ("vec", vectorizer_class(preprocessor=normalize, ngram_range=(1, 2))),
            ("clf", classifier),
        ]
    )


def compare_models(train: list[Example], test: list[Example]) -> list[Row]:
    """Algoritmos e vetorizações, todos com as mesmas palavras (1 e 2 termos) para isolar o efeito.

    A última linha é o modelo de produção (palavras mais trechos de letras, SVM calibrado).
    """
    return [
        _score("Bag-of-Words + Naive Bayes", lambda: _words(CountVectorizer, MultinomialNB()), train, test),
        _score("TF-IDF + Naive Bayes", lambda: _words(TfidfVectorizer, MultinomialNB(alpha=0.1)), train, test),
        _score(
            "TF-IDF + KNN (k = 3, cosseno)",
            lambda: _words(
                TfidfVectorizer, KNeighborsClassifier(n_neighbors=3, metric="cosine", algorithm="brute")
            ),
            train,
            test,
        ),
        _score(
            "TF-IDF + Regressão Logística",
            lambda: _words(
                TfidfVectorizer, LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
            ),
            train,
            test,
        ),
        _score(
            "TF-IDF + SVM linear",
            lambda: _words(TfidfVectorizer, SVC(kernel="linear", random_state=RANDOM_STATE)),
            train,
            test,
        ),
        _score("Produção: TF-IDF (palavras e letras) + SVM calibrado", _build_pipeline, train, test),
    ]


PREPROCESSORS: list[tuple[str, Callable[[str], str]]] = [
    ("Normalização (o que o projeto usa)", normalize),
    ("+ remover stopwords", normalize_sem_stopwords),
    ("+ radical (stemming rudimentar)", normalize_com_radical),
    ("+ stopwords e radical", normalize_sem_stopwords_com_radical),
]


def compare_preprocessing(train: list[Example], test: list[Example]) -> list[Row]:
    """Efeito do pré-processamento no modelo de produção (só o tratamento do texto muda)."""
    return [
        _score(label, lambda pre=pre: _build_pipeline(pre), train, test)  # type: ignore[misc]
        for label, pre in PREPROCESSORS
    ]


def search_extras(calendar: Calendar) -> list[tuple[str, Metrics]]:
    """Tratamentos das aulas na busca, para comparar com as configurações B e C do relatório."""
    queries, _ = load_test_set(calendar)
    engines = [
        ("Bag-of-Words (contagem de palavras), documento enriquecido", VaccineSearch(calendar, analyzer="bow", enriched=True, lsa_weight=0)),
        ("TF-IDF de palavras (configuração B)", VaccineSearch(calendar, analyzer="word", enriched=True, lsa_weight=0)),
        ("TF-IDF de palavras sem stopwords", VaccineSearch(calendar, analyzer="word", enriched=True, lsa_weight=0, preprocessor=normalize_sem_stopwords)),
        ("TF-IDF de palavras com radical", VaccineSearch(calendar, analyzer="word", enriched=True, lsa_weight=0, preprocessor=normalize_com_radical)),
        ("TF-IDF de palavras sem stopwords e com radical", VaccineSearch(calendar, analyzer="word", enriched=True, lsa_weight=0, preprocessor=normalize_sem_stopwords_com_radical)),
        ("TF-IDF de caracteres (configuração C)", VaccineSearch(calendar, analyzer="char", enriched=True, lsa_weight=0)),
        ("TF-IDF de caracteres com radical", VaccineSearch(calendar, analyzer="char", enriched=True, lsa_weight=0, preprocessor=normalize_com_radical)),
        ("Padrão do projeto: caracteres + LSA (configuração F)", VaccineSearch(calendar, analyzer="char", enriched=True, lsa_weight=DEFAULT_LSA_WEIGHT, components=DEFAULT_COMPONENTS)),
    ]
    return [(label, evaluate_search(engine, queries)) for label, engine in engines]


def _pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def _table(rows: list[Row]) -> list[str]:
    lines = [
        "| Configuração | Acurácia (teste) | F1 macro (teste) | Acurácia (validação cruzada) | F1 macro (validação cruzada) |",
        "|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r.label} | {_pct(r.accuracy)} | {r.macro_f1:.3f} | {_pct(r.cv_accuracy)} | {r.cv_macro_f1:.3f} |"
        )
    return lines


def build_report(calendar: Calendar | None = None) -> str:
    """Monta o relatório em Markdown com os números desta execução."""
    calendar = calendar or load_calendar()
    train = load_intent_examples()
    test = load_test_examples()
    vazadas = check_no_leak(train, test)
    if vazadas:
        raise ValueError(f"Frases do teste também estão no treino: {vazadas}")
    models = compare_models(train, test)
    prep = compare_preprocessing(train, test)
    extras = search_extras(calendar)

    lines = [
        "# Comparação das técnicas de PLN das aulas com o projeto",
        "",
        "> **Arquivo gerado** por `python -m vacina_nlp.comparacao --write-report ...` (dentro de `apps/nlp`). Não edite à mão.",
        "",
        f"- **Data:** {date.today().isoformat()}",
        f"- **Chatbot:** {len(train)} frases de treino e {len(test)} de teste, separadas (o script recusa vazamento); 20 intenções.",
        f"- **Busca:** {len(load_test_set(calendar)[0])} consultas sobre as vacinas do calendário.",
        f"- **Bibliotecas:** scikit-learn {sklearn.__version__}, numpy {np.__version__}. Semente fixa ({RANDOM_STATE}).",
        "",
        "Objetivo: mostrar, com números, por que o projeto usa o que usa, relacionando com as aulas de Pré-processamento (tokenização, normalização, stopwords, stemming), Vetorização (Bag-of-Words e TF-IDF) e Classificação (SVM, KNN e Naive Bayes; Regressão Logística no Chatbot II).",
        "",
        "## 1. Classificador de intenções: algoritmos e vetorização",
        "",
        "Todos usam as mesmas palavras (1 e 2 termos) para isolar o efeito do algoritmo; a última linha é o modelo que roda no app. A validação cruzada (5 partes) usa só o treino.",
        "",
        *_table(models),
        "",
        "## 2. Chatbot: pré-processamento (stopwords e radical)",
        "",
        "Mesmo modelo de produção; só muda o tratamento do texto antes da vetorização. Stopwords: lista curta escrita à mão (`STOPWORDS_PT`, inclui \"como\", \"quando\", \"não\"). Radical: remoção de sufixos por regras simples (`radical`), no espírito do RSLP e do lematizador rudimentar da aula, **sem** biblioteca nova.",
        "",
        *_table(prep),
        "",
        "## 3. Busca: vetorização e pré-processamento",
        "",
        "Acerto na 1ª posição, entre as 3 primeiras e MRR nas consultas de vacinas (mesmo conjunto de `avaliacao-busca-semantica.md`).",
        "",
        "| Configuração | Acerto na 1ª | Acerto nas 3 primeiras | MRR |",
        "|---|---|---|---|",
    ]
    for label, m in extras:
        lines.append(f"| {label} | {_pct(m.hit_at_1)} | {_pct(m.hit_at_3)} | {m.mrr:.3f} |")
    lines += [
        "",
        "## Como interpretar",
        "",
        "- **Leia como indício, não como prova.** O teste do chatbot tem 100 frases (cada uma vale 1 ponto percentual) e o da busca, poucas dezenas de consultas; diferenças pequenas não são conclusivas. As frases e as consultas foram escritas por uma pessoa só.",
        "- **Algoritmos (tabela 1):** no conjunto de teste, o Naive Bayes com TF-IDF ficou **acima** do SVM de produção; na validação cruzada (490 frases, 5 partes), o SVM ficou na frente. Com só 100 frases de teste, a diferença são poucas frases e **não dá para afirmar qual é melhor**. O SVM linear segue como escolha do projeto (exigência do `CLAUDE.md`) e a calibração (Platt) dá a probabilidade usada no limiar de confiança; o Naive Bayes costuma dar probabilidades extremas, o que atrapalharia esse limiar. Trocar de algoritmo seria decisão do autor, com novo ADR.",
        "- **Stopwords e radical:** as aulas apresentam esses passos como padrão. Aqui o efeito é medido, não assumido: veja a tabela 2. Em perguntas curtas, palavras como \"como\", \"quando\" e \"não\" carregam a intenção, e o pré-processamento pode piorar o resultado. O modelo de produção também usa trechos de letras (3 a 5), que já absorvem parte da variação que o radical trataria.",
        "- **Bag-of-Words contra TF-IDF:** o TF-IDF dá menos peso às palavras presentes em muitos documentos; a tabela 3 mostra o efeito na busca.",
        "- Nada disso muda o que está em produção: é a justificativa das escolhas.",
        "",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    """Imprime o relatório ou o grava em arquivo."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", type=Path, help="grava o relatório neste arquivo")
    args = parser.parse_args()
    report = build_report()
    if args.write_report:
        args.write_report.write_text(report, encoding="utf-8")
        print(f"Relatório gravado em {args.write_report}")
    else:
        print(report)


if __name__ == "__main__":
    main()
