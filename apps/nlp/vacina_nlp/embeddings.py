"""Vetores de palavras (embeddings) em português para a busca semântica.

Usa o recorte do GloVe 50d do NILC/USP (licença CC-BY-4.0; Hartmann et al., 2017) gerado por
``scripts/gerar_embeddings.py``: cerca de 37 mil palavras em meia precisão, 3,6 MB. Palavras com
significado parecido têm vetores próximos ("tosse" fica perto de "coqueluche"), o que o TF-IDF e o
LSA, que só enxergam as palavras dos 22 documentos, não conseguem. Sem rede, sem PyTorch e sem IA
generativa: é uma tabela de consulta e uma média.
"""

from __future__ import annotations

from collections.abc import Mapping
from functools import lru_cache
from pathlib import Path

import numpy as np

from .calendar_data import DATA_DIR
from .preprocess import normalize

ARQUIVO = DATA_DIR / "embeddings-pt-50d.npz"


class WordVectors:
    """Tabela de vetores de palavras (já normalizadas) e a média ponderada de um texto."""

    def __init__(self, words: list[str], vectors: np.ndarray) -> None:
        if len(words) != len(vectors):
            raise ValueError("Cada palavra precisa de um vetor.")
        self._index = {word: i for i, word in enumerate(words)}
        norms = np.linalg.norm(vectors.astype(np.float32), axis=1, keepdims=True)
        # Vetores unitários: cada palavra pesa pela direção, não pela frequência no corpus.
        self._vectors = vectors.astype(np.float32) / np.where(norms == 0, 1.0, norms)

    @property
    def dimension(self) -> int:
        """Número de dimensões de cada vetor."""
        return int(self._vectors.shape[1])

    def __contains__(self, word: str) -> bool:
        return word in self._index

    def __len__(self) -> int:
        return len(self._index)

    def text_vector(self, text: str, weights: Mapping[str, float] | None = None) -> np.ndarray | None:
        """Média ponderada dos vetores das palavras conhecidas do texto, ou ``None`` se nenhuma é
        conhecida (o texto não tem como ser comparado por significado).

        Args:
            text: texto cru; passa por ``normalize``.
            weights: peso de cada palavra (por exemplo, o IDF); sem ele, todas pesam 1.
        """
        total = np.zeros(self.dimension, dtype=np.float32)
        soma = 0.0
        for word in normalize(text).split():
            posicao = self._index.get(word)
            if posicao is None:
                continue
            peso = 1.0 if weights is None else float(weights.get(word, 1.0))
            total += peso * self._vectors[posicao]
            soma += peso
        return total / soma if soma > 0 else None


def load_word_vectors(path: Path = ARQUIVO) -> WordVectors:
    """Lê o recorte de vetores do disco."""
    with np.load(path, allow_pickle=False) as dados:
        return WordVectors([str(p) for p in dados["palavras"]], dados["vetores"])


@lru_cache(maxsize=1)
def default_word_vectors() -> WordVectors:
    """Carrega uma vez e reaproveita (a Function mantém o processo vivo entre chamadas)."""
    return load_word_vectors()
