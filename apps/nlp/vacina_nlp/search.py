"""Busca sobre vacinas e calendário por similaridade de texto (TF-IDF + cosseno), para a voz (RF06).

A transcrição da fala entra aqui. Cada vacina vira um documento com o nome, os apelidos populares
e as doenças que evita; a pergunta é comparada com todos. Não é busca por IA generativa: o
resultado são linhas do calendário oficial.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .calendar_data import GROUP_LABELS, Calendar
from .entities import VACCINE_ALIASES
from .preprocess import normalize

# Abaixo desta similaridade o resultado é considerado fraco e não é devolvido.
MIN_SCORE = 0.12
MAX_RESULTS = 5


@dataclass(frozen=True)
class SearchHit:
    """Uma vacina encontrada, com suas indicações no calendário."""

    vaccine: str
    score: float
    diseases: str
    indications: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        """Formato enviado como JSON."""
        return {
            "vaccine": self.vaccine,
            "score": round(self.score, 4),
            "diseases": self.diseases,
            "indications": list(self.indications),
        }


class VaccineSearch:
    """Índice de busca sobre as vacinas do calendário."""

    def __init__(self, calendar: Calendar) -> None:
        self._calendar = calendar
        self._names = calendar.vaccine_names()
        apelidos: dict[str, list[str]] = {name: [] for name in self._names}
        for alias, targets in VACCINE_ALIASES.items():
            for target in targets:
                if target in apelidos:
                    apelidos[target].append(alias)
        documentos = []
        for name in self._names:
            doencas = " ".join(dict.fromkeys(r.diseases for r in calendar.rules_of(name)))
            documentos.append(f"{name} {' '.join(apelidos[name])} {doencas}")
        self._vectorizer = TfidfVectorizer(
            preprocessor=normalize, ngram_range=(1, 2), sublinear_tf=True
        )
        self._matrix = self._vectorizer.fit_transform(documentos)

    def search(self, query: str) -> list[SearchHit]:
        """Devolve até cinco vacinas parecidas com a pergunta, da mais para a menos parecida."""
        if not normalize(query):
            return []
        similaridades = cosine_similarity(self._vectorizer.transform([query]), self._matrix)[0]
        ordem = sorted(range(len(self._names)), key=lambda i: similaridades[i], reverse=True)
        hits = []
        for indice in ordem[:MAX_RESULTS]:
            score = float(similaridades[indice])
            if score < MIN_SCORE:
                break
            name = self._names[indice]
            regras = self._calendar.rules_of(name)
            indicacoes = tuple(
                dict.fromkeys(
                    f"{GROUP_LABELS[r.group]}: {r.dose}, {r.timing_label[:1].lower()}{r.timing_label[1:]}"
                    for r in regras
                )
            )
            doencas = "; ".join(dict.fromkeys(r.diseases for r in regras))
            hits.append(SearchHit(name, score, doencas, indicacoes))
        return hits
