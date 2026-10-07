"""Classificador de intenções: TF-IDF + SVM (scikit-learn), sem IA generativa."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import SVC

from .calendar_data import DATA_DIR
from .preprocess import normalize

# Mesma semente em treino, teste e produção: o resultado é reprodutível.
RANDOM_STATE = 42

# Parâmetros definidos na avaliação (ver docs/07-testes/avaliacao-chatbot.md).
SVM_C = 1.0
CALIBRATION_FOLDS = 5


@dataclass(frozen=True)
class Prediction:
    """Resultado de uma classificação."""

    intent: str
    confidence: float
    scores: dict[str, float]


def _build_pipeline() -> Pipeline:
    """TF-IDF de palavras (1 e 2 termos) somado ao de trechos de letras (3 a 5), que tolera erro
    de digitação, seguido de um SVM linear com probabilidades calibradas (Platt)."""
    features = FeatureUnion(
        [
            (
                "palavras",
                TfidfVectorizer(
                    preprocessor=normalize, analyzer="word", ngram_range=(1, 2), sublinear_tf=True
                ),
            ),
            (
                "letras",
                TfidfVectorizer(
                    preprocessor=normalize, analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True
                ),
            ),
        ]
    )
    svm = SVC(kernel="linear", C=SVM_C, random_state=RANDOM_STATE)
    # O SVM puro só dá uma nota de distância; a calibração (Platt) a transforma em probabilidade.
    calibrado = CalibratedClassifierCV(
        svm,
        method="sigmoid",
        cv=StratifiedKFold(n_splits=CALIBRATION_FOLDS, shuffle=True, random_state=RANDOM_STATE),
        ensemble=False,
    )
    return Pipeline([("tfidf", features), ("svm", calibrado)])


class IntentClassifier:
    """Classificador de intenções treinado com o dataset revisado à mão."""

    def __init__(self, pipeline: Pipeline) -> None:
        self._pipeline = pipeline

    @classmethod
    def train(cls, examples: list[tuple[str, str]]) -> IntentClassifier:
        """Treina com pares ``(frase, intenção)``.

        Raises:
            ValueError: se houver menos de duas intenções ou alguma frase vazia.
        """
        if any(not normalize(text) for text, _ in examples):
            raise ValueError("Há frase vazia no conjunto de treino.")
        if len({intent for _, intent in examples}) < 2:
            raise ValueError("São necessárias ao menos duas intenções para treinar.")
        texts = [text for text, _ in examples]
        labels = [intent for _, intent in examples]
        pipeline = _build_pipeline()
        pipeline.fit(texts, labels)
        return cls(pipeline)

    @property
    def intents(self) -> list[str]:
        """Intenções que o modelo conhece."""
        return [str(label) for label in self._pipeline.classes_]

    def predict(self, text: str) -> Prediction:
        """Classifica uma frase e devolve a intenção mais provável com a confiança (0 a 1)."""
        probabilities = self._pipeline.predict_proba([text])[0]
        scores = {
            str(label): float(prob) for label, prob in zip(self._pipeline.classes_, probabilities)
        }
        intent = max(scores, key=lambda key: scores[key])
        return Prediction(intent=intent, confidence=scores[intent], scores=scores)

    def predict_many(self, texts: list[str]) -> list[Prediction]:
        """Classifica várias frases."""
        return [self.predict(text) for text in texts]


def load_intent_examples(path: Path | None = None) -> list[tuple[str, str]]:
    """Lê o dataset de treino: pares ``(frase, intenção)``."""
    file = path or DATA_DIR / "intents.json"
    with file.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return [(text, intent) for intent, texts in raw["intents"].items() for text in texts]


def load_test_examples(path: Path | None = None) -> list[tuple[str, str]]:
    """Lê o conjunto de teste, separado do treino."""
    file = path or DATA_DIR / "test_set.json"
    with file.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return [(item["text"], item["intent"]) for item in raw["examples"]]


@lru_cache(maxsize=1)
def trained_classifier() -> IntentClassifier:
    """Treina uma vez com o dataset versionado (menos de um segundo) e reaproveita.

    Treinar na partida dispensa guardar o modelo em arquivo binário (pickle), que dependeria da
    versão exata das bibliotecas e não é seguro carregar de fonte desconhecida.
    """
    return IntentClassifier.train(load_intent_examples())
