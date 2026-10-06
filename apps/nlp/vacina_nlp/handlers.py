"""Tratamento das requisições HTTP, sem depender do SDK das Functions (fácil de testar).

Toda entrada é validada aqui. Mensagens de erro são fixas: nunca repetem o que a pessoa escreveu,
porque o texto pode conter dado pessoal (CLAUDE.md §10).
"""

from __future__ import annotations

import json
from typing import Any

from .service import NlpService

MAX_TEXT_LENGTH = 300


def _error(status: int, code: str, message: str) -> tuple[int, dict[str, Any]]:
    return status, {"code": code, "message": message}


def _read_text(raw: bytes | str | None) -> tuple[str | None, tuple[int, dict[str, Any]] | None]:
    """Lê o campo ``text`` do corpo JSON; devolve o texto ou o erro pronto."""
    try:
        body = json.loads(raw) if raw else None
    except (ValueError, UnicodeDecodeError):
        body = None
    if not isinstance(body, dict) or not isinstance(body.get("text"), str):
        return None, _error(400, "VALIDATION_ERROR", "Envie um JSON com o campo text (texto).")
    text = body["text"].strip()
    if len(text) > MAX_TEXT_LENGTH:
        return None, _error(
            400, "VALIDATION_ERROR", f"O texto pode ter no máximo {MAX_TEXT_LENGTH} caracteres."
        )
    return text, None


def handle_chat(service: NlpService, raw: bytes | str | None) -> tuple[int, dict[str, Any]]:
    """``POST /chat``: responde a uma pergunta em texto."""
    text, error = _read_text(raw)
    if error:
        return error
    return 200, service.chatbot.reply(text or "").to_dict()


def handle_search(service: NlpService, raw: bytes | str | None) -> tuple[int, dict[str, Any]]:
    """``POST /search``: busca vacinas parecidas com a pergunta (usada pela voz)."""
    text, error = _read_text(raw)
    if error:
        return error
    hits = service.search.search(text or "")
    source = service.calendar.source
    return 200, {
        "results": [hit.to_dict() for hit in hits],
        "source": {
            "name": f"{source.name}, {source.publisher}",
            "url": source.url,
            "version": source.version,
        },
        "notice": source.notice,
    }


def handle_health(service: NlpService) -> tuple[int, dict[str, Any]]:
    """``GET /health``: o serviço está no ar e o modelo carregado."""
    return 200, {
        "status": "ok",
        "service": "vacina-em-dia-nlp",
        "intents": len(service.chatbot._classifier.intents),  # noqa: SLF001
        "calendarVersion": service.calendar.source.version,
    }
