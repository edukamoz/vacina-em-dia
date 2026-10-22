"""Chatbot por regras + classificação de intenções (RF07).

Ordem de decisão (a primeira que se aplica vence):

1. texto vazio -> pede para repetir;
2. regras de segurança (saúde individual, remédio, emergência) -> encaminha a um profissional;
3. classificador TF-IDF + SVM; confiança abaixo do limiar -> resposta padrão que orienta procurar
   um profissional ou uma unidade de saúde;
4. intenção -> resposta curada; para as perguntas sobre vacinas, os dados vêm do calendário
   oficial e a fonte é sempre citada.

Sem IA generativa: nenhuma frase é inventada.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from .calendar_data import DATA_DIR, GROUP_LABELS, Calendar, Rule
from .classifier import IntentClassifier
from .entities import (
    detect_group,
    detect_screen,
    extract_dates,
    extract_names,
    extract_relative_day,
    extract_vaccines,
)
from .preprocess import normalize
from .safety import needs_professional

# Abaixo disto, a pergunta é tratada como "não entendi" (definido na avaliação, ver
# docs/07-testes/avaliacao-chatbot.md). Era 0,40 com 20 intenções; com 39 as probabilidades
# calibradas se espalham mais, e com 0,40 só dois terços das perguntas do teste seriam respondidas.
CONFIDENCE_THRESHOLD = 0.30

MAX_VACCINES_PER_ANSWER = 3
MAX_NAMES_IN_GROUP_LIST = 20
APP_SOURCE_NAME = "Ajuda do Vacina em Dia"
CLOSING = " Confira sempre a sua caderneta e converse com um profissional de saúde."

# Pares "como faço" (explica) e "faça" (comando). O classificador confunde os dois, porque as
# frases são parecidas; quem decide é a forma da pergunta e o que ela traz (nome, vacina, data).
COMMAND_OF_HOWTO = {
    "como_adicionar_pessoa": "acao_adicionar_pessoa",
    "como_registrar_dose": "acao_registrar_dose",
    "como_agendar_dose": "acao_agendar_dose",
}
HOWTO_OF_COMMAND = {command: howto for howto, command in COMMAND_OF_HOWTO.items()}
_NAVIGATION_VERB = re.compile(
    r"^(abr\w*|ir|vai|va|mostr\w*|me mostra|me leva|lev\w*|quero ir|quero ver|me leve)(?![a-z0-9])"
)
_QUESTION_CUE = re.compile(
    r"(?<![a-z0-9])(como|onde|qual|quais|quando|posso|podem|da para|tem como|por que|porque|o que)(?![a-z0-9])"
)


@dataclass(frozen=True)
class Reply:
    """Resposta do assistente, pronta para ser enviada ao app."""

    intent: str
    text: str
    confidence: float
    source: dict[str, str]
    suggestions: tuple[str, ...] = ()
    fallback: bool = False
    safety: bool = False
    entities: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Formato enviado como JSON."""
        return {
            "intent": self.intent,
            "text": self.text,
            "confidence": round(self.confidence, 4),
            "source": self.source,
            "suggestions": list(self.suggestions),
            "fallback": self.fallback,
            "safety": self.safety,
            "entities": self.entities,
        }


def load_responses() -> dict[str, Any]:
    """Lê as respostas curadas."""
    with (DATA_DIR / "responses.json").open(encoding="utf-8") as handle:
        return json.load(handle)


def _lower_first(text: str) -> str:
    return text[:1].lower() + text[1:] if text else text


def _dose_names(rules: list[Rule]) -> str:
    return ", ".join(dict.fromkeys(f"{r.vaccine} ({r.dose})" for r in rules))


class Chatbot:
    """Assistente de dúvidas frequentes."""

    def __init__(
        self,
        classifier: IntentClassifier,
        calendar: Calendar,
        responses: dict[str, Any],
        threshold: float = CONFIDENCE_THRESHOLD,
    ) -> None:
        self._classifier = classifier
        self._calendar = calendar
        self._responses = responses
        self._threshold = threshold

    # -- fontes e respostas curadas ----------------------------------------------------------

    def _source(self, origin: str) -> dict[str, str]:
        if origin == "calendario":
            src = self._calendar.source
            return {
                "name": f"{src.name}, {src.publisher}",
                "url": src.url,
                "version": src.version,
            }
        return {"name": APP_SOURCE_NAME}

    def _curated(
        self, key: str, intent: str, confidence: float, *, fallback: bool = False, safety: bool = False
    ) -> Reply:
        entry = self._responses["responses"].get(key) or self._responses[key]
        return Reply(
            intent=intent,
            text=entry["text"],
            confidence=confidence,
            source=self._source(entry["origin"]),
            suggestions=tuple(entry.get("suggestions", [])),
            fallback=fallback,
            safety=safety,
        )

    def _from_calendar(
        self, intent: str, text: str, confidence: float, suggestions: list[str]
    ) -> Reply:
        return Reply(
            intent=intent,
            text=text,
            confidence=confidence,
            source=self._source("calendario"),
            suggestions=tuple(suggestions),
        )

    # -- decisão -----------------------------------------------------------------------------

    def reply(self, text: str) -> Reply:
        """Responde a uma pergunta em texto livre."""
        if not any(c.isalnum() for c in text):
            return self._curated("empty", "vazio", 0.0, fallback=True)

        if needs_professional(text):
            return self._curated("orientacao_medica", "orientacao_medica", 1.0, safety=True)

        prediction = self._classifier.predict(text)
        if prediction.confidence < self._threshold:
            # Pergunta curta que cita uma vacina ("febre amarela é para que"): explica a vacina.
            if extract_vaccines(text, self._calendar):
                return self._about_vaccine(text, prediction.confidence)
            return self._curated("fallback", "nao_entendi", prediction.confidence, fallback=True)

        intent, confidence = prediction.intent, prediction.confidence
        intent = self._command_or_howto(intent, text)
        if intent.startswith(("conta_", "acao_")):
            return self._for_the_app(intent, text, confidence)
        if intent == "vacina_para_que_serve":
            return self._about_vaccine(text, confidence)
        if intent == "vacina_quando":
            return self._when_vaccine(text, confidence)
        if intent == "vacinas_do_grupo":
            return self._group_vaccines(text, confidence)
        return self._curated(intent, intent, confidence, safety=intent == "orientacao_medica")

    # -- comandos e perguntas sobre a conta (o app responde com os dados da pessoa) -----------

    def _command_or_howto(self, intent: str, text: str) -> str:
        """Separa "como adiciono uma pessoa?" (explica) de "adicionar a Maria nascida em ..."
        (comando): pergunta (como, onde, posso...) fica com a explicação; fora disso, o que a frase
        traz (nome, data, vacina) mostra que é um comando."""
        normalized = normalize(text)
        if (
            not _QUESTION_CUE.search(normalized)
            and _NAVIGATION_VERB.search(normalized)
            and detect_screen(text)
            and (intent == "acao_abrir_tela" or intent.startswith("como_ver_"))
        ):
            return "acao_abrir_tela"
        howto = intent if intent in COMMAND_OF_HOWTO else HOWTO_OF_COMMAND.get(intent)
        if howto is None:
            return intent
        command = COMMAND_OF_HOWTO[howto]
        if _QUESTION_CUE.search(normalized):
            return howto
        if intent == command:
            return command
        carries = bool(extract_dates(text) or extract_relative_day(text))
        if command == "acao_adicionar_pessoa":
            carries = carries or bool(extract_names(text))
        else:
            carries = carries or bool(extract_vaccines(text, self._calendar))
        return command if carries else howto

    def _for_the_app(self, intent: str, text: str, confidence: float) -> Reply:
        """Resposta de uma intenção da conta: o texto é só o padrão; o app monta a resposta final
        com os dados da pessoa logada, e as entidades dizem o que ela pediu. Nada da conta passa
        por aqui."""
        base = self._curated(intent, intent, confidence)
        entities: dict[str, Any] = {
            "vaccines": extract_vaccines(text, self._calendar),
            "names": extract_names(text),
            "dates": extract_dates(text),
            "relativeDay": extract_relative_day(text),
            "screen": detect_screen(text) if intent == "acao_abrir_tela" else None,
        }
        return Reply(
            intent=base.intent,
            text=base.text,
            confidence=base.confidence,
            source=base.source,
            suggestions=base.suggestions,
            entities=entities,
        )

    # -- respostas com dados do calendário oficial -------------------------------------------

    def _about_vaccine(self, text: str, confidence: float) -> Reply:
        names = extract_vaccines(text, self._calendar)[:MAX_VACCINES_PER_ANSWER]
        if not names:
            return self._curated("vaccine_unknown", "vacina_para_que_serve", confidence)
        partes = []
        for name in names:
            doencas = list(dict.fromkeys(r.diseases for r in self._calendar.rules_of(name)))
            partes.append(f"{name}: protege contra {'; '.join(doencas)}.")
        return self._from_calendar(
            "vacina_para_que_serve",
            " ".join(partes) + CLOSING,
            confidence,
            [f"Quando toma a vacina {names[0]}?", "Quais vacinas a criança deve tomar?"],
        )

    @staticmethod
    def _timing_sentence(rule: Rule) -> str:
        frase = f"{GROUP_LABELS[rule.group]}: {rule.dose}, {_lower_first(rule.timing_label)}"
        if rule.conditional:
            frase += " (depende de condições; veja as notas do calendário)"
        return frase

    def _when_vaccine(self, text: str, confidence: float) -> Reply:
        names = extract_vaccines(text, self._calendar)[:MAX_VACCINES_PER_ANSWER]
        if not names:
            return self._curated("vaccine_unknown", "vacina_quando", confidence)
        partes = []
        for name in names:
            linhas = dict.fromkeys(self._timing_sentence(r) for r in self._calendar.rules_of(name))
            partes.append(f"{name} — " + "; ".join(linhas) + ".")
        return self._from_calendar(
            "vacina_quando",
            " ".join(partes) + CLOSING,
            confidence,
            [f"Para que serve a vacina {names[0]}?", "O que significa dose atrasada?"],
        )

    def _group_vaccines(self, text: str, confidence: float) -> Reply:
        mention = detect_group(text)
        if mention is None:
            return self._curated("group_unknown", "vacinas_do_grupo", confidence)
        regras = self._calendar.rules_in_group(mention.group)

        if mention.group == "CHILD" and mention.age_months is not None:
            answer = self._child_at_age(regras, mention.age_months)
        else:
            nomes = list(
                dict.fromkeys(
                    f"{r.vaccine}{' (depende de condições)' if r.conditional else ''}"
                    for r in regras
                )
            )[:MAX_NAMES_IN_GROUP_LIST]
            answer = (
                f"Vacinas do calendário para {GROUP_LABELS[mention.group].lower()}: "
                + ", ".join(nomes)
                + "."
            )
        answer += " Veja os detalhes no Calendário do aplicativo e converse com um profissional de saúde."
        return self._from_calendar(
            "vacinas_do_grupo",
            answer,
            confidence,
            ["Para que serve a BCG?", "De onde vem o calendário?"],
        )

    @staticmethod
    def _child_at_age(regras: list[Rule], age_months: int) -> str:
        por_idade = [r for r in regras if r.age_months is not None]
        exatas = [r for r in por_idade if r.age_months == age_months]
        if exatas:
            return f"Aos {exatas[0].timing_label.lower()}: {_dose_names(exatas)}."
        futuras = [r for r in por_idade if (r.age_months or 0) > age_months]
        if not futuras:
            return (
                "O calendário da criança vai até os 9 anos; para idades maiores, veja as "
                "vacinas do adolescente."
            )
        proxima = min(r.age_months or 0 for r in futuras)
        seguintes = [r for r in futuras if r.age_months == proxima]
        return (
            "O calendário não traz vacinas exatamente nessa idade. A próxima indicação é "
            f"{seguintes[0].timing_label.lower()}: {_dose_names(seguintes)}."
        )
