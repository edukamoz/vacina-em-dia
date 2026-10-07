import sys

import numpy as np
import pytest

from vacina_nlp import search_evaluate
from vacina_nlp.search import MIN_SCORE, VaccineSearch, build_documents
from vacina_nlp.search_evaluate import (
    Query,
    build_report,
    configurations,
    evaluate,
    load_test_set,
    rank_of,
    threshold_analysis,
)


@pytest.fixture(scope="module")
def conjunto(calendar):
    return load_test_set(calendar)


@pytest.mark.parametrize(
    ("consulta", "esperada"),
    [
        ("vacina contra tuberculoze", "BCG"),
        ("vassina da gripe", "influenza trivalente"),
        ("vacina contra poliomielite infantil", "poliomielite inativada VIP"),
        ("vacina da catapura", "varicela"),
    ],
)
def test_ct_nlp_130_tolera_erro_de_transcricao_da_fala(calendar, consulta, esperada):
    resultados = VaccineSearch(calendar).search(consulta)
    assert resultados, consulta
    assert resultados[0].vaccine == esperada


def test_ct_nlp_131_consulta_de_grupo_traz_vacinas_do_grupo(calendar):
    gestante = {rule.vaccine for rule in calendar.rules_in_group("PREGNANT")}
    nomes = {hit.vaccine for hit in VaccineSearch(calendar).search("vacinas para gestante")[:3]}
    assert nomes & gestante


def test_ct_nlp_132_parametros_invalidos_sao_recusados(calendar):
    with pytest.raises(ValueError, match="lsa_weight"):
        VaccineSearch(calendar, lsa_weight=1.5)
    with pytest.raises(ValueError, match="analyzer"):
        VaccineSearch(calendar, analyzer="outro")


def test_ct_nlp_133_o_indice_e_deterministico_e_as_notas_ficam_entre_0_e_1(calendar):
    a, b = VaccineSearch(calendar), VaccineSearch(calendar)
    for consulta in ("bcg", "vacina contra tétano", "hepatite"):
        notas = a.scores(consulta)
        assert np.array_equal(notas, b.scores(consulta))
        assert notas.min() >= 0.0 and notas.max() <= 1.0 + 1e-9
        assert len(notas) == len(a.names)


def test_ct_nlp_134_sem_lsa_a_nota_e_so_a_do_tfidf_e_so_lsa_tambem_funciona(calendar):
    puro = VaccineSearch(calendar, lsa_weight=0)
    so_lsa = VaccineSearch(calendar, lsa_weight=1.0)
    assert puro.scores("bcg").argmax() == puro.names.index("BCG")
    assert so_lsa.scores("bcg").argmax() == so_lsa.names.index("BCG")


def test_ct_nlp_135_consulta_vazia_tem_nota_zero(calendar):
    assert not VaccineSearch(calendar).scores("   ").any()


def test_ct_nlp_136_documento_enriquecido_traz_faixas_e_momentos(calendar):
    nomes, basico = build_documents(calendar, enriched=False)
    _, rico = build_documents(calendar, enriched=True)
    indice = nomes.index("BCG")
    assert len(rico[indice]) > len(basico[indice])
    assert "Criança" in rico[indice] and "Criança" not in basico[indice]


def test_ct_nlp_137_perguntas_fora_do_tema_quase_nunca_devolvem_vacina(calendar, conjunto):
    _, fora = conjunto
    motor = VaccineSearch(calendar)
    sem_resultado = sum(motor.search(pergunta) == [] for pergunta in fora)
    assert sem_resultado >= int(0.9 * len(fora))


def test_ct_nlp_138_o_limiar_nunca_devolve_nota_abaixo_dele(calendar):
    for hit in VaccineSearch(calendar).search("vacina contra tétano e difteria"):
        assert hit.score >= MIN_SCORE


def test_ct_nlp_140_conjunto_de_teste_usa_so_nomes_oficiais_e_tem_categorias(calendar, conjunto):
    consultas, fora = conjunto
    oficiais = set(calendar.vaccine_names())
    for consulta in consultas:
        assert consulta.accepted, consulta.text
        assert consulta.accepted <= oficiais, consulta.text
    assert len(consultas) >= 50 and len(fora) >= 10
    assert {"nome", "doenca", "parafrase", "voz", "vocabulario_ausente", "grupo"} == {
        c.category for c in consultas
    }


def test_ct_nlp_141_consulta_de_grupo_tira_a_resposta_do_calendario(calendar, conjunto):
    consultas, _ = conjunto
    idosos = next(c for c in consultas if c.text == "vacinas para idoso")
    assert idosos.accepted == {r.vaccine for r in calendar.rules_in_group("ELDERLY")}


def test_ct_nlp_142_posicao_e_metricas_de_uma_consulta_conhecida(calendar):
    motor = VaccineSearch(calendar)
    assert rank_of(motor, Query("bcg", frozenset({"BCG"}), "nome")) == 1
    assert rank_of(motor, Query("bcg", frozenset({"inexistente"}), "nome")) is None
    metricas = evaluate(motor, [Query("bcg", frozenset({"BCG"}), "nome")])
    assert (metricas.hit_at_1, metricas.hit_at_3, metricas.mrr) == (1.0, 1.0, 1.0)


def test_ct_nlp_143_o_padrao_supera_o_indice_original_com_folga(calendar, conjunto):
    consultas, _ = conjunto
    resultados = {rotulo[0]: evaluate(motor, consultas) for rotulo, motor in configurations(calendar)}
    original, padrao = resultados["A"], resultados["F"]
    assert padrao.mrr >= original.mrr + 0.10
    assert padrao.hit_at_1 >= original.hit_at_1 + 0.10
    assert padrao.hit_at_3 >= 0.85


def test_ct_nlp_144_mais_rigor_no_limiar_rejeita_mais_perguntas_fora_do_tema(calendar, conjunto):
    consultas, fora = conjunto
    linhas = threshold_analysis(VaccineSearch(calendar), consultas, fora)
    rejeitadas = [r[2] for r in linhas]
    mantidas = [r[1] for r in linhas]
    assert rejeitadas == sorted(rejeitadas)
    assert mantidas == sorted(mantidas, reverse=True)


def test_ct_nlp_145_relatorio_tem_as_secoes_e_assume_as_limitacoes(calendar):
    relatorio = build_report(calendar)
    for trecho in (
        "# Avaliação da busca por vacinas",
        "## Comparação das configurações",
        "## Limiar de nota mínima",
        "## Limitações desta avaliação",
        "apenas 22 documentos",
        "escritas por uma pessoa só",
    ):
        assert trecho in relatorio


def test_ct_nlp_146_main_imprime_ou_grava_o_relatorio(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(sys, "argv", ["search_evaluate"])
    search_evaluate.main()
    assert "# Avaliação da busca por vacinas" in capsys.readouterr().out
    destino = tmp_path / "busca.md"
    monkeypatch.setattr(sys, "argv", ["search_evaluate", "--write-report", str(destino)])
    search_evaluate.main()
    assert destino.read_text(encoding="utf-8").startswith("# Avaliação da busca")
