"""Montagem do serviço: treina o classificador uma vez e liga chatbot e busca."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from .calendar_data import Calendar, load_calendar
from .chatbot import Chatbot, load_responses
from .classifier import trained_classifier
from .search import VaccineSearch


@dataclass(frozen=True)
class NlpService:
    """Objetos que atendem às requisições."""

    chatbot: Chatbot
    search: VaccineSearch
    calendar: Calendar


@lru_cache(maxsize=1)
def get_service() -> NlpService:
    """Cria o serviço na primeira chamada (partida a frio) e o reaproveita depois."""
    calendar = load_calendar()
    chatbot = Chatbot(trained_classifier(), calendar, load_responses())
    return NlpService(chatbot=chatbot, search=VaccineSearch(calendar), calendar=calendar)
