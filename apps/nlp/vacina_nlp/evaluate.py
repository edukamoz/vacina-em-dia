"""Avaliação do classificador de intenções (acurácia, F1 e análise do limiar de confiança).

Uso (dentro de ``apps/nlp``)::

    python -m vacina_nlp.evaluate                      # imprime o resumo
    python -m vacina_nlp.evaluate --write-report ../../docs/07-testes/avaliacao-chatbot.md
    python -m vacina_nlp.evaluate --write-dashboard ../../docs/07-testes/painel-pln.html

O conjunto de teste (``data/test_set.json``) é separado do treino e nunca é usado para treinar.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import sklearn
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from .calendar_data import DATA_DIR
from .chatbot import CONFIDENCE_THRESHOLD
from .classifier import (
    RANDOM_STATE,
    IntentClassifier,
    _build_pipeline,
    load_intent_examples,
    load_test_examples,
)

# Meta da disciplina/projeto, ainda a validar com o professor (CLAUDE.md §9).
F1_TARGET = 0.85
THRESHOLDS = (0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60)


@dataclass(frozen=True)
class ClassMetrics:
    """Métricas de uma intenção."""

    intent: str
    precision: float
    recall: float
    f1: float
    support: int


@dataclass(frozen=True)
class Evaluation:
    """Resultado completo da avaliação."""

    train_size: int
    test_size: int
    intents: int
    accuracy: float
    macro_f1: float
    weighted_f1: float
    per_class: list[ClassMetrics]
    errors: list[tuple[str, str, str, float]]
    cv_accuracy: float
    cv_macro_f1: float
    thresholds: list[tuple[float, float, float]]
    noise_total: int
    noise_fallback: int
    threshold_in_use: float
    labels: list[str] = field(default_factory=list)
    confusion: list[list[int]] = field(default_factory=list)


def load_noise(path: Path | None = None) -> list[str]:
    """Entradas sem sentido usadas para medir a resposta padrão."""
    file = path or DATA_DIR / "test_set.json"
    with file.open(encoding="utf-8") as handle:
        return list(json.load(handle)["ruido"])


def check_no_leak(train: list[tuple[str, str]], test: list[tuple[str, str]]) -> list[str]:
    """Frases do teste que também estão no treino (devem ser nenhuma)."""
    treino = {text.strip().lower() for text, _ in train}
    return [text for text, _ in test if text.strip().lower() in treino]


def cross_validate(train: list[tuple[str, str]], folds: int = 5) -> tuple[float, float]:
    """Validação cruzada estratificada só sobre o treino (estabilidade do modelo)."""
    texts = [t for t, _ in train]
    labels = [i for _, i in train]
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=RANDOM_STATE)
    predicted = cross_val_predict(_build_pipeline(), texts, labels, cv=splitter)
    return (
        float(accuracy_score(labels, predicted)),
        float(f1_score(labels, predicted, average="macro", zero_division=0)),
    )


def evaluate(
    train: list[tuple[str, str]] | None = None,
    test: list[tuple[str, str]] | None = None,
    noise: list[str] | None = None,
    threshold: float = CONFIDENCE_THRESHOLD,
    run_cross_validation: bool = True,
) -> Evaluation:
    """Treina com ``train`` e mede em ``test``.

    Raises:
        ValueError: se alguma frase do teste estiver no treino (vazamento).
    """
    train = train if train is not None else load_intent_examples()
    test = test if test is not None else load_test_examples()
    noise = noise if noise is not None else load_noise()
    vazadas = check_no_leak(train, test)
    if vazadas:
        raise ValueError(f"Frases do teste também estão no treino: {vazadas}")

    classifier = IntentClassifier.train(train)
    predictions = classifier.predict_many([text for text, _ in test])
    y_true = [intent for _, intent in test]
    y_pred = [p.intent for p in predictions]
    labels = sorted(set(y_true) | set(classifier.intents))
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    per_class = [
        ClassMetrics(label, float(p), float(r), float(f), int(s))
        for label, p, r, f, s in zip(labels, precision, recall, f1, support)
    ]
    errors = [
        (text, true, pred.intent, pred.confidence)
        for (text, true), pred in zip(test, predictions)
        if true != pred.intent
    ]
    thresholds = []
    for limiar in THRESHOLDS:
        aceitas = [(t, p) for (_, t), p in zip(test, predictions) if p.confidence >= limiar]
        cobertura = len(aceitas) / len(test)
        acerto = sum(1 for t, p in aceitas if t == p.intent) / len(aceitas) if aceitas else 0.0
        thresholds.append((limiar, cobertura, acerto))
    noise_fallback = sum(1 for text in noise if classifier.predict(text).confidence < threshold)
    cv_acc, cv_f1 = cross_validate(train) if run_cross_validation else (0.0, 0.0)

    return Evaluation(
        train_size=len(train),
        test_size=len(test),
        intents=len(classifier.intents),
        accuracy=float(accuracy_score(y_true, y_pred)),
        macro_f1=float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        weighted_f1=float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        per_class=per_class,
        errors=errors,
        cv_accuracy=cv_acc,
        cv_macro_f1=cv_f1,
        thresholds=thresholds,
        noise_total=len(noise),
        noise_fallback=noise_fallback,
        threshold_in_use=threshold,
        labels=labels,
        confusion=confusion_matrix(y_true, y_pred, labels=labels).tolist(),
    )


def _pct(value: float) -> str:
    return f"{value * 100:.1f}%".replace(".", ",")


def _num(value: float) -> str:
    return f"{value:.3f}".replace(".", ",")


def render_report(result: Evaluation, today: date) -> str:
    """Relatório em Markdown (português), para o plano de teste e a documentação técnica."""
    atingiu = "atingida" if result.macro_f1 >= F1_TARGET else "NÃO atingida"
    linhas = [
        "# Avaliação do chatbot (classificador de intenções)",
        "",
        f"Gerado em {today.strftime('%d/%m/%Y')} por `python -m vacina_nlp.evaluate --write-report`. "
        "Não edite à mão: rode o comando de novo. Os mesmos números, em gráficos, estão no painel "
        "`painel-pln.html` (mesma pasta), gerado com `--write-dashboard`.",
        "",
        "## Método",
        "",
        "- **Modelo:** TF-IDF (palavras de 1 e 2 termos + trechos de 3 a 5 letras) e SVM linear "
        f"(scikit-learn {sklearn.__version__}), com probabilidades calibradas (Platt).",
        f"- **Treino:** {result.train_size} frases em {result.intents} intenções, escritas e revisadas "
        "à mão (`vacina_nlp/data/intents.json`), sem dados pessoais.",
        f"- **Teste:** {result.test_size} frases **separadas** do treino (`data/test_set.json`); o "
        "script recusa o teste se alguma frase estiver nos dois conjuntos.",
        f"- **Semente fixa** ({RANDOM_STATE}): o resultado é reprodutível.",
        "",
        "## Resultado no conjunto de teste",
        "",
        "| Métrica | Valor |",
        "|---|---|",
        f"| Acurácia | {_pct(result.accuracy)} |",
        f"| F1 macro | {_num(result.macro_f1)} |",
        f"| F1 ponderado | {_num(result.weighted_f1)} |",
        f"| Meta de F1 macro (a validar com o professor) | {_num(F1_TARGET)}: **{atingiu}** |",
        f"| Validação cruzada (5 partes, só no treino): acurácia | {_pct(result.cv_accuracy)} |",
        f"| Validação cruzada (5 partes, só no treino): F1 macro | {_num(result.cv_macro_f1)} |",
        "",
        "### Por intenção",
        "",
        "| Intenção | Precisão | Revocação | F1 | Frases de teste |",
        "|---|---|---|---|---|",
    ]
    for m in result.per_class:
        linhas.append(
            f"| `{m.intent}` | {_num(m.precision)} | {_num(m.recall)} | {_num(m.f1)} | {m.support} |"
        )
    linhas += ["", "### Erros no teste", ""]
    if result.errors:
        linhas += ["| Frase | Esperada | Prevista | Confiança |", "|---|---|---|---|"]
        for text, esperado, previsto, confianca in result.errors:
            linhas.append(f"| {text} | `{esperado}` | `{previsto}` | {_num(confianca)} |")
    else:
        linhas.append("Nenhum erro no conjunto de teste.")
    linhas += [
        "",
        "## Limiar de confiança",
        "",
        "Abaixo do limiar, o assistente não responde a intenção: devolve a resposta padrão, que "
        "orienta procurar um profissional ou uma unidade de saúde. A tabela mostra, no conjunto de "
        "teste, quantas perguntas passam do limiar (cobertura) e quantas dessas acertam.",
        "",
        "| Limiar | Cobertura | Acerto entre as aceitas |",
        "|---|---|---|",
    ]
    for limiar, cobertura, acerto in result.thresholds:
        marca = " (em uso)" if abs(limiar - result.threshold_in_use) < 1e-9 else ""
        linhas.append(f"| {_num(limiar)}{marca} | {_pct(cobertura)} | {_pct(acerto)} |")
    linhas += [
        "",
        f"Com o limiar em uso ({_num(result.threshold_in_use)}), "
        f"{result.noise_fallback} de {result.noise_total} entradas sem sentido (por exemplo "
        '"asdf" e "????") caem na resposta padrão.',
        "",
        "## Limitações",
        "",
        "- O conjunto de teste é pequeno e escrito pelo mesmo autor do treino; os números indicam "
        "o comportamento esperado, não garantem o desempenho com todo tipo de pergunta real.",
        "- A validação cruzada no treino (cada parte testada com frases que o modelo não viu) dá um "
        "resultado bem menor que o teste: o modelo ainda depende de haver exemplos parecidos com a "
        "pergunta. Mais exemplos por intenção tendem a melhorar; o teste atual é mais favorável do "
        "que o uso real.",
        "- O treino **não** foi ajustado a partir dos erros do teste, para não inflar o resultado. "
        "O limiar foi escolhido olhando a tabela acima (equilíbrio entre cobertura e acerto).",
        "- Perguntas sobre saúde individual **não** passam pelo classificador: regras de segurança "
        "as encaminham a um profissional antes (ver `vacina_nlp/safety.py`).",
        "- Frases sem sentido podem cair em `fora_do_escopo` em vez da resposta padrão; ambas "
        "orientam o usuário a reformular ou procurar um profissional.",
        "",
    ]
    return "\n".join(linhas)


def main(argv: list[str] | None = None) -> int:
    """Linha de comando."""
    parser = argparse.ArgumentParser(description="Avalia o classificador de intenções.")
    parser.add_argument("--write-report", type=Path, help="Grava o relatório Markdown neste caminho.")
    parser.add_argument(
        "--write-dashboard", type=Path, help="Grava o painel de métricas (HTML) neste caminho."
    )
    args = parser.parse_args(argv)

    result = evaluate()
    print(
        f"Treino: {result.train_size} | Teste: {result.test_size} | "
        f"Acurácia: {_pct(result.accuracy)} | F1 macro: {_num(result.macro_f1)}"
    )
    if args.write_report:
        args.write_report.write_text(render_report(result, date.today()), encoding="utf-8")
        print(f"Relatório gravado em {args.write_report}")
    if args.write_dashboard:
        from .dashboard import render_dashboard  # import tardio: o painel importa este módulo

        args.write_dashboard.write_text(render_dashboard(result, date.today()), encoding="utf-8")
        print(f"Painel gravado em {args.write_dashboard}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
