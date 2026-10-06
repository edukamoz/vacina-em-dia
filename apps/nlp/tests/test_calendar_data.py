from vacina_nlp.calendar_data import GROUP_LABELS, load_calendar


def test_ct_nlp_20_calendario_oficial_com_fonte_e_versao(calendar):
    assert calendar.source.version == "2026"
    assert "Ministério da Saúde" in calendar.source.publisher
    assert "não substitui a caderneta oficial" in calendar.source.notice
    assert calendar.source.url.startswith("https://www.gov.br/")


def test_ct_nlp_21_total_de_linhas_por_faixa_como_no_calendario(calendar):
    totais = {group: len(calendar.rules_in_group(group)) for group in GROUP_LABELS}
    assert totais == {
        "CHILD": 34,
        "ADOLESCENT_YOUTH": 10,
        "ADULT": 6,
        "ELDERLY": 8,
        "PREGNANT": 7,
    }


def test_ct_nlp_22_idade_em_meses_so_nas_regras_por_idade(calendar):
    for rule in calendar.rules:
        assert (rule.age_months is not None) == (rule.timing_kind == "AGE")


def test_ct_nlp_23_notas_citadas_existem(calendar):
    for rule in calendar.rules:
        for note in rule.note_ids:
            assert note in calendar.notes


def test_ct_nlp_24_consultas_por_vacina_e_nomes_unicos(calendar):
    assert calendar.vaccine_names().count("BCG") == 1
    assert [r.group for r in calendar.rules_of("BCG")] == ["CHILD"]


def test_ct_nlp_25_calendario_e_lido_uma_vez():
    assert load_calendar() is load_calendar()
