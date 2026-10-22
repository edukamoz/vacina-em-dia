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

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize as l2_normalize

from .calendar_data import GROUP_LABELS, Calendar
from .embeddings import WordVectors, default_word_vectors
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
        analyzer: ``"char"`` (n-gramas de 3 a 5 caracteres, tolera erro de fala), ``"word"``
            (palavras e pares de palavras, o índice original) ou ``"bow"`` (sacola de palavras,
            só contagem, sem peso TF-IDF; usada na avaliação comparativa).
        preprocessor: tratamento do texto; em produção é sempre ``normalize`` (as variantes com
            stopwords e radical só aparecem na avaliação comparativa).
        enriched: inclui faixas, momentos e observações nos documentos.
        lsa_weight: peso da similaridade semântica (LSA) na nota final, de 0 (só TF-IDF, o índice
            original) a 1 (só LSA). A nota é ``(1 - peso) * cosseno_tfidf + peso * cosseno_lsa``.
        components: número de temas do LSA (limitado ao número de documentos menos um).
        embedding_weight: peso da similaridade por vetores de palavras (embeddings) na nota final;
            a parte lexical fica com ``1 - lsa_weight - embedding_weight``.
        word_vectors: vetores a usar; por padrão, o recorte do GloVe 50d do NILC.
    """

    def __init__(
        self,
        calendar: Calendar,
        *,
        analyzer: str = DEFAULT_ANALYZER,
        enriched: bool = True,
        lsa_weight: float = DEFAULT_LSA_WEIGHT,
        components: int = DEFAULT_COMPONENTS,
        preprocessor: Callable[[str], str] = normalize,
        embedding_weight: float = 0.0,
        word_vectors: WordVectors | None = None,
    ) -> None:
        if not 0.0 <= lsa_weight <= 1.0:
            raise ValueError("lsa_weight deve estar entre 0 e 1")
        if not 0.0 <= embedding_weight <= 1.0 or lsa_weight + embedding_weight > 1.0:
            raise ValueError("embedding_weight deve estar entre 0 e 1 e somar até 1 com lsa_weight")
        self._calendar = calendar
        self._lsa_weight = lsa_weight
        self._embedding_weight = embedding_weight
        self._names, documentos = build_documents(calendar, enriched=enriched)
        if analyzer == "char":
            self._vectorizer = TfidfVectorizer(
                preprocessor=preprocessor, analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True
            )
        elif analyzer == "word":
            self._vectorizer = TfidfVectorizer(
                preprocessor=preprocessor, ngram_range=(1, 2), sublinear_tf=True
            )
        elif analyzer == "bow":
            self._vectorizer = CountVectorizer(preprocessor=preprocessor)
        else:
            raise ValueError("analyzer deve ser 'char', 'word' ou 'bow'")
        self._matrix = self._vectorizer.fit_transform(documentos)
        self._vectors: WordVectors | None = None
        self._idf: dict[str, float] = {}
        self._doc_embeddings: np.ndarray | None = None
        self._center: np.ndarray | None = None
        if embedding_weight > 0:
            self._vectors = word_vectors or default_word_vectors()
            self._build_embedding_index(documentos)
        self._svd: TruncatedSVD | None = None
        self._latent: np.ndarray | None = None
        if lsa_weight > 0:
            k = max(2, min(components, len(self._names) - 1, self._matrix.shape[1] - 1))
            self._svd = TruncatedSVD(n_components=k, random_state=RANDOM_STATE)
            self._latent = l2_normalize(self._svd.fit_transform(self._matrix))

    def _build_embedding_index(self, documents: list[str]) -> None:
        """Vetor de cada documento: média das palavras ponderada pelo IDF (palavras raras pesam
        mais), menos a média de todos os documentos. Sem o centro, todo vetor de texto fica "parecido"
        com todos os outros e a nota não separa nada."""
        assert self._vectors is not None
        tokens = [set(normalize(d).split()) for d in documents]
        total = len(documents)
        frequency: dict[str, int] = {}
        for conjunto in tokens:
            for palavra in conjunto:
                frequency[palavra] = frequency.get(palavra, 0) + 1
        self._idf = {p: float(np.log((1 + total) / (1 + n)) + 1) for p, n in frequency.items()}
        brutos = [self._vectors.text_vector(d, self._idf) for d in documents]
        base = np.zeros(self._vectors.dimension, dtype=np.float32)
        validos = np.array([v for v in brutos if v is not None])
        self._center = validos.mean(axis=0) if len(validos) else base
        self._doc_embeddings = np.array(
            [self._unit(v if v is not None else base, self._center) for v in brutos]
        )

    @staticmethod
    def _unit(vector: np.ndarray, center: np.ndarray) -> np.ndarray:
        centered = vector - center
        norm = np.linalg.norm(centered)
        return centered / norm if norm > 0 else centered

    def _semantic_by_words(self, query: str) -> np.ndarray:
        """Similaridade (0 a 1) entre a pergunta e cada vacina pelos vetores de palavras; zeros se
        nenhuma palavra da pergunta tem vetor."""
        assert self._vectors is not None and self._center is not None
        assert self._doc_embeddings is not None
        # Palavra que não está em nenhum documento pesa o máximo: costuma ser o assunto da pergunta.
        maximo = max(self._idf.values(), default=1.0)
        pesos = {p: self._idf.get(p, maximo) for p in normalize(query).split()}
        vetor = self._vectors.text_vector(query, pesos)
        if vetor is None:
            return np.zeros(len(self._names))
        similaridade = self._doc_embeddings @ self._unit(vetor, self._center)
        return np.clip(similaridade, 0.0, 1.0)

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
        peso_lexical = 1.0 - self._lsa_weight - self._embedding_weight
        nota = peso_lexical * lexical
        if self._svd is not None and self._latent is not None:
            latent_query = l2_normalize(self._svd.transform(vector))
            semantic = np.clip(cosine_similarity(latent_query, self._latent)[0], 0.0, 1.0)
            nota = nota + self._lsa_weight * semantic
        if self._embedding_weight > 0:
            nota = nota + self._embedding_weight * self._semantic_by_words(query)
        return nota

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
