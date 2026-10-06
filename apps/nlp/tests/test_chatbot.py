import json

import pytest

from vacina_nlp.chatbot import CONFIDENCE_THRESHOLD, Chatbot, load_responses
from vacina_nlp.classifier import load_intent_examples


def chatbot_rigoroso(service):
    """Chatbot com limiar impossível de atingir: toda pergunta cai na resposta padrão."""
    return Chatbot(
        service.chatbot._classifier,  # noqa: SLF001
        service.calendar,
        load_responses(),
        threshold=1.1,
    )


def test_ct_nlp_60_toda_intencao_tem_resposta_curada_com_texto_e_origem():
    respostas = load_responses()["responses"]
    # As três perguntas sobre vacinas são montadas com dados do calendário, sem resposta fixa.
    com_dados_do_calendario = {"vacina_para_que_serve", "vacina_quando", "vacinas_do_grupo"}
    intencoes = {intencao for _, intencao in load_intent_examples()} - com_dados_do_calendario
    assert intencoes <= set(respostas)
    for chave, resposta in respostas.items():
        assert resposta["text"].strip(), chave
        assert resposta["origin"] in {"app", "calendario"}, chave


def test_ct_nlp_61_respostas_nao_dao_orientacao_medica_nem_dose():
    proibidas = ["tome ", "tomar o remédio", " mg", "paracetamol", "dipirona", "diagnóstico é"]
    todos = json.dumps(load_responses(), ensure_ascii=False).lower()
    for palavra in proibidas:
        assert palavra not in todos, palavra


@pytest.mark.parametrize(
    ("pergunta", "intencao"),
    [
        ("bom dia", "saudacao"),
        ("muito obrigado", "despedida_agradecimento"),
        ("o que você faz", "ajuda_o_que_faz"),
        ("como cadastro meu filho", "como_adicionar_pessoa"),
        ("como registro que tomei a vacina", "como_registrar_dose"),
        ("como agendo uma vacina", "como_agendar_dose"),
        ("o que significa dose atrasada", "significado_atrasada"),
        ("o que significa pendente", "significado_estados"),
        ("como cancelo uma dose", "como_cancelar_dose"),
        ("onde vejo o histórico", "como_ver_historico"),
        ("como excluo minha conta", "como_excluir_dados"),
        ("o app pede cpf", "privacidade_dados"),
        ("o calendário é oficial", "fonte_calendario"),
        ("como pergunto por voz", "como_usar_voz"),
        ("o app avisa quando tem vacina", "lembretes"),
        ("qual a previsão do tempo", "fora_do_escopo"),
    ],
)
def test_ct_nlp_62_responde_a_cada_intencao_de_ajuda(service, pergunta, intencao):
    resposta = service.chatbot.reply(pergunta)
    assert resposta.intent == intencao
    assert resposta.text
    assert resposta.fallback is False
    assert resposta.source["name"]


def test_ct_nlp_63_ajuda_do_app_cita_a_ajuda_e_calendario_cita_a_fonte_oficial(service):
    app = service.chatbot.reply("como cadastro meu filho")
    assert app.source == {"name": "Ajuda do Vacina em Dia"}
    oficial = service.chatbot.reply("o calendário é oficial")
    assert oficial.source["url"].startswith("https://www.gov.br/")
    assert oficial.source["version"] == "2026"
    assert "não substitui a caderneta" in oficial.text


@pytest.mark.parametrize(
    "pergunta",
    [
        "meu filho está com febre pode vacinar",
        "tive reação à vacina",
        "qual remédio dar depois da vacina",
        "posso tomar a vacina estando gripado",
        "chamar o samu",
    ],
)
def test_ct_nlp_64_saude_individual_vai_para_profissional_sem_passar_pelo_modelo(
    service, pergunta
):
    resposta = service.chatbot.reply(pergunta)
    assert resposta.intent == "orientacao_medica"
    assert resposta.safety is True
    assert resposta.confidence == 1.0
    assert "192" in resposta.text
    assert "profissional de saúde" in resposta.text


@pytest.mark.parametrize("entrada", ["", "   ", "????", "!!!"])
def test_ct_nlp_65_entrada_vazia_ou_sem_letras_pede_para_repetir(service, entrada):
    resposta = service.chatbot.reply(entrada)
    assert resposta.intent == "vazio"
    assert resposta.fallback is True


def test_ct_nlp_66_baixa_confianca_devolve_resposta_padrao_que_orienta_profissional(service):
    resposta = chatbot_rigoroso(service).reply("como cadastro meu filho")
    assert resposta.intent == "nao_entendi"
    assert resposta.fallback is True
    assert "profissional de saúde" in resposta.text
    assert "unidade de saúde" in resposta.text


def test_ct_nlp_67_baixa_confianca_com_vacina_citada_explica_a_vacina(service):
    resposta = chatbot_rigoroso(service).reply("BCG")
    assert resposta.intent == "vacina_para_que_serve"
    assert "tuberculose" in resposta.text


def test_ct_nlp_68_limiar_documentado():
    assert 0.0 < CONFIDENCE_THRESHOLD < 1.0


def test_ct_nlp_69_resposta_serializa_para_json(service):
    corpo = service.chatbot.reply("bom dia").to_dict()
    assert set(corpo) == {
        "intent",
        "text",
        "confidence",
        "source",
        "suggestions",
        "fallback",
        "safety",
    }
    json.dumps(corpo, ensure_ascii=False)
