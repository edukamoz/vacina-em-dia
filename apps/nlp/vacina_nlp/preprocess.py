"""Normalização de texto usada no treino, na classificação e na busca."""

from __future__ import annotations

import re
import unicodedata

_NAO_ALFANUMERICO = re.compile(r"[^a-z0-9]+")


def normalize(text: str) -> str:
    """Deixa o texto em minúsculas, sem acentos nem pontuação e com espaços únicos.

    Exemplo: ``"Tríplice Viral, SCR?"`` vira ``"triplice viral scr"``. O mesmo tratamento vale
    para o que a pessoa digita ou fala e para os exemplos de treino, para que "vacina" e "Vacina?"
    sejam a mesma coisa.
    """
    decomposto = unicodedata.normalize("NFKD", text)
    sem_acento = "".join(c for c in decomposto if not unicodedata.combining(c))
    return _NAO_ALFANUMERICO.sub(" ", sem_acento.lower()).strip()
