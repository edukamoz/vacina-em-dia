import numpy as np
import pytest

from vacina_nlp.calendar_data import load_calendar
from vacina_nlp.embeddings import ARQUIVO, WordVectors, default_word_vectors, load_word_vectors
from vacina_nlp.search import VaccineSearch
from vacina_nlp.search_evaluate import (
    EMBEDDING_WEIGHTS,
    build_report,
    embedding_analysis,
    evaluate,
    load_test_set,
)


@pytest.fixture(scope="module")
def pequeno():
    return WordVectors(["gato", "cachorro", "carro"], np.array([[1, 0, 0], [0.9, 0.1, 0], [0, 0, 1]]))


def test_ct_nlp_160_tabela_normaliza_os_vetores_e_conhece_suas_palavras(pequeno):
    assert len(pequeno) == 3 and pequeno.dimension == 3
    assert "gato" in pequeno and "avião" not in pequeno


def test_ct_nlp_161_media_do_texto_ignora_palavras_desconhecidas_e_aceita_pesos(pequeno):
    assert pequeno.text_vector("zzz yyy") is None
    so_gato = pequeno.text_vector("Gato!")
    com_ruido = pequeno.text_vector("gato zzz")
    assert so_gato is not None and com_ruido is not None
    assert np.allclose(so_gato, com_ruido)
    pesado = pequeno.text_vector("gato carro", {"gato": 3.0, "carro": 1.0})
    assert pesado is not None and pesado[0] > pesado[2]


def test_ct_nlp_162_tabela_recusa_palavras_e_vetores_de_tamanhos_diferentes():
    with pytest.raises(ValueError, match="vetor"):
        WordVectors(["a", "b"], np.zeros((3, 2)))


def test_ct_nlp_163_recorte_versionado_cabe_na_funcao_e_tem_50_dimensoes():
    assert ARQUIVO.stat().st_size < 10_000_000
    vetores = load_word_vectors()
    assert vetores.dimension == 50 and len(vetores) > 30_000
    assert default_word_vectors() is default_word_vectors()
    for palavra in ("vacina", "gripe", "tosse", "coqueluche"):
        assert palavra in vetores


def test_ct_nlp_164_peso_zero_nao_muda_a_busca():
    calendar = load_calendar()
    padrao = VaccineSearch(calendar, analyzer="char", lsa_weight=0.3)
    zero = VaccineSearch(calendar, analyzer="char", lsa_weight=0.3, embedding_weight=0.0)
    for texto in ("vacina da gripe", "tuberculoze", "quero uma pizza"):
        assert np.allclose(padrao.scores(texto), zero.scores(texto))


@pytest.mark.parametrize(
    ("lsa", "emb"), [(0.0, -0.1), (0.0, 1.1), (0.6, 0.6)]
)
def test_ct_nlp_165_pesos_invalidos_sao_recusados(lsa, emb):
    with pytest.raises(ValueError, match="embedding_weight"):
        VaccineSearch(load_calendar(), lsa_weight=lsa, embedding_weight=emb)


def test_ct_nlp_166_com_embedding_a_nota_fica_entre_0_e_1_e_pergunta_sem_vetor_cai_no_lexical():
    calendar = load_calendar()
    motor = VaccineSearch(calendar, analyzer="char", lsa_weight=0.0, embedding_weight=0.2)
    notas = motor.scores("vacina da gripe")
    assert notas.shape == (len(motor.names),) and notas.min() >= 0 and notas.max() <= 1.0
    sem_vetor = motor.scores("zzzzqx")
    assert sem_vetor.max() <= 0.8 * 1.0 + 1e-9


def test_ct_nlp_167_nenhum_peso_de_embedding_supera_o_padrao_neste_conjunto():
    # O ADR-023 e o relatório dizem que os embeddings foram avaliados e não adotados. Se este teste
    # falhar, o resultado mudou: revise o relatório e o ADR antes de ligar o recurso.
    calendar = load_calendar()
    consultas, fora = load_test_set(calendar)
    linhas, abaixo, acerto_abaixo, nota_fora = embedding_analysis(calendar, consultas, fora)
    assert [peso for peso, _, _ in linhas] == list(EMBEDDING_WEIGHTS)
    base_mrr = linhas[0][1].mrr
    assert all(m.mrr <= base_mrr + 1e-9 for _, m, _ in linhas[1:])
    assert 0.0 <= acerto_abaixo <= 1.0 and nota_fora > 0
    assert evaluate(
        VaccineSearch(calendar, analyzer="char", lsa_weight=0.3), consultas
    ).mrr == pytest.approx(base_mrr)


def test_ct_nlp_168_relatorio_da_busca_traz_a_secao_de_embeddings():
    relatorio = build_report(load_calendar())
    assert "## Embeddings de palavras (GloVe 50d do NILC): avaliados e não adotados" in relatorio
    assert "ADR-023" in relatorio
