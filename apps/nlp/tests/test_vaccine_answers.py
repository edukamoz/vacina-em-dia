import pytest

from vacina_nlp.chatbot import Chatbot


def test_ct_nlp_70_para_que_serve_usa_as_doencas_do_calendario_oficial(service):
    r = service.chatbot.reply("para que serve a BCG")
    assert r.intent == "vacina_para_que_serve"
    assert "BCG: protege contra" in r.text
    assert "tuberculose" in r.text
    assert r.source["name"].startswith("Calendário Nacional de Vacinação 2026")


def test_ct_nlp_71_para_que_serve_trata_apelido_popular(service):
    r = service.chatbot.reply("a vacina da catapora protege contra o quê")
    assert "varicela: protege contra varicela (catapora)" in r.text


def test_ct_nlp_72_sem_vacina_citada_pergunta_qual(service):
    r = service.chatbot.reply("para que serve essa vacina")
    assert r.intent == "vacina_para_que_serve"
    assert "Sobre qual vacina" in r.text


def test_ct_nlp_73_quando_mostra_faixa_dose_e_momento_do_calendario(service):
    r = service.chatbot.reply("quando toma a vacina HPV")
    assert r.intent == "vacina_quando"
    assert "Criança: 1 dose, 9 anos" in r.text
    assert "Adolescente e jovem: 1 dose, conforme histórico vacinal" in r.text


def test_ct_nlp_74_quando_marca_dose_que_depende_de_condicoes(service):
    r = service.chatbot.reply("quando toma a vacina de febre amarela")
    assert "depende de condições" in r.text


def test_ct_nlp_75_quando_sem_vacina_citada_pergunta_qual(service):
    r = service.chatbot.reply("quando toma a vacina")
    assert r.intent == "vacina_quando"
    assert "Sobre qual vacina" in r.text


def test_ct_nlp_76_responde_ate_tres_vacinas_por_vez(service):
    r = service.chatbot.reply("para que serve a bcg, a penta, a pólio, a hpv e a gripe")
    assert r.text.count("protege contra") <= 3


@pytest.mark.parametrize(
    ("pergunta", "trecho"),
    [
        ("vacinas do idoso", "influenza trivalente"),
        ("quais vacinas para gestante", "dTpa"),
        ("o que o adulto precisa tomar", "hepatite B"),
        ("vacinas para jovens", "meningocócica ACWY"),
        ("calendário infantil completo", "Vacinas do calendário para criança"),
    ],
)
def test_ct_nlp_77_lista_as_vacinas_do_grupo(service, pergunta, trecho):
    r = service.chatbot.reply(pergunta)
    assert r.intent == "vacinas_do_grupo"
    assert trecho in r.text
    assert "profissional de saúde" in r.text


def test_ct_nlp_78_crianca_com_idade_mostra_so_as_vacinas_daquela_idade(service):
    r = service.chatbot.reply("quais vacinas toma aos 2 meses")
    assert "Aos 2 meses" in r.text
    assert "penta" in r.text and "rotavírus" in r.text
    assert "BCG" not in r.text


def test_ct_nlp_79_crianca_em_idade_sem_vacina_aponta_a_proxima(service):
    texto = Chatbot._child_at_age(service.calendar.rules_in_group("CHILD"), 11)  # noqa: SLF001
    assert "próxima indicação é 12 meses" in texto


def test_ct_nlp_80_crianca_acima_da_faixa_manda_ver_a_do_adolescente(service):
    texto = Chatbot._child_at_age(service.calendar.rules_in_group("CHILD"), 200)  # noqa: SLF001
    assert "adolescente" in texto


def test_ct_nlp_81_grupo_nao_citado_pergunta_para_qual_fase(service):
    r = service.chatbot.reply("calendário de vacinas completo")
    assert r.intent in {"vacinas_do_grupo", "nao_entendi", "fonte_calendario"}
    if r.intent == "vacinas_do_grupo":
        assert "Para qual fase da vida" in r.text
