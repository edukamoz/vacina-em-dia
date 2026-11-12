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
        "entities",
    }
    json.dumps(corpo, ensure_ascii=False)


@pytest.mark.parametrize(
    ("pergunta", "vacina", "quadro", "pagina"),
    [
        ("quais as reações da vacina bcg", "BCG", "Quadros 11 e 12", 129),
        ("a vacina da febre amarela dá reação?", "febre amarela", "Quadro 20", 159),
        ("quais os efeitos colaterais da vacina hepatite b", "hepatite B", "Quadro 26", 171),
    ],
)
def test_ct_nlp_140_reacoes_apontam_o_quadro_do_manual_oficial(service, pergunta, vacina, quadro, pagina):
    resposta = service.chatbot.reply(pergunta)
    assert resposta.intent == "vacina_reacoes"
    assert resposta.safety is False
    assert f"{quadro}, página {pagina}" in resposta.text
    assert "Manual de Vigilância Epidemiológica de Eventos Adversos Pós-Vacinação" in resposta.text
    assert "192" in resposta.text and "serviço de saúde" in resposta.text
    assert resposta.entities == {"vaccines": [vacina]}
    assert resposta.source["url"].startswith("https://www.gov.br/saude/")


def test_ct_nlp_141_sem_citar_a_vacina_orienta_a_dizer_qual_e_aponta_o_aplicativo(service):
    resposta = service.chatbot.reply("quais são as reações comuns das vacinas")
    assert resposta.intent == "vacina_reacoes"
    assert "Sobre esta vacina" in resposta.text
    assert "192" in resposta.text


def test_ct_nlp_142_vacina_sem_ficha_diz_que_ainda_nao_tem_o_quadro(service):
    resposta = service.chatbot.reply("quais as reações da vacina covid")
    assert resposta.intent == "vacina_reacoes"
    assert "covid-19: ainda não tenho o quadro de reações desta vacina" in resposta.text


@pytest.mark.parametrize(
    "pergunta",
    [
        "tive reação à vacina bcg o que faço",
        "minha filha ficou com o braço inchado depois da vacina",
        "estou com febre depois da vacina da gripe, quais as reações",
    ],
)
def test_ct_nlp_143_caso_pessoal_nunca_recebe_a_resposta_de_reacoes(service, pergunta):
    resposta = service.chatbot.reply(pergunta)
    assert resposta.intent == "orientacao_medica"
    assert resposta.safety is True


def test_ct_nlp_144_a_resposta_de_reacoes_nao_traz_dose_nem_remedio(service):
    resposta = service.chatbot.reply("quais as reações da vacina hpv")
    texto = resposta.text.lower()
    for proibida in ["paracetamol", "dipirona", " mg", "tome "]:
        assert proibida not in texto
