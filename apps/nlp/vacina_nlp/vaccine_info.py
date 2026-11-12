"""Fichas das vacinas (B75): onde, no manual oficial, estão as reações de cada vacina.

O arquivo ``data/vaccine-info.json`` é gerado a partir do `@vacina/shared` (``npm run
export:calendar``); um teste do pacote TypeScript confere que ele não diverge. O assistente **não**
copia composição, contraindicação nem a tabela de reações: ele só sabe o quadro e a página do
*Manual de Vigilância Epidemiológica de Eventos Adversos Pós-Vacinação*, para apontar o leitor.
Nada aqui é preenchido de memória.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

from .calendar_data import DATA_DIR


@dataclass(frozen=True)
class ReactionPointer:
    """Onde as reações de uma vacina estão no manual de eventos adversos."""

    vaccine: str
    quadro: str
    page: int


@dataclass(frozen=True)
class AdverseEventsSource:
    """O manual oficial que lista as reações."""

    name: str
    publisher: str
    edition: str
    url: str


@dataclass(frozen=True)
class VaccineInfo:
    """Fichas lidas do JSON."""

    source: AdverseEventsSource
    pointers: dict[str, ReactionPointer]

    def pointer_for(self, vaccine: str) -> ReactionPointer | None:
        """Ponteiro de uma vacina pelo nome do calendário, ou ``None`` se não há ficha."""
        return self.pointers.get(vaccine)


@lru_cache(maxsize=1)
def load_vaccine_info() -> VaccineInfo:
    """Lê as fichas uma vez e guarda em memória."""
    with (DATA_DIR / "vaccine-info.json").open(encoding="utf-8") as file:
        raw = json.load(file)
    src = raw["adverseEventsSource"]
    return VaccineInfo(
        source=AdverseEventsSource(src["name"], src["publisher"], src["edition"], src["url"]),
        pointers={
            item["vaccine"]: ReactionPointer(item["vaccine"], item["quadro"], item["page"])
            for item in raw["items"]
        },
    )
