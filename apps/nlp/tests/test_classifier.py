import re

import pytest

from vacina_nlp.classifier import (
    IntentClassifier,
    load_intent_examples,
    load_test_examples,
    trained_classifier,
)


def test_ct_nlp_50_dataset_tem_exemplos_suficientes_por_intencao():
    por_intencao: dict[str, int] = {}
    for _, intencao in load_intent_examples():
        por_intencao[intencao] = por_intencao.get(intencao, 0) + 1
    assert len(por_intencao) == 20
    assert min(por_intencao.values()) >= 20


def test_ct_nlp_51_dataset_nao_tem_frase_repetida_nem_vazamento_para_o_teste():
    treino = [t.strip().lower() for t, _ in load_intent_examples()]
    teste = [t.strip().lower() for t, _ in load_test_examples()]
    assert len(treino) == len(set(treino))
    assert not set(treino) & set(teste)


def test_ct_nlp_52_dataset_nao_tem_dado_pessoal():
    texto = " ".join(t for t, _ in load_intent_examples() + load_test_examples())
    assert not re.search(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}", texto)  # CPF
    assert "@" not in texto
    assert not re.search(r"\(?\d{2}\)?\s?9?\d{4}-?\d{4}", texto)  # telefone


def test_ct_nlp_53_treina_e_conhece_todas_as_intencoes():
    esperadas = {intencao for _, intencao in load_intent_examples()}
    assert set(trained_classifier().intents) == esperadas


def test_ct_nlp_54_resultado_e_deterministico():
    exemplos = load_intent_examples()
    a = IntentClassifier.train(exemplos).predict("como cadastro meu filho")
    b = IntentClassifier.train(exemplos).predict("como cadastro meu filho")
    assert a == b


def test_ct_nlp_55_probabilidades_somam_um_e_a_maior_e_a_confianca():
    previsao = trained_classifier().predict("o que significa dose atrasada")
    assert previsao.intent == "significado_atrasada"
    assert sum(previsao.scores.values()) == pytest.approx(1.0)
    assert previsao.confidence == max(previsao.scores.values())


def test_ct_nlp_56_tolera_erro_de_digitacao_e_caixa_alta():
    modelo = trained_classifier()
    assert modelo.predict("como cadastro meu filhooo").intent == "como_adicionar_pessoa"
    assert modelo.predict("COMO EXCLUO MINHA CONTA???").intent == "como_excluir_dados"


def test_ct_nlp_57_recusa_treino_invalido():
    with pytest.raises(ValueError, match="vazia"):
        IntentClassifier.train([("oi", "a"), ("?", "b")])
    with pytest.raises(ValueError, match="duas intenções"):
        IntentClassifier.train([("oi", "a"), ("olá", "a")])


def test_ct_nlp_58_prediz_varias_frases_de_uma_vez():
    previsoes = trained_classifier().predict_many(["bom dia", "obrigado"])
    assert [p.intent for p in previsoes] == ["saudacao", "despedida_agradecimento"]
