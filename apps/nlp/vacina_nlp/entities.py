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


# ---------------------------------------------------------------------------------------------
# Entidades dos comandos do assistente (B61): datas, dia relativo, nomes e tela. Tudo por regras
# transparentes; o assistente só repassa isto ao app, que confirma com a pessoa antes de agir.
# ---------------------------------------------------------------------------------------------

import datetime as _dt  # noqa: E402
import unicodedata as _ud  # noqa: E402


def _fold(text: str) -> str:
    """Minúsculas e sem acento, mas **mantendo** a pontuação (as datas dependem de "/")."""
    sem_acento = "".join(c for c in _ud.normalize("NFKD", text) if not _ud.combining(c))
    return sem_acento.lower()


_MONTHS = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7,
    "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}
_DATE_NUMERIC = re.compile(r"(?<![\d/])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?![\d/])")
_DATE_WORDS = re.compile(
    r"(?<!\d)(\d{1,2})\s+de\s+(" + "|".join(_MONTHS) + r")(?:\s+de\s+(\d{4}))?(?![\w])"
)
_DATE_NO_YEAR = re.compile(r"(?<![\d/.-])(\d{1,2})/(\d{1,2})(?![\d/])")
_RELATIVE = (
    ("anteontem", "day_before_yesterday"),
    ("ontem", "yesterday"),
    ("hoje", "today"),
    ("amanha", "tomorrow"),
)


def _valid(year: int, month: int, day: int) -> bool:
    try:
        _dt.date(year, month, day)
    except ValueError:
        return False
    return True


def extract_dates(text: str) -> list[str]:
    """Datas citadas no texto, na ordem em que aparecem.

    Com ano, vêm em ``AAAA-MM-DD`` ("10/02/2026" ou "10 de fevereiro de 2026"). Sem ano
    ("20/10" ou "3 de março"), vêm em ``--MM-DD`` (ISO 8601 truncado) e o app completa o ano.
    Datas que não existem (31/02) são descartadas.
    """
    normalizado = _fold(text)
    achadas: list[tuple[int, str]] = []
    consumido = normalizado
    for match in _DATE_NUMERIC.finditer(normalizado):
        day, month, year = (int(g) for g in match.groups())
        if _valid(year, month, day):
            achadas.append((match.start(), f"{year:04d}-{month:02d}-{day:02d}"))
        consumido = consumido[: match.start()] + " " * (match.end() - match.start()) + consumido[match.end() :]
    for match in _DATE_WORDS.finditer(consumido):
        day, month = int(match.group(1)), _MONTHS[match.group(2)]
        year = int(match.group(3)) if match.group(3) else None
        if year is not None and _valid(year, month, day):
            achadas.append((match.start(), f"{year:04d}-{month:02d}-{day:02d}"))
        elif year is None and _valid(2000, month, day):
            achadas.append((match.start(), f"--{month:02d}-{day:02d}"))
        consumido = consumido[: match.start()] + " " * (match.end() - match.start()) + consumido[match.end() :]
    for match in _DATE_NO_YEAR.finditer(consumido):
        day, month = int(match.group(1)), int(match.group(2))
        if _valid(2000, month, day):
            achadas.append((match.start(), f"--{month:02d}-{day:02d}"))
    return [date for _, date in sorted(achadas)]


def extract_relative_day(text: str) -> str | None:
    """Dia relativo citado: ``today``, ``yesterday``, ``tomorrow`` ou ``day_before_yesterday``."""
    normalizado = _fold(text)
    for word, key in _RELATIVE:
        if _boundary(word).search(normalizado):
            return key
    return None


# Palavras com inicial maiúscula que não são nome de pessoa.
_NOT_NAMES = frozenset(
    {
        *(m.capitalize() for m in _MONTHS),
        "Marco", "Março", "Hoje", "Ontem", "Amanhã", "Vacina", "Dose", "Eu", "Meu", "Minha", "Nasceu",
        "Nascido", "Nascida", "Dia", "Quero", "Preciso", "Pode", "Registrar", "Marcar", "Agendar",
        "Adicionar", "Cadastrar", "Incluir", "Criar", "Anotar", "Marca", "Agenda", "Adiciona",
        "Cadastra", "Inclui", "Registra", "Anota", "Cria", "Confirma", "Lança", "Tomei", "Aplicada",
        "Dar", "Coloca", "Cadastre", "Adicione", "Inclua", "Agende", "Registre", "Abrir", "Abre",
        "Ir", "Mostrar", "Mostra", "Levar", "Vai", "Me", "O", "A", "Os", "As", "Um", "Uma",
        "Covid", "Gripe", "Dengue", "Hpv", "Bcg", "Pix",
    }
)
_PERSON_WORD = r"[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçà]+"
_PERSON = re.compile(rf"\b({_PERSON_WORD}(?:\s+(?:(?:da|de|do|dos|das)\s+)?{_PERSON_WORD}){{0,2}})\b")
_AFTER_VERB = re.compile(
    r"\b(?:adicionar|adiciona|adicione|cadastrar|cadastra|cadastre|incluir|inclui|inclua|criar|cria)"
    r"\s+(?:(?:a|o|uma|um|minha|meu)\s+)?(?:(?:pessoa|membro|familiar|filha|filho|mae|pai|esposa|marido|"
    r"vovo|vovó|avo|avô|neta|neto|sobrinha|sobrinho|bebe|bebê|irma|irmao)\s+)?(?:chamad[oa]\s+)?"
    r"([a-zà-ú]{2,})",
    re.IGNORECASE,
)
_FILLER = frozenset({"na", "no", "nova", "novo", "uma", "um", "de", "da", "do", "mais", "outra", "outro", "ai", "aqui"})


def extract_names(text: str) -> list[str]:
    """Nomes próprios (com inicial maiúscula) citados no texto, fora a primeira palavra da frase e
    palavras que não são nome (meses, vacinas, verbos). Se o texto estiver todo em minúsculas, tenta
    a palavra que vem logo depois de "adicionar", "cadastrar" etc. É só um palpite: o app mostra o
    nome e a pessoa confirma ou corrige antes de qualquer coisa ser salva.
    """
    palavras = text.strip().split(maxsplit=1)
    resto = palavras[1] if len(palavras) == 2 else ""
    nomes = []
    for match in _PERSON.finditer(resto):
        candidato = match.group(1)
        if candidato.split()[0] in _NOT_NAMES or normalize(candidato) in VACCINE_ALIASES:
            continue
        nomes.append(candidato)
    if not nomes:
        achou = _AFTER_VERB.search(text)
        if achou:
            palavra = achou.group(1)
            if normalize(palavra) not in _FILLER and normalize(palavra) not in VACCINE_ALIASES:
                nomes.append(palavra.capitalize())
    return list(dict.fromkeys(nomes))[:3]


# Telas que o assistente sabe abrir (palavras normalizadas, da mais específica para a mais geral).
_SCREENS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("painel", ("painel", "grafico", "graficos", "estatistica", "estatisticas")),
    ("postos", ("posto", "postos", "mapa", "unidade de saude", "unidades de saude", "ubs")),
    ("historico", ("historico",)),
    ("apoiar", ("pix", "apoiar", "apoio", "doar", "doacao")),
    ("familia", ("familia", "pessoas", "membros")),
    ("conta", ("conta", "perfil", "configuracao", "configuracoes", "preferencias")),
    ("novidades", ("novidade", "novidades", "noticia", "noticias")),
    ("doses", ("dose", "doses", "inicio", "carteira", "vacinas", "calendario")),
)


def detect_screen(text: str) -> str | None:
    """Tela pedida por um comando como "abrir o painel": ``painel``, ``postos``, ``historico``,
    ``apoiar``, ``familia``, ``conta``, ``novidades`` ou ``doses``; ``None`` se nenhuma."""
    normalizado = normalize(text)
    for screen, words in _SCREENS:
        if any(_boundary(word).search(normalizado) for word in words):
            return screen
    return None
