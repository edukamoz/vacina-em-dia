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


# Palavras muito comuns, sem acento. Lista curta, escrita à mão no estilo das listas usuais de
# português; serve só para medir, na avaliação, o efeito de remover stopwords (ver
# docs/07-testes/comparacao-pln.md). Não é usada no chatbot nem na busca em produção.
STOPWORDS_PT = frozenset(
    "a o as os um uma uns umas de da do das dos em no na nos nas e ou que se com por para pra "
    "ao aos ate eu me meu minha voce vc ele ela eles elas isso isto esse essa esses essas este "
    "esta aquele aquela e eh sao sou foi ser ter tem tinha mais mas muito pelo pela pelos pelas "
    "como quando onde qual quais quem nao ja so tambem seu sua".split()
)

# Sufixos removidos por `radical`, do mais longo para o mais curto: uma versão rudimentar, em
# regras simples e transparentes, do que o RSLP faz (remover plural, aumentativo, verbo, etc.).
_SUFIXOS = tuple(
    sorted(
        (
            "amentos", "imentos", "amento", "imento", "adoras", "adores", "acoes", "mente",
            "ancia", "encia", "acao", "idade", "ando", "endo", "indo", "aram", "eram", "avam",
            "ados", "adas", "idos", "idas", "oes", "aes", "ado", "ada", "ido", "ida", "ava",
            "ou", "ei", "ar", "er", "ir", "es", "s",
        ),
        key=len,
        reverse=True,
    )
)
_TAMANHO_MINIMO_DO_RADICAL = 3


def radical(token: str) -> str:
    """Reduz uma palavra (já normalizada) ao radical: tira o sufixo mais longo que deixe ao menos
    3 letras e, por fim, a vogal final (``a``, ``e`` ou ``o``), como o RSLP. Exemplo: ``"vacinas"``,
    ``"vacina"`` e ``"vacinar"`` viram ``"vacin"``. Rudimentar de propósito: ver a comparação em
    ``docs/07-testes/comparacao-pln.md``.
    """
    for sufixo in _SUFIXOS:
        if token.endswith(sufixo) and len(token) - len(sufixo) >= _TAMANHO_MINIMO_DO_RADICAL:
            token = token[: -len(sufixo)]
            break
    if token[-1:] in "aeo" and len(token) - 1 >= _TAMANHO_MINIMO_DO_RADICAL:
        token = token[:-1]
    return token


def normalize_sem_stopwords(text: str) -> str:
    """``normalize`` e remove as stopwords (só para a avaliação comparativa)."""
    return " ".join(t for t in normalize(text).split() if t not in STOPWORDS_PT)


def normalize_com_radical(text: str) -> str:
    """``normalize`` e reduz cada palavra ao radical (só para a avaliação comparativa)."""
    return " ".join(radical(t) for t in normalize(text).split())


def normalize_sem_stopwords_com_radical(text: str) -> str:
    """``normalize``, sem stopwords e com radical (só para a avaliação comparativa)."""
    return " ".join(radical(t) for t in normalize_sem_stopwords(text).split())
