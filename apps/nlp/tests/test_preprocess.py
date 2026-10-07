import pytest

from vacina_nlp.preprocess import normalize


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("Tríplice Viral, SCR?", "triplice viral scr"),
        ("  VACINA   da   gripe  ", "vacina da gripe"),
        ("Hepatite-B (1ª dose)", "hepatite b 1a dose"),
        ("coração çãõ", "coracao cao"),
        ("????", ""),
        ("", ""),
    ],
)
def test_ct_nlp_10_normaliza_acentos_pontuacao_e_espacos(entrada, esperado):
    assert normalize(entrada) == esperado
