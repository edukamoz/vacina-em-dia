import pytest

from vacina_nlp.safety import needs_professional


@pytest.mark.parametrize(
    "texto",
    [
        "posso tomar a vacina estando gripado",
        "meu filho está com febre pode vacinar",
        "tive reação à vacina o que faço",
        "qual remédio dar depois da vacina",
        "quanto de paracetamol posso dar",
        "tenho alergia posso vacinar",
        "preciso de diagnóstico",
        "meu bebê está com manchas na pele",
        "isso é grave",
        "estou com tosse",
        "vou ao pronto socorro",
        "chamar o SAMU",
        "ela passou mal depois da dose",
        "o braço ficou inchado",
    ],
)
def test_ct_nlp_40_encaminha_a_um_profissional(texto):
    assert needs_professional(texto) is True


@pytest.mark.parametrize(
    "texto",
    [
        "para que serve a vacina de febre amarela",
        "febre amarela é para que",
        "quando é a vacina da gripe",
        "quando posso tomar a vacina da gripe",
        "como registro que tomei a vacina",
        "o que significa dose atrasada",
        "vacinas do idoso",
        "como cadastro meu filho",
        "o microfone não funciona",
    ],
)
def test_ct_nlp_41_pergunta_comum_nao_dispara_a_regra_de_saude(texto):
    assert needs_professional(texto) is False


@pytest.mark.parametrize(
    "texto",
    [
        "quais as reações da vacina bcg",
        "a vacina da febre amarela dá reação?",
        "quais os efeitos colaterais da vacina da gripe",
        "quais são as reações comuns da vacina hepatite b",
        "o que é uma reação adversa",
        "onde vejo os eventos adversos das vacinas",
    ],
)
def test_ct_nlp_41_pergunta_geral_sobre_reacoes_nao_e_encaminhada(texto):
    assert needs_professional(texto) is False


@pytest.mark.parametrize(
    "texto",
    [
        "tive reação à vacina o que faço",
        "minha filha teve reação depois da vacina",
        "quais as reações da vacina, estou com febre",
        "quais as reações da vacina, ela passou mal",
        "a vacina causa efeito colateral perigoso",
        "o que fazer se der reação depois da vacina",
        "tenho alergia, quais os efeitos colaterais",
        "quais as reações da vacina e qual remédio dar",
    ],
)
def test_ct_nlp_42_relato_de_caso_ou_risco_continua_indo_ao_profissional(texto):
    assert needs_professional(texto) is True
