from vacina_nlp.calendar_data import load_calendar
from vacina_nlp.vaccine_info import load_vaccine_info


def test_ct_nlp_145_cada_ficha_aponta_uma_vacina_que_existe_no_calendario():
    info = load_vaccine_info()
    oficiais = set(load_calendar().vaccine_names())
    assert len(info.pointers) >= 15
    for nome, ponteiro in info.pointers.items():
        assert nome in oficiais
        assert ponteiro.vaccine == nome
        assert ponteiro.quadro.startswith("Quadro")
        assert ponteiro.page > 0


def test_ct_nlp_146_a_fonte_e_o_manual_oficial_de_eventos_adversos():
    fonte = load_vaccine_info().source
    assert fonte.publisher == "Ministério da Saúde"
    assert "Eventos Adversos" in fonte.name
    assert fonte.url.startswith("https://www.gov.br/saude/")


def test_ct_nlp_147_vacina_sem_ficha_nao_tem_ponteiro():
    info = load_vaccine_info()
    assert info.pointer_for("BCG") is not None
    assert info.pointer_for("covid-19") is None
    assert info.pointer_for("") is None
