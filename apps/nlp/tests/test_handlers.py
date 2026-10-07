import json

import pytest

from vacina_nlp.handlers import MAX_TEXT_LENGTH, handle_chat, handle_health, handle_search


def corpo(texto):
    return json.dumps({"text": texto}).encode("utf-8")


def test_ct_nlp_100_chat_responde_200_com_a_resposta(service):
    status, body = handle_chat(service, corpo("bom dia"))
    assert status == 200
    assert body["intent"] == "saudacao"


@pytest.mark.parametrize(
    "bruto",
    [None, b"", b"nao e json", b"[]", b'{"text": 5}', b'{"outro": "x"}', b"\xff\xfe"],
)
def test_ct_nlp_101_corpo_invalido_devolve_400_sem_repetir_o_que_foi_enviado(service, bruto):
    for tratar in (handle_chat, handle_search):
        status, body = tratar(service, bruto)
        assert status == 400
        assert body["code"] == "VALIDATION_ERROR"
        assert "nao e json" not in json.dumps(body)


def test_ct_nlp_102_texto_longo_demais_e_recusado(service):
    status, body = handle_chat(service, corpo("a" * (MAX_TEXT_LENGTH + 1)))
    assert status == 400
    assert str(MAX_TEXT_LENGTH) in body["message"]
    assert handle_chat(service, corpo("a" * MAX_TEXT_LENGTH))[0] == 200


def test_ct_nlp_103_texto_vazio_devolve_200_pedindo_para_repetir(service):
    status, body = handle_chat(service, corpo("   "))
    assert status == 200
    assert body["intent"] == "vazio"


def test_ct_nlp_104_busca_devolve_resultados_fonte_e_aviso(service):
    status, body = handle_search(service, corpo("bcg"))
    assert status == 200
    assert body["results"][0]["vaccine"] == "BCG"
    assert body["source"]["version"] == "2026"
    assert "não substitui a caderneta oficial" in body["notice"]


def test_ct_nlp_105_busca_sem_resultado_devolve_lista_vazia(service):
    status, body = handle_search(service, corpo("xyzabc"))
    assert status == 200
    assert body["results"] == []


def test_ct_nlp_106_health_informa_modelo_e_versao_do_calendario(service):
    status, body = handle_health(service)
    assert status == 200
    assert body == {
        "status": "ok",
        "service": "vacina-em-dia-nlp",
        "intents": 20,
        "calendarVersion": "2026",
    }
