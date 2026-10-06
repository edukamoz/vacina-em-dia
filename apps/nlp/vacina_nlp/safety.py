"""Regras de segurança: pergunta sobre saúde individual nunca é respondida pelo classificador.

O assistente não dá orientação médica, diagnóstico nem dose de remédio. Estas regras olham sinais
claros (sintoma, reação, remédio, "posso tomar...", emergência) **antes** de qualquer modelo. O
nome "febre amarela" não é sintoma: a regra de febre o ignora.
"""

from __future__ import annotations

import re

from .preprocess import normalize

_PADROES_TEXTO = [
    r"(?<!quando )posso (tomar|vacinar|levar|dar)\b",
    r"\b(reacao|reacoes|efeito colateral|efeitos colaterais)\b",
    r"\b(alergia|alergico|alergica)\b",
    r"\b(sintoma|sintomas|diagnostico)\b",
    r"\b(remedio|remedios|medicamento|medicamentos|paracetamol|dipirona|ibuprofeno|antibiotico)\b",
    r"\bfebre\b(?! amarela)",
    r"\b(passar mal|passou mal|passei mal|desmai\w*|convuls\w*|vomit\w*|falta de ar)\b",
    r"\b(inchado|inchada|inchaco|manchas?)\b",
    r"\b(emergencia|urgencia|socorro|samu|pronto socorro|upa|hospital)\b",
    r"\b(esta|estou|ficou|estava|estao) (com )?(tosse|dor|gripe|resfriado|diarreia|coriza)\b",
    r"\bestou (doente|gripado|gripada|sentindo)\b",
    r"\bisso e grave\b",
]
_PADROES = [re.compile(padrao) for padrao in _PADROES_TEXTO]


def needs_professional(text: str) -> bool:
    """Indica se a pergunta é sobre a saúde de uma pessoa e deve ir a um profissional."""
    normalizado = normalize(text)
    return any(padrao.search(normalizado) for padrao in _PADROES)
