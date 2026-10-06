"""Calendário Nacional de Vacinação 2026, lido do JSON gerado a partir do `@vacina/shared`.

O arquivo ``data/pni-2026.json`` é a única cópia do calendário no lado Python; um teste do pacote
TypeScript confere que ele não diverge do dado oficial. Nada aqui é preenchido de memória.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

GROUP_LABELS: dict[str, str] = {
    "CHILD": "Criança",
    "ADOLESCENT_YOUTH": "Adolescente e jovem",
    "ADULT": "Adulto",
    "ELDERLY": "Idoso",
    "PREGNANT": "Gestante",
}


@dataclass(frozen=True)
class Rule:
    """Uma linha do calendário: uma vacina, numa faixa, com dose e momento."""

    id: str
    group: str
    vaccine: str
    dose: str
    diseases: str
    timing_kind: str
    age_months: int | None
    timing_label: str
    conditional: bool
    note_ids: tuple[str, ...]


@dataclass(frozen=True)
class Source:
    """Fonte e versão do calendário (RNF10)."""

    name: str
    publisher: str
    version: str
    url: str
    retrieved_at: str
    notice: str


@dataclass(frozen=True)
class Calendar:
    """Calendário completo."""

    source: Source
    rules: tuple[Rule, ...]
    notes: dict[str, str]

    def vaccine_names(self) -> list[str]:
        """Nomes distintos das vacinas, na ordem do calendário."""
        return list(dict.fromkeys(rule.vaccine for rule in self.rules))

    def rules_of(self, vaccine: str) -> list[Rule]:
        """Linhas de uma vacina, em todas as faixas."""
        return [rule for rule in self.rules if rule.vaccine == vaccine]

    def rules_in_group(self, group: str) -> list[Rule]:
        """Linhas de uma faixa."""
        return [rule for rule in self.rules if rule.group == group]


def parse_calendar(raw: dict) -> Calendar:
    """Converte o JSON do calendário em objetos."""
    src = raw["source"]
    return Calendar(
        source=Source(
            name=src["name"],
            publisher=src["publisher"],
            version=src["version"],
            url=src["url"],
            retrieved_at=src["retrievedAt"],
            notice=src["notice"],
        ),
        rules=tuple(
            Rule(
                id=r["id"],
                group=r["group"],
                vaccine=r["vaccine"],
                dose=r["dose"],
                diseases=r["diseases"],
                timing_kind=r["timingKind"],
                age_months=r["ageMonths"],
                timing_label=r["timingLabel"],
                conditional=r["conditional"],
                note_ids=tuple(r["noteIds"]),
            )
            for r in raw["rules"]
        ),
        notes=dict(raw["notes"]),
    )


@lru_cache(maxsize=1)
def load_calendar() -> Calendar:
    """Lê o calendário uma vez e guarda em memória."""
    with (DATA_DIR / "pni-2026.json").open(encoding="utf-8") as file:
        return parse_calendar(json.load(file))
