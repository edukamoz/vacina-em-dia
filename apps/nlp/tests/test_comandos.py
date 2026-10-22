import pytest

from vacina_nlp.chatbot import COMMAND_OF_HOWTO, HOWTO_OF_COMMAND
from vacina_nlp.entities import (
    detect_screen,
    extract_dates,
    extract_names,
    extract_relative_day,
)


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("nasceu em 10/02/2026", ["2026-02-10"]),
        ("dia 7-8-2026 ou 01.02.2025", ["2026-08-07", "2025-02-01"]),
        ("em 21 de janeiro de 2000", ["2000-01-21"]),
        ("para 05/11", ["--11-05"]),
        ("15 de março", ["--03-15"]),
        ("em 31/02/2026", []),
        ("sem data nenhuma", []),
        ("de 10/02/2026 até 5/9", ["2026-02-10", "--09-05"]),
    ],
)
def test_ct_nlp_170_datas_com_e_sem_ano_e_descarta_as_que_nao_existem(texto, esperado):
    assert extract_dates(texto) == esperado


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("tomou hoje", "today"),
        ("tomou ONTEM", "yesterday"),
        ("agendar para amanhã", "tomorrow"),
        ("foi anteontem", "day_before_yesterday"),
        ("agendar para semana que vem", None),
    ],
)
def test_ct_nlp_171_dia_relativo(texto, esperado):
    assert extract_relative_day(texto) == esperado


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("adicionar a Maria nascida em 10/02/2026", ["Maria"]),
        ("cadastrar a Ana Clara da Silva", ["Ana Clara da Silva"]),
        ("agendar a BCG da Lívia para amanhã", ["Lívia"]),
        ("adiciona o theo na familia", ["Theo"]),
        ("marcar a vacina como tomada", []),
        ("agendar em Março", []),
    ],
)
def test_ct_nlp_172_nomes_proprios_sem_confundir_com_vacina_ou_mes(texto, esperado):
    assert extract_names(texto) == esperado


@pytest.mark.parametrize(
    ("texto", "tela"),
    [
        ("abrir o painel de gráficos", "painel"),
        ("me leva para os postos de saúde", "postos"),
        ("mostrar o histórico", "historico"),
        ("abrir a tela do pix", "apoiar"),
        ("ir para a aba família", "familia"),
        ("abrir minha conta", "conta"),
        ("abre as novidades de saúde", "novidades"),
        ("abre a tela de doses", "doses"),
        ("ir para lugar nenhum", None),
    ],
)
def test_ct_nlp_173_tela_pedida(texto, tela):
    assert detect_screen(texto) == tela


def test_ct_nlp_174_pares_de_comando_e_explicacao_se_correspondem():
    assert set(COMMAND_OF_HOWTO.values()) == set(HOWTO_OF_COMMAND)
    assert {HOWTO_OF_COMMAND[c] for c in COMMAND_OF_HOWTO.values()} == set(COMMAND_OF_HOWTO)


@pytest.mark.parametrize(
    ("pergunta", "intencao"),
    [
        ("adicionar a Maria nascida em 10/02/2026", "acao_adicionar_pessoa"),
        ("como adiciono uma pessoa", "como_adicionar_pessoa"),
        ("a Lívia tomou a BCG ontem", "acao_registrar_dose"),
        ("como registro que tomei a BCG", "como_registrar_dose"),
        ("agendar a gripe do João para 05/11/2026", "acao_agendar_dose"),
        ("como agendo uma vacina", "como_agendar_dose"),
        ("abrir o painel de gráficos", "acao_abrir_tela"),
        ("onde vejo os gráficos", "como_ver_graficos"),
        ("tenho vacina atrasada", "conta_doses_atrasadas"),
        ("o que significa dose atrasada", "significado_atrasada"),
        ("quem está na minha família", "conta_quem_na_familia"),
        ("quero pizza", "fora_do_escopo"),
    ],
)
def test_ct_nlp_175_comando_ou_explicacao_conforme_a_forma_da_frase(service, pergunta, intencao):
    assert service.chatbot.reply(pergunta).intent == intencao


def test_ct_nlp_176_comando_devolve_as_entidades_e_nao_dados_da_conta(service):
    resposta = service.chatbot.reply("agendar a gripe do João para 05/11/2026")
    assert resposta.entities == {
        "vaccines": ["influenza trivalente"],
        "names": ["João"],
        "dates": ["2026-11-05"],
        "relativeDay": None,
        "screen": None,
    }
    assert resposta.source["name"]
    assert resposta.fallback is False


def test_ct_nlp_177_perguntas_comuns_nao_trazem_entidades(service):
    assert service.chatbot.reply("para que serve a BCG").entities == {}
    assert service.chatbot.reply("bom dia").entities == {}


def test_ct_nlp_178_comando_com_sintoma_vai_para_a_regra_de_seguranca(service):
    resposta = service.chatbot.reply("registrar que a Maria tomou a vacina e teve febre alta")
    assert resposta.safety is True
    assert resposta.intent == "orientacao_medica"


def test_ct_nlp_179_toda_intencao_nova_tem_resposta_curada_com_fonte(service):
    for intencao in service.chatbot._responses["responses"]:
        entrada = service.chatbot._responses["responses"][intencao]
        assert entrada["text"] and entrada["origin"] in {"app", "calendario"}
