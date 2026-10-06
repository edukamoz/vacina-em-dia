import pytest

from vacina_nlp.entities import (
    GROUP_KEYWORDS,
    VACCINE_ALIASES,
    GroupMention,
    detect_group,
    extract_vaccines,
)


def test_ct_nlp_30_todo_apelido_aponta_para_vacina_que_existe_no_calendario(calendar):
    oficiais = set(calendar.vaccine_names())
    for alias, destinos in VACCINE_ALIASES.items():
        for nome in destinos:
            assert nome in oficiais, f"{alias} -> {nome}"


def test_ct_nlp_31_toda_faixa_de_palavra_chave_existe():
    assert set(GROUP_KEYWORDS.values()) <= {
        "CHILD",
        "ADOLESCENT_YOUTH",
        "ADULT",
        "ELDERLY",
        "PREGNANT",
    }


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("para que serve a BCG?", ["BCG"]),
        ("vacina da gripe", ["influenza trivalente"]),
        ("a vacina contra catapora", ["varicela"]),
        ("Tríplice viral", ["tríplice viral SCR"]),
        ("hepatite B", ["hepatite B"]),
        ("hepatite", ["hepatite B", "hepatite A"]),
        ("a pólio e a BCG", ["poliomielite inativada VIP", "BCG"]),
        ("dtpa", ["dTpa"]),
        ("dt", ["dT"]),
        ("vacina de febre amarela", ["febre amarela"]),
        ("não cito nenhuma", []),
        ("", []),
    ],
)
def test_ct_nlp_32_extrai_vacinas_pelos_apelidos(calendar, texto, esperado):
    assert extract_vaccines(texto, calendar) == esperado


def test_ct_nlp_33_apelido_longo_consome_o_curto(calendar):
    # "hepatite b" não deve trazer também a hepatite A pelo apelido genérico "hepatite".
    assert extract_vaccines("hepatite b", calendar) == ["hepatite B"]


def test_ct_nlp_34_palavra_dentro_de_outra_nao_conta(calendar):
    assert extract_vaccines("gripezinha", calendar) == []
    assert extract_vaccines("vipassana", calendar) == []


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("vacinas do idoso", GroupMention("ELDERLY")),
        ("quais vacinas para gestante", GroupMention("PREGNANT")),
        ("o que o adulto precisa", GroupMention("ADULT")),
        ("lista de vacinas do bebê", GroupMention("CHILD")),
        ("vacinas para jovens", GroupMention("ADOLESCENT_YOUTH")),
        ("quem tem 30 anos", GroupMention("ADULT", 360)),
        ("pessoa de 65 anos", GroupMention("ELDERLY", 780)),
        ("meu filho de 2 anos", GroupMention("CHILD", 24)),
        ("vacinas aos 2 meses", GroupMention("CHILD", 2)),
        ("aos 15 anos", GroupMention("ADOLESCENT_YOUTH", 180)),
        ("aos 9 anos", GroupMention("CHILD", 108)),
        ("aos 10 anos", GroupMention("ADOLESCENT_YOUTH", 120)),
        ("aos 24 anos", GroupMention("ADOLESCENT_YOUTH", 288)),
        ("aos 25 anos", GroupMention("ADULT", 300)),
        ("aos 60 anos", GroupMention("ELDERLY", 720)),
        ("sem faixa nenhuma", None),
    ],
)
def test_ct_nlp_35_detecta_faixa_por_palavra_e_por_idade(texto, esperado):
    assert detect_group(texto) == esperado
