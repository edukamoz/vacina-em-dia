import pytest

from vacina_nlp.calendar_data import load_calendar
from vacina_nlp.classifier import load_intent_examples, load_test_examples
from vacina_nlp.comparacao import (
    build_report,
    compare_models,
    compare_preprocessing,
    main,
    search_extras,
)
from vacina_nlp.evaluate import evaluate
from vacina_nlp.preprocess import (
    STOPWORDS_PT,
    normalize,
    normalize_com_radical,
    normalize_sem_stopwords,
    normalize_sem_stopwords_com_radical,
    radical,
)
from vacina_nlp.search import VaccineSearch


@pytest.mark.parametrize(
    ("palavra", "esperado"),
    [
        ("vacinas", "vacin"),
        ("vacinar", "vacin"),
        ("vacinando", "vacin"),
        ("doses", "dos"),
        ("aplicacao", "aplic"),
        ("atrasada", "atras"),
        ("bcg", "bcg"),
        ("sus", "sus"),
        ("mes", "mes"),
    ],
)
def test_ct_nlp_150_radical_tira_o_sufixo_e_preserva_palavras_curtas(palavra, esperado):
    assert radical(palavra) == esperado


def test_ct_nlp_151_radical_nunca_deixa_menos_de_tres_letras():
    for palavra in ["as", "ser", "tres", "ela", "uns", "ou", "e"]:
        assert len(radical(palavra)) >= min(len(palavra), 3)


def test_ct_nlp_152_remover_stopwords_tira_as_comuns_e_guarda_o_conteudo():
    assert normalize_sem_stopwords("Qual a vacina da gripe?") == "vacina gripe"
    assert "bcg" not in STOPWORDS_PT
    assert normalize_sem_stopwords("de o a") == ""


def test_ct_nlp_153_variantes_partem_da_mesma_normalizacao():
    texto = "As Vacinas da Gripe, por favor!"
    assert normalize(texto) == "as vacinas da gripe por favor"
    assert normalize_com_radical(texto).split()[1] == "vacin"
    assert normalize_sem_stopwords_com_radical(texto) == "vacin grip favor"


@pytest.fixture(scope="module")
def treino_e_teste():
    return load_intent_examples(), load_test_examples()


@pytest.fixture(scope="module")
def modelos(treino_e_teste):
    return compare_models(*treino_e_teste)


def test_ct_nlp_154_compara_seis_modelos_e_a_ultima_linha_e_a_de_producao(modelos):
    assert len(modelos) == 6
    assert "Produção" in modelos[-1].label
    for linha in modelos:
        for valor in (linha.accuracy, linha.macro_f1, linha.cv_accuracy, linha.cv_macro_f1):
            assert 0.0 <= valor <= 1.0


def test_ct_nlp_155_linha_de_producao_bate_com_a_avaliacao_oficial(modelos):
    oficial = evaluate(run_cross_validation=False)
    assert modelos[-1].accuracy == pytest.approx(oficial.accuracy)
    assert modelos[-1].macro_f1 == pytest.approx(oficial.macro_f1)


def test_ct_nlp_156_pre_processamento_tem_quatro_linhas_e_a_primeira_e_a_producao(
    treino_e_teste, modelos
):
    linhas = compare_preprocessing(*treino_e_teste)
    assert len(linhas) == 4
    assert linhas[0].accuracy == pytest.approx(modelos[-1].accuracy)


def test_ct_nlp_157_busca_aceita_sacola_de_palavras_e_rejeita_modo_desconhecido():
    calendar = load_calendar()
    motor = VaccineSearch(calendar, analyzer="bow", lsa_weight=0)
    assert motor.scores("vacina da gripe").max() > 0
    with pytest.raises(ValueError, match="analyzer"):
        VaccineSearch(calendar, analyzer="outro")


def test_ct_nlp_158_busca_comparativa_mede_oito_configuracoes():
    extras = search_extras(load_calendar())
    assert len(extras) == 8
    assert all(0.0 <= m.mrr <= 1.0 and m.total > 0 for _, m in extras)
    # O TF-IDF vale mais que a simples contagem de palavras neste conjunto.
    por_nome = {rotulo: m for rotulo, m in extras}
    assert (
        por_nome["TF-IDF de palavras (configuração B)"].mrr
        > por_nome["Bag-of-Words (contagem de palavras), documento enriquecido"].mrr
    )


def test_ct_nlp_159_relatorio_traz_as_tres_secoes_e_a_ressalva_do_tamanho_do_teste(tmp_path, monkeypatch):
    relatorio = build_report()
    for titulo in (
        "## 1. Classificador de intenções",
        "## 2. Chatbot: pré-processamento",
        "## 3. Busca: vetorização",
        "não dá para afirmar qual é melhor",
    ):
        assert titulo in relatorio
    destino = tmp_path / "comparacao.md"
    monkeypatch.setattr("sys.argv", ["comparacao", "--write-report", str(destino)])
    main()
    assert destino.read_text(encoding="utf-8").startswith("# Comparação das técnicas")
