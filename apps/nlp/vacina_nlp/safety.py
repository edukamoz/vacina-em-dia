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


# Pergunta geral sobre as reações de uma vacina ("quais as reações da vacina X?"). Não é saúde
# individual, e o assistente aponta o manual oficial em vez de encaminhar.
_PERGUNTA_GERAL_DE_REACOES = re.compile(
    r"\b(quais|que) (sao )?(as |os )?(reacoes|efeitos colaterais|eventos adversos)\b"
    r"|\b(reacoes|efeitos colaterais|eventos adversos) (comuns|esperad\w+|possiveis|da|das|de|do|dos)\b"
    r"|\b(da|tem|causa|provoca) (reacao|reacoes|efeito colateral|efeitos colaterais)\b"
    r"|\bo que e (uma )?(reacao|efeito colateral|evento adverso)\b"
)
# Sinais de que a pessoa fala do próprio caso (ou de alguém próximo) e precisa de um profissional.
# "esta" fica de fora de propósito: sem acento, "está" e "esta vacina" são a mesma palavra.
_CASO_PESSOAL = re.compile(
    r"\b(tive|tenho|tinha|meu|minha|meus|minhas|estou|estava|ficou|fiquei|devo|preciso|posso|"
    r"faco|fazer|passei|passou|apareceu|apareceram)\b"
)
# Os demais sinais de risco (sintoma, remédio, emergência...), sem o de "reação".
# "Perigoso" e "grave" mostram preocupação com risco, e isso vai a um profissional.
_OUTROS_SINAIS = [p for p in _PADROES if "reacao" not in p.pattern] + [
    re.compile(r"\b(perigos\w*|grave|graves|gravissim\w*)\b")
]


def is_general_reaction_question(text: str) -> bool:
    """Pergunta geral sobre as reações de uma vacina: sem relato de caso e sem outro sinal de risco."""
    normalizado = normalize(text)
    return (
        _PERGUNTA_GERAL_DE_REACOES.search(normalizado) is not None
        and _CASO_PESSOAL.search(normalizado) is None
        and not any(p.search(normalizado) for p in _OUTROS_SINAIS)
    )


def needs_professional(text: str) -> bool:
    """Indica se a pergunta é sobre a saúde de uma pessoa e deve ir a um profissional."""
    if is_general_reaction_question(text):
        return False
    normalizado = normalize(text)
    return any(padrao.search(normalizado) for padrao in _PADROES)
