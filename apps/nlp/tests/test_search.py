import pytest

from vacina_nlp.search import MAX_RESULTS, VaccineSearch


@pytest.mark.parametrize(
    ("consulta", "esperada"),
    [
        ("bcg", "BCG"),
        ("tuberculose", "BCG"),
        ("vacina da gripe", "influenza trivalente"),
        ("papilomavírus", "HPV4"),
        ("paralisia infantil", "poliomielite inativada VIP"),
        ("catapora", "varicela"),
        ("bronquiolite", "vírus sincicial respiratório (VVSR)"),
        ("dengue", "DNG4"),
    ],
)
def test_ct_nlp_90_acha_a_vacina_pelo_nome_apelido_ou_doenca(calendar, consulta, esperada):
    resultados = VaccineSearch(calendar).search(consulta)
    assert resultados, consulta
    assert resultados[0].vaccine == esperada


def test_ct_nlp_91_resultado_traz_doencas_e_indicacoes_do_calendario(calendar):
    hit = VaccineSearch(calendar).search("bcg")[0]
    assert "tuberculose" in hit.diseases
    assert hit.indications == ("Criança: dose única, ao nascer",)
    assert 0 < hit.score <= 1
    assert set(hit.to_dict()) == {"vaccine", "score", "diseases", "indications"}


def test_ct_nlp_92_limita_o_numero_de_resultados_e_ordena_pela_semelhanca(calendar):
    resultados = VaccineSearch(calendar).search("vacina difteria tétano coqueluche")
    assert 1 <= len(resultados) <= MAX_RESULTS
    scores = [r.score for r in resultados]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.parametrize("consulta", ["", "   ", "????", "xyzabc qwerty"])
def test_ct_nlp_93_consulta_vazia_ou_sem_relacao_nao_devolve_nada(calendar, consulta):
    assert VaccineSearch(calendar).search(consulta) == []
