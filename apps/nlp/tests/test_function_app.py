import json

import azure.functions as func

import function_app


def requisicao(metodo, rota, corpo=None):
    return func.HttpRequest(
        method=metodo,
        url=f"/api/{rota}",
        body=json.dumps(corpo).encode("utf-8") if corpo is not None else b"",
    )


def chamar(funcao, req):
    return funcao.build().get_user_function()(req)


def test_ct_nlp_110_rotas_registradas_e_protegidas_pela_chave_da_funcao():
    funcoes = {f.get_function_name(): f for f in function_app.app.get_functions()}
    assert set(funcoes) == {"chat", "search", "health"}
    niveis = {nome: f.get_trigger().auth_level for nome, f in funcoes.items()}
    assert niveis["chat"] == func.AuthLevel.FUNCTION
    assert niveis["search"] == func.AuthLevel.FUNCTION
    assert niveis["health"] == func.AuthLevel.ANONYMOUS


def test_ct_nlp_111_chat_responde_json_sem_cache():
    resposta = chamar(
        function_app.chat, requisicao("POST", "chat", {"text": "como cadastro meu filho"})
    )
    assert resposta.status_code == 200
    assert resposta.mimetype == "application/json"
    assert resposta.headers["Cache-Control"] == "no-store"
    assert json.loads(resposta.get_body())["intent"] == "como_adicionar_pessoa"


def test_ct_nlp_112_busca_e_health_respondem():
    busca = chamar(function_app.search, requisicao("POST", "search", {"text": "bcg"}))
    assert json.loads(busca.get_body())["results"][0]["vaccine"] == "BCG"
    saude = chamar(function_app.health, requisicao("GET", "health"))
    assert json.loads(saude.get_body())["status"] == "ok"
