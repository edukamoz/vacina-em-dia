"""Azure Functions (modelo Python v2): chatbot e busca do Vacina em Dia.

Rotas (prefixo /api): ``POST /chat`` e ``POST /search`` exigem a chave da função (a API principal a
guarda); ``GET /health`` é livre. O texto das perguntas nunca é registrado em log.
"""

import json

import azure.functions as func

from vacina_nlp.handlers import handle_chat, handle_health, handle_search
from vacina_nlp.service import get_service

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


def _json(status: int, body: dict) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body, ensure_ascii=False),
        status_code=status,
        mimetype="application/json",
        headers={"Cache-Control": "no-store"},
    )


@app.route(route="chat", methods=["POST"])
def chat(req: func.HttpRequest) -> func.HttpResponse:
    """Responde a uma pergunta em texto."""
    return _json(*handle_chat(get_service(), req.get_body()))


@app.route(route="search", methods=["POST"])
def search(req: func.HttpRequest) -> func.HttpResponse:
    """Busca vacinas parecidas com a pergunta."""
    return _json(*handle_search(get_service(), req.get_body()))


@app.route(route="health", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def health(req: func.HttpRequest) -> func.HttpResponse:
    """Confere se o serviço está no ar."""
    return _json(*handle_health(get_service()))
