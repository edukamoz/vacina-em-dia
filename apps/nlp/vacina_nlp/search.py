"""Busca sobre vacinas e calendário por similaridade e por semântica latente (RF06).

A transcrição da fala entra aqui. Cada vacina vira um documento (nome, apelidos populares, doenças
que evita, faixas e momentos em que é indicada, e as observações do calendário). A pergunta é
comparada com todos de duas formas, combinadas:

1. **TF-IDF de n-gramas de caracteres e cosseno**: acha o que a pergunta e o documento têm em
   comum mesmo com erro de transcrição ("tuberculoze", "cacumba"), que é comum na fala.
2. **LSA (análise semântica latente)**: reduz o TF-IDF a poucos "temas" com SVD truncado, de modo que
   termos que aparecem juntos nos documentos passam a se aproximar, e a busca passa a achar vacinas
   por temas relacionados e não só por trechos iguais.

Na avaliação (docs/07-testes/avaliacao-busca-semantica.md), a melhoria vem sobretudo dos documentos
enriquecidos e dos n-gramas de caracteres; o LSA tem efeito pequeno com apenas 22 documentos.

Não é IA generativa: o resultado são linhas do calendário oficial, e o método é determinístico.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize as l2_normalize

from .calendar_data import GROUP_LABELS, Calendar
from .entities import VACCINE_ALIASES
from .preprocess import normalize

# Abaixo desta similaridade o resultado é considerado fraco e não é devolvido (calibrado na
# avaliação: rejeita as perguntas fora do tema sem perder as consultas de vacinas).
MIN_SCORE = 0.35
MAX_RESULTS = 5

# Combinação padrão, escolhida na avaliação (docs/07-testes/avaliacao-busca-semantica.md).
DEFAULT_ANALYZER = "char"
DEFAULT_COMPONENTS = 12
DEFAULT_LSA_WEIGHT = 0.3

# Semente do SVD: o índice é o mesmo a cada partida do serviço.
RANDOM_STATE = 0


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


def build_documents(calendar: Calendar, *, enriched: bool) -> tuple[list[str], list[str]]:
    """Monta um texto por vacina e devolve (nomes, textos).

    Com ``enriched=False`` o texto é o nome, os apelidos e as doenças (índice original). Com
    ``enriched=True`` entram também as faixas, os momentos e as observações do calendário, o que dá
    ao LSA mais palavras para relacionar.
    """
    names = calendar.vaccine_names()
    apelidos: dict[str, list[str]] = {name: [] for name in names}
    for alias, targets in VACCINE_ALIASES.items():
        for target in targets:
            if target in apelidos:
                apelidos[target].append(alias)
    textos = []
    for name in names:
        regras = calendar.rules_of(name)
        doencas = " ".join(dict.fromkeys(r.diseases for r in regras))
        texto = f"{name} {' '.join(apelidos[name])} {doencas}"
        if enriched:
            grupos = " ".join(dict.fromkeys(GROUP_LABELS[r.group] for r in regras))
            momentos = " ".join(dict.fromkeys(f"{r.dose} {r.timing_label}" for r in regras))
            notas = " ".join(
                dict.fromkeys(calendar.notes[i] for r in regras for i in r.note_ids if i in calendar.notes)
            )
            texto = f"{texto} {grupos} {momentos} {notas}"
        textos.append(texto)
    return names, textos


class VaccineSearch:
    """Índice de busca sobre as vacinas do calendário.

    Args:
        calendar: calendário oficial.
        analyzer: ``"char"`` (n-gramas de 3 a 5 caracteres, tolera erro de fala) ou ``"word"``
            (palavras e pares de palavras, o índice original).
        enriched: inclui faixas, momentos e observações nos documentos.
        lsa_weight: peso da similaridade semântica (LSA) na nota final, de 0 (só TF-IDF, o índice
            original) a 1 (só LSA). A nota é ``(1 - peso) * cosseno_tfidf + peso * cosseno_lsa``.
        components: número de temas do LSA (limitado ao número de documentos menos um).
    """

    def __init__(
        self,
        calendar: Calendar,
        *,
        analyzer: str = DEFAULT_ANALYZER,
        enriched: bool = True,
        lsa_weight: float = DEFAULT_LSA_WEIGHT,
        components: int = DEFAULT_COMPONENTS,
    ) -> None:
        if not 0.0 <= lsa_weight <= 1.0:
            raise ValueError("lsa_weight deve estar entre 0 e 1")
        self._calendar = calendar
        self._lsa_weight = lsa_weight
        self._names, documentos = build_documents(calendar, enriched=enriched)
        if analyzer == "char":
            self._vectorizer = TfidfVectorizer(
                preprocessor=normalize, analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True
            )
        elif analyzer == "word":
            self._vectorizer = TfidfVectorizer(
                preprocessor=normalize, ngram_range=(1, 2), sublinear_tf=True
            )
        else:
            raise ValueError("analyzer deve ser 'char' ou 'word'")
        self._matrix = self._vectorizer.fit_transform(documentos)
        self._svd: TruncatedSVD | None = None
        self._latent: np.ndarray | None = None
        if lsa_weight > 0:
            k = max(2, min(components, len(self._names) - 1, self._matrix.shape[1] - 1))
            self._svd = TruncatedSVD(n_components=k, random_state=RANDOM_STATE)
            self._latent = l2_normalize(self._svd.fit_transform(self._matrix))

    @property
    def names(self) -> list[str]:
        """Nomes das vacinas indexadas, na ordem do índice."""
        return list(self._names)

    def scores(self, query: str) -> np.ndarray:
        """Nota de cada vacina para a pergunta (0 a 1), na ordem de ``names``."""
        if not normalize(query):
            return np.zeros(len(self._names))
        vector = self._vectorizer.transform([query])
        lexical = cosine_similarity(vector, self._matrix)[0]
        if self._svd is None or self._latent is None:
            return lexical
        latent_query = l2_normalize(self._svd.transform(vector))
        semantic = np.clip(cosine_similarity(latent_query, self._latent)[0], 0.0, 1.0)
        return (1.0 - self._lsa_weight) * lexical + self._lsa_weight * semantic

    def search(self, query: str) -> list[SearchHit]:
        """Devolve até cinco vacinas parecidas com a pergunta, da mais para a menos parecida."""
        similaridades = self.scores(query)
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
