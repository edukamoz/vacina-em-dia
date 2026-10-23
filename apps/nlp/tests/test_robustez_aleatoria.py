"""Testes aleatórios de robustez do assistente (Random Testing, aula de caixa preta).

Entradas geradas sem roteiro, com semente fixa: a mesma execução se repete igual e uma falha pode
ser investigada. O que se verifica não é a intenção acertada, e sim que o serviço não quebra, não
devolve resposta vazia e não inventa entidade inválida diante de texto inesperado.
"""

import random
import re

import pytest

from vacina_nlp.chatbot import CONFIDENCE_THRESHOLD
from vacina_nlp.classifier import load_intent_examples
from vacina_nlp.entities import (
    detect_screen,
    extract_dates,
    extract_names,
    extract_relative_day,
)

SEMENTE = 20261022

_ALFABETO = (
    list("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    + list(" /-.,:;!?()'\"@#%&*+=<>")
    + list("áéíóúâêôãõçÁÉÍÓÚÇñü")
    + ["😀", "\n", "\t", "\u0000", "​", "٣", "０"]
)
_PALAVRAS = [
    "adicionar", "agendar", "registrar", "tomou", "vacina", "BCG", "gripe", "Maria", "João",
    "hoje", "ontem", "amanhã", "dia", "de", "março", "para", "a", "o", "como", "onde", "gráficos",
    "pix", "febre", "10/02/2026", "31/02/2026", "5-9", "2026", "abrir", "tela", "postos",
]


def _textos(quantidade: int) -> list[str]:
    sorteio = random.Random(SEMENTE)
    textos: list[str] = ["", " ", "\n\n", "a" * 5000, "/" * 300, "1/1/1/1/1/1", "0/0/0000"]
    while len(textos) < quantidade:
        tipo = sorteio.randint(0, 2)
        if tipo == 0:
            textos.append("".join(sorteio.choices(_ALFABETO, k=sorteio.randint(1, 120))))
        elif tipo == 1:
            textos.append(" ".join(sorteio.choices(_PALAVRAS, k=sorteio.randint(1, 14))))
        else:
            dia, mes, ano = sorteio.randint(0, 40), sorteio.randint(0, 15), sorteio.randint(0, 3000)
            sep = sorteio.choice(["/", "-", ".", " de "])
            textos.append(f"agendar para {dia}{sep}{mes}{sep}{ano}")
    return textos


_DATA_COM_ANO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATA_SEM_ANO = re.compile(r"^--\d{2}-\d{2}$")


def test_ct_nlp_180_extratores_nunca_quebram_e_so_devolvem_formatos_validos():
    for texto in _textos(1500):
        for data in extract_dates(texto):
            assert _DATA_COM_ANO.match(data) or _DATA_SEM_ANO.match(data), (texto, data)
            mes = int(data[-5:-3])
            dia = int(data[-2:])
            assert 1 <= mes <= 12 and 1 <= dia <= 31, (texto, data)
        assert extract_relative_day(texto) in {
            None, "today", "yesterday", "tomorrow", "day_before_yesterday",
        }, texto
        for nome in extract_names(texto):
            assert nome.strip() == nome and nome, (texto, nome)
            assert not any(ch.isdigit() for ch in nome), (texto, nome)
        tela = detect_screen(texto)
        assert tela is None or isinstance(tela, str), texto


def test_ct_nlp_181_assistente_responde_a_qualquer_texto_sem_quebrar(service):
    intencoes = {intencao for _, intencao in load_intent_examples()}
    for texto in _textos(600):
        resposta = service.chatbot.reply(texto)
        assert resposta.text.strip(), repr(texto)
        assert resposta.source.get("name"), repr(texto)
        assert resposta.intent in intencoes | {"baixa_confianca"} or resposta.fallback, (
            repr(texto),
            resposta.intent,
        )
        assert 0.0 <= resposta.confidence <= 1.0, repr(texto)
        assert isinstance(resposta.fallback, bool) and isinstance(resposta.safety, bool)
        if resposta.fallback:
            assert resposta.confidence < CONFIDENCE_THRESHOLD or resposta.intent == "fora_do_escopo", (
                repr(texto)
            )


def test_ct_nlp_182_texto_de_comando_aleatorio_nunca_vira_dado_da_conta(service):
    # O serviço só entende a frase: a resposta nunca traz dados que não estavam no texto.
    for texto in _textos(300):
        entidades = service.chatbot.reply(texto).entities
        if not entidades:
            continue
        assert set(entidades) == {"vaccines", "names", "dates", "relativeDay", "screen"}, repr(texto)
        for nome in entidades["names"]:
            assert nome.lower() in texto.lower() or nome in texto.title(), (repr(texto), nome)


@pytest.mark.parametrize("texto", ["", "   ", "\n"])
def test_ct_nlp_183_texto_vazio_cai_na_resposta_padrao(service, texto):
    resposta = service.chatbot.reply(texto)
    assert resposta.text.strip()
    assert resposta.fallback is True or resposta.intent == "fora_do_escopo"
