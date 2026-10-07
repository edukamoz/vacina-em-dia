from datetime import date

import pytest

from vacina_nlp.classifier import load_intent_examples
from vacina_nlp.evaluate import (
    F1_TARGET,
    check_no_leak,
    cross_validate,
    evaluate,
    load_noise,
    main,
    render_report,
)


@pytest.fixture(scope="module")
def resultado():
    return evaluate(run_cross_validation=False)


def test_ct_nlp_120_f1_macro_no_conjunto_de_teste_separado_atinge_a_meta(resultado):
    assert resultado.macro_f1 >= F1_TARGET
    assert resultado.accuracy >= F1_TARGET
    assert resultado.test_size >= 100
    assert resultado.intents == 20


def test_ct_nlp_121_toda_intencao_tem_frases_de_teste(resultado):
    assert all(m.support > 0 for m in resultado.per_class)


def test_ct_nlp_122_vazamento_entre_treino_e_teste_e_detectado():
    treino = [("oi", "saudacao"), ("tchau", "despedida")]
    assert check_no_leak(treino, [("Oi ", "saudacao")]) == ["Oi "]
    with pytest.raises(ValueError, match="também estão no treino"):
        evaluate(
            train=[*treino, ("a", "x")],
            test=[("oi", "saudacao")],
            noise=[],
            run_cross_validation=False,
        )


def test_ct_nlp_123_limiar_mais_alto_aceita_menos_perguntas_com_mais_acerto(resultado):
    cobertura = [c for _, c, _ in resultado.thresholds]
    assert cobertura == sorted(cobertura, reverse=True)
    assert resultado.thresholds[-1][2] >= resultado.thresholds[0][2]


def test_ct_nlp_124_validacao_cruzada_roda_so_sobre_o_treino():
    acuracia, f1 = cross_validate(load_intent_examples(), folds=3)
    assert 0.3 < acuracia <= 1.0
    assert 0.3 < f1 <= 1.0


def test_ct_nlp_125_ruido_existe_e_alguns_caem_na_resposta_padrao(resultado):
    assert len(load_noise()) == resultado.noise_total >= 10
    assert resultado.noise_fallback >= 1


def test_ct_nlp_126_relatorio_em_portugues_com_metodo_resultado_e_limitacoes(resultado):
    relatorio = render_report(resultado, date(2026, 10, 7))
    for trecho in (
        "## Método",
        "## Resultado no conjunto de teste",
        "## Limiar de confiança",
        "## Limitações",
        "07/10/2026",
        "TF-IDF",
        "atingida",
    ):
        assert trecho in relatorio


def test_ct_nlp_127_linha_de_comando_imprime_e_grava_o_relatorio(tmp_path, capsys):
    destino = tmp_path / "avaliacao.md"
    assert main(["--write-report", str(destino)]) == 0
    assert "F1 macro" in capsys.readouterr().out
    assert destino.read_text(encoding="utf-8").startswith("# Avaliação do chatbot")
    assert main([]) == 0
