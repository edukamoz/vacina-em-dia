"""Extração de entidades por regras: vacinas citadas e faixa da vida (criança, idoso etc.).

São regras escritas à mão e revisáveis: cada apelido popular aponta para o nome oficial da vacina
no calendário. Um teste confere que todo destino existe no calendário.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .calendar_data import Calendar
from .preprocess import normalize

# Apelido (já normalizado: minúsculas, sem acento) -> nomes oficiais no calendário.
VACCINE_ALIASES: dict[str, tuple[str, ...]] = {
    "bcg": ("BCG",),
    "tuberculose": ("BCG",),
    "penta": ("penta (DTP+Hib+HB)",),
    "pentavalente": ("penta (DTP+Hib+HB)",),
    "hepatite b": ("hepatite B",),
    "hepatite a": ("hepatite A",),
    "hepatite": ("hepatite B", "hepatite A"),
    "polio": ("poliomielite inativada VIP",),
    "poliomielite": ("poliomielite inativada VIP",),
    "paralisia infantil": ("poliomielite inativada VIP",),
    "vip": ("poliomielite inativada VIP",),
    "rotavirus": ("rotavírus humano",),
    "pneumococica": ("pneumocócica 20-valente", "pneumocócica 10-valente"),
    "pneumo": ("pneumocócica 20-valente", "pneumocócica 10-valente"),
    "meningococica": ("meningocócica C", "meningocócica ACWY"),
    "meningite": ("meningocócica C", "meningocócica ACWY"),
    "gripe": ("influenza trivalente",),
    "influenza": ("influenza trivalente",),
    "covid": ("covid-19",),
    "covid 19": ("covid-19",),
    "coronavirus": ("covid-19",),
    "febre amarela": ("febre amarela",),
    "triplice viral": ("tríplice viral SCR",),
    "scr": ("tríplice viral SCR",),
    "sarampo": ("tríplice viral SCR",),
    "caxumba": ("tríplice viral SCR",),
    "rubeola": ("tríplice viral SCR",),
    "dtp": ("DTP",),
    "dt": ("dT",),
    "dtpa": ("dTpa",),
    "difteria": ("DTP", "dT", "dTpa"),
    "tetano": ("DTP", "dT", "dTpa"),
    "coqueluche": ("DTP", "dTpa"),
    "varicela": ("varicela",),
    "catapora": ("varicela",),
    "hpv": ("HPV4",),
    "papilomavirus": ("HPV4",),
    "dengue": ("DNG4",),
    "dng4": ("DNG4",),
    "vsr": ("vírus sincicial respiratório (VVSR)",),
    "vvsr": ("vírus sincicial respiratório (VVSR)",),
    "sincicial": ("vírus sincicial respiratório (VVSR)",),
    "bronquiolite": ("vírus sincicial respiratório (VVSR)",),
}

# Palavra (normalizada) -> faixa do calendário.
GROUP_KEYWORDS: dict[str, str] = {
    "crianca": "CHILD",
    "criancas": "CHILD",
    "bebe": "CHILD",
    "bebes": "CHILD",
    "recem nascido": "CHILD",
    "infantil": "CHILD",
    "adolescente": "ADOLESCENT_YOUTH",
    "adolescentes": "ADOLESCENT_YOUTH",
    "jovem": "ADOLESCENT_YOUTH",
    "jovens": "ADOLESCENT_YOUTH",
    "adulto": "ADULT",
    "adultos": "ADULT",
    "idoso": "ELDERLY",
    "idosos": "ELDERLY",
    "idosa": "ELDERLY",
    "terceira idade": "ELDERLY",
    "gestante": "PREGNANT",
    "gestantes": "PREGNANT",
    "gravida": "PREGNANT",
    "gravidez": "PREGNANT",
    "gestacao": "PREGNANT",
}

_ANOS = re.compile(r"(?<!\d)(\d{1,3})\s*anos?\b")
_MESES = re.compile(r"(?<!\d)(\d{1,3})\s*mes(?:es)?\b")


def _boundary(phrase: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])")


_ALIAS_PATTERNS = [
    (alias, _boundary(alias)) for alias in sorted(VACCINE_ALIASES, key=len, reverse=True)
]
_GROUP_PATTERNS = [
    (word, _boundary(word)) for word in sorted(GROUP_KEYWORDS, key=len, reverse=True)
]


def extract_vaccines(text: str, calendar: Calendar) -> list[str]:
    """Nomes oficiais das vacinas citadas no texto, sem repetição e na ordem em que aparecem.

    Os apelidos mais longos valem primeiro e o trecho encontrado é "consumido": ao dizer
    "hepatite B", não entra também o apelido genérico "hepatite".
    """
    restante = normalize(text)
    achadas: list[tuple[int, str]] = []
    for alias, pattern in _ALIAS_PATTERNS:
        for match in pattern.finditer(restante):
            for name in VACCINE_ALIASES[alias]:
                achadas.append((match.start(), name))
            restante = restante[: match.start()] + " " * (match.end() - match.start()) + restante[match.end() :]
    oficiais = set(calendar.vaccine_names())
    ordenadas = [name for _, name in sorted(achadas, key=lambda item: item[0]) if name in oficiais]
    return list(dict.fromkeys(ordenadas))


@dataclass(frozen=True)
class GroupMention:
    """Faixa da vida citada, com a idade em meses quando a pessoa a informou."""

    group: str
    age_months: int | None = None


def detect_group(text: str) -> GroupMention | None:
    """Descobre a faixa do calendário citada: por palavra ("idoso") ou por idade ("30 anos").

    A idade segue os limites oficiais: criança até 9 anos, adolescente e jovem até 24, adulto
    até 59 e idoso a partir de 60.
    """
    normalizado = normalize(text)
    anos = _ANOS.search(normalizado)
    meses = _MESES.search(normalizado)
    idade_meses: int | None = None
    if anos:
        idade_meses = int(anos.group(1)) * 12
    elif meses:
        idade_meses = int(meses.group(1))
    if idade_meses is not None:
        if idade_meses < 120:
            return GroupMention("CHILD", idade_meses)
        if idade_meses < 300:
            return GroupMention("ADOLESCENT_YOUTH", idade_meses)
        if idade_meses < 720:
            return GroupMention("ADULT", idade_meses)
        return GroupMention("ELDERLY", idade_meses)
    for word, pattern in _GROUP_PATTERNS:
        if pattern.search(normalizado):
            return GroupMention(GROUP_KEYWORDS[word])
    return None
