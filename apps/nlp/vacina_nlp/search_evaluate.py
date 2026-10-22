"""Avaliação da busca por vacinas (RF06): TF-IDF por palavras, por caracteres e com LSA.

Uso (dentro de ``apps/nlp``)::

    python -m vacina_nlp.search_evaluate
    python -m vacina_nlp.search_evaluate --write-report ../../docs/07-testes/avaliacao-busca-semantica.md

O conjunto de teste (``data/search_test_set.json``) nunca é usado para montar o índice: o índice é
feito só com o calendário. As consultas e as respostas aceitas foram escritas como rascunho e
precisam de revisão (o mesmo vale para todo conjunto escrito por uma pessoa só).
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import sklearn

from .calendar_data import DATA_DIR, Calendar, load_calendar
from .search import (
    DEFAULT_ANALYZER,
    DEFAULT_COMPONENTS,
    DEFAULT_LSA_WEIGHT,
    MIN_SCORE,
    VaccineSearch,
)

CATEGORY_LABELS = {
    "nome": "Nome ou apelido",
    "doenca": "Doença citada",
    "parafrase": "Paráfrase",
    "voz": "Erro de fala",
    "vocabulario_ausente": "Vocabulário ausente",
    "grupo": "Consulta de grupo",
}
THRESHOLDS = (0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50)
COMPONENT_GRID = (5, 8, 12, 16, 20, 21)
WEIGHT_GRID = (0.0, 0.15, 0.3, 0.5, 0.7, 1.0)


@dataclass(frozen=True)
class Query:
    """Uma consulta do conjunto de teste, com as vacinas aceitas como resposta certa."""

    text: str
    accepted: frozenset[str]
    category: str


@dataclass(frozen=True)
class Metrics:
    """Resultado de uma configuração sobre um conjunto de consultas."""

    total: int
    hit_at_1: float
    hit_at_3: float
    mrr: float


def load_test_set(calendar: Calendar) -> tuple[list[Query], list[str]]:
    """Lê as consultas, inclusive as de grupo (respostas vindas do próprio calendário)."""
    raw = json.loads((DATA_DIR / "search_test_set.json").read_text(encoding="utf-8"))
    queries = [Query(q["q"], frozenset(q["ok"]), q["c"]) for q in raw["queries"]]
    for item in raw["derived"]["queries"]:
        accepted = frozenset(rule.vaccine for rule in calendar.rules_in_group(item["group"]))
        queries.append(Query(item["q"], accepted, "grupo"))
    return queries, list(raw["off_topic"])


def rank_of(engine: VaccineSearch, query: Query) -> int | None:
    """Posição (a partir de 1) da primeira vacina aceita com nota positiva, ou ``None``."""
    scores = engine.scores(query.text)
    names = engine.names
    for position, index in enumerate(np.argsort(-scores, kind="stable"), start=1):
        if names[index] in query.accepted and scores[index] > 0:
            return position
    return None


def evaluate(engine: VaccineSearch, queries: list[Query]) -> Metrics:
    """Calcula acerto na 1ª posição, acerto entre as 3 primeiras e MRR."""
    ranks = [rank_of(engine, q) for q in queries]
    n = len(ranks)
    return Metrics(
        total=n,
        hit_at_1=sum(r == 1 for r in ranks) / n,
        hit_at_3=sum(r is not None and r <= 3 for r in ranks) / n,
        mrr=sum(1 / r for r in ranks if r) / n,
    )


def threshold_analysis(
    engine: VaccineSearch, queries: list[Query], off_topic: list[str]
) -> list[tuple[float, float, float]]:
    """Para cada limiar: (limiar, consultas de vacina com resposta certa entre as 3 primeiras,
    perguntas fora do tema sem nenhum resultado)."""
    rows = []
    for limiar in THRESHOLDS:
        kept = 0
        for q in queries:
            scores = engine.scores(q.text)
            order = np.argsort(-scores, kind="stable")[:3]
            kept += any(scores[i] >= limiar and engine.names[i] in q.accepted for i in order)
        rejected = sum(float(engine.scores(text).max()) < limiar for text in off_topic)
        rows.append((limiar, kept / len(queries), rejected / len(off_topic)))
    return rows


EMBEDDING_WEIGHTS = (0.0, 0.05, 0.1, 0.2, 0.3, 0.5)


def embedding_analysis(
    calendar: Calendar, queries: list[Query], off_topic: list[str]
) -> tuple[list[tuple[float, Metrics, float]], list[Query], float, float]:
    """Efeito dos vetores de palavras (GloVe 50d do NILC) como terceiro sinal da busca.

    Returns:
        Uma linha por peso (peso, métricas, acerto na 1ª posição nas consultas de vocabulário
        ausente); as consultas de vacina que ficam abaixo do limiar no padrão; o acerto dos
        embeddings sozinhos nessas consultas; e a nota máxima média deles nas perguntas fora do tema.
    """
    linhas = []
    for peso in EMBEDDING_WEIGHTS:
        motor = VaccineSearch(
            calendar,
            analyzer=DEFAULT_ANALYZER,
            lsa_weight=DEFAULT_LSA_WEIGHT,
            components=DEFAULT_COMPONENTS,
            embedding_weight=peso,
        )
        ausentes = [q for q in queries if q.category == "vocabulario_ausente"]
        linhas.append((peso, evaluate(motor, queries), evaluate(motor, ausentes).hit_at_1))
    padrao = VaccineSearch(
        calendar, analyzer=DEFAULT_ANALYZER, lsa_weight=DEFAULT_LSA_WEIGHT, components=DEFAULT_COMPONENTS
    )
    so_vetores = VaccineSearch(calendar, analyzer=DEFAULT_ANALYZER, lsa_weight=0, embedding_weight=1.0)
    abaixo = [q for q in queries if padrao.scores(q.text).max() < MIN_SCORE]
    certas = sum(
        1 for q in abaixo if so_vetores.names[int(so_vetores.scores(q.text).argmax())] in q.accepted
    )
    acerto_abaixo = certas / len(abaixo) if abaixo else 0.0
    fora = float(np.mean([so_vetores.scores(texto).max() for texto in off_topic])) if off_topic else 0.0
    return linhas, abaixo, acerto_abaixo, fora


def configurations(calendar: Calendar) -> list[tuple[str, VaccineSearch]]:
    """Configurações comparadas (ablação): do índice original ao padrão atual."""
    return [
        (
            "A. Original: palavras, documento básico, só TF-IDF",
            VaccineSearch(calendar, analyzer="word", enriched=False, lsa_weight=0),
        ),
        (
            "B. Documentos enriquecidos (palavras, só TF-IDF)",
            VaccineSearch(calendar, analyzer="word", enriched=True, lsa_weight=0),
        ),
        (
            "C. N-gramas de caracteres (só TF-IDF)",
            VaccineSearch(calendar, analyzer="char", enriched=True, lsa_weight=0),
        ),
        (
            "D. Palavras + LSA",
            VaccineSearch(
                calendar,
                analyzer="word",
                enriched=True,
                lsa_weight=DEFAULT_LSA_WEIGHT,
                components=DEFAULT_COMPONENTS,
            ),
        ),
        (
            "E. Só LSA (caracteres)",
            VaccineSearch(
                calendar, analyzer="char", enriched=True, lsa_weight=1.0, components=DEFAULT_COMPONENTS
            ),
        ),
        (
            "F. Padrão: caracteres + LSA",
            VaccineSearch(
                calendar,
                analyzer=DEFAULT_ANALYZER,
                enriched=True,
                lsa_weight=DEFAULT_LSA_WEIGHT,
                components=DEFAULT_COMPONENTS,
            ),
        ),
    ]


def _pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def build_report(calendar: Calendar) -> str:
    """Monta o relatório em Markdown com os números desta execução."""
    queries, off_topic = load_test_set(calendar)
    configs = configurations(calendar)
    default = configs[-1][1]
    categories = [c for c in CATEGORY_LABELS if any(q.category == c for q in queries)]

    lines = [
        "# Avaliação da busca por vacinas (RF06 e PLN)",
        "",
        "> **Arquivo gerado** por `python -m vacina_nlp.search_evaluate --write-report ...` (dentro de `apps/nlp`). Não edite à mão.",
        "",
        f"- **Data:** {date.today().isoformat()}",
        f"- **Calendário:** {calendar.source.name} (versão {calendar.source.version}), {len(calendar.vaccine_names())} vacinas indexadas",
        f"- **Consultas de teste:** {len(queries)} de vacinas e {len(off_topic)} fora do tema (`vacina_nlp/data/search_test_set.json`)",
        f"- **Bibliotecas:** scikit-learn {sklearn.__version__}, numpy {np.__version__}",
        "",
        "## O que é a busca",
        "",
        "A transcrição da fala (Azure AI Speech) vira uma consulta. Cada vacina é um documento com nome, apelidos populares, doenças evitadas e, nos documentos enriquecidos, faixas, momentos e observações do calendário. A nota de cada vacina combina duas medidas: o **cosseno do TF-IDF de n-gramas de caracteres** (acha o que as duas partes têm em comum, mesmo com erro de transcrição) e o **cosseno no espaço LSA** (análise semântica latente: SVD truncado do TF-IDF, que aproxima termos que aparecem juntos). Sem IA generativa; o resultado são linhas do calendário oficial.",
        "",
        f"Configuração padrão: n-gramas de caracteres (3 a 5), enriquecido, LSA com {DEFAULT_COMPONENTS} componentes e peso {DEFAULT_LSA_WEIGHT} na nota final, limiar de {MIN_SCORE}.",
        "",
        "## Comparação das configurações (todas as consultas de vacinas)",
        "",
        "Acerto na 1ª posição, acerto entre as 3 primeiras e MRR (média do inverso da posição da primeira vacina certa). Quanto maior, melhor.",
        "",
        "| Configuração | Acerto na 1ª | Acerto nas 3 primeiras | MRR |",
        "|---|---|---|---|",
    ]
    for label, engine in configs:
        m = evaluate(engine, queries)
        lines.append(f"| {label} | {_pct(m.hit_at_1)} | {_pct(m.hit_at_3)} | {m.mrr:.3f} |")

    lines += [
        "",
        "## Acerto na 1ª posição por tipo de consulta",
        "",
        "| Tipo (consultas) | " + " | ".join(label.split(".")[0] for label, _ in configs) + " |",
        "|---|" + "---|" * len(configs),
    ]
    for category in categories:
        subset = [q for q in queries if q.category == category]
        cells = [_pct(evaluate(engine, subset).hit_at_1) for _, engine in configs]
        lines.append(f"| {CATEGORY_LABELS[category]} ({len(subset)}) | " + " | ".join(cells) + " |")

    lines += [
        "",
        "## Efeito do LSA (caracteres), pelo número de componentes e pelo peso",
        "",
        "MRR da busca por caracteres com LSA, variando os componentes (colunas) e o peso do LSA (linhas). Peso 0 é só TF-IDF; peso 1 é só LSA.",
        "",
        "| Peso do LSA | " + " | ".join(f"k={k}" for k in COMPONENT_GRID) + " |",
        "|---|" + "---|" * len(COMPONENT_GRID),
    ]
    for weight in WEIGHT_GRID:
        cells = []
        for k in COMPONENT_GRID:
            engine = VaccineSearch(calendar, analyzer="char", enriched=True, lsa_weight=weight, components=k)
            cells.append(f"{evaluate(engine, queries).mrr:.3f}")
        lines.append(f"| {weight} | " + " | ".join(cells) + " |")

    lines += [
        "",
        "## Limiar de nota mínima (configuração padrão)",
        "",
        "Abaixo do limiar a vacina não é devolvida. \"Consultas com acerto\" é a fração de consultas de vacinas cuja resposta certa continua entre as 3 primeiras acima do limiar; \"fora do tema sem resultado\" é a fração de perguntas sem relação com vacinas que não devolvem nada.",
        "",
        "| Limiar | Consultas com acerto | Fora do tema sem resultado |",
        "|---|---|---|",
    ]
    for limiar, kept, rejected in threshold_analysis(default, queries, off_topic):
        marca = " (padrão)" if abs(limiar - MIN_SCORE) < 1e-9 else ""
        lines.append(f"| {limiar:.2f}{marca} | {_pct(kept)} | {_pct(rejected)} |")
    lines += [
        "",
        f"A escolha de {MIN_SCORE} prioriza **não mostrar vacinas para perguntas sem relação** (uma lista de vacinas depois de \"quero uma pizza\" parece erro). O custo é que as consultas com erro de fala mais forte, como \"cacumba\" por \"caxumba\", podem ficar abaixo do limiar e não devolver a lista; a resposta do chatbot continua aparecendo. É uma escolha de produto, não um resultado único: com limiar menor, mais consultas de vacina acertam e mais perguntas fora do tema recebem vacinas.",
    ]

    linhas_emb, abaixo, acerto_abaixo, fora = embedding_analysis(calendar, queries, off_topic)
    lines += [
        "",
        "## Embeddings de palavras (GloVe 50d do NILC): avaliados e não adotados",
        "",
        "Foi testado um terceiro sinal na nota: vetores de palavras em português (GloVe 50d do NILC/USP, licença CC-BY-4.0, recorte de cerca de 37 mil palavras e 3,6 MB gerado por `scripts/gerar_embeddings.py`). Cada texto vira a média dos vetores das suas palavras (ponderada pelo IDF), menos a média dos documentos; a nota é o cosseno. O peso é o do embedding na nota final (o LSA fica em 0,3).",
        "",
        "| Peso do embedding | Acerto na 1ª | Acerto nas 3 primeiras | MRR | Acerto na 1ª (vocabulário ausente) |",
        "|---|---|---|---|---|",
    ]
    for peso, m, ausente in linhas_emb:
        marca = " (padrão, sem embedding)" if peso == 0 else ""
        lines.append(f"| {peso:.2f}{marca} | {_pct(m.hit_at_1)} | {_pct(m.hit_at_3)} | {m.mrr:.3f} | {_pct(ausente)} |")
    lines += [
        "",
        f"Teste como reserva: das {len(queries)} consultas de vacinas, {len(abaixo)} ficam abaixo do limiar no padrão (não devolvem nada). Usando só os embeddings nessas, a vacina certa fica em 1º lugar em **{_pct(acerto_abaixo)}** delas; e a nota máxima média dos embeddings nas perguntas fora do tema é de **{fora:.2f}**, parecida com a das consultas de vacina (o limiar de 0,35 não conseguiria separá-las).",
        "",
        "**Resultado:** nenhum peso melhorou a busca neste conjunto; o aumento do peso piora o acerto, inclusive nas consultas de vocabulário ausente, que era o alvo. Os vetores são razoáveis (\"tosse\" fica perto de \"febre\" e \"vômito\"; \"coqueluche\" perto de \"difteria\" e \"tétano\"), mas essa proximidade é **por assunto**, e as 22 vacinas são todas sobre doenças: \"tosse comprida\" fica perto de todas, sem apontar a coqueluche. Por isso o recurso fica **desligado** (`embedding_weight = 0`) e a busca em produção não muda. Outra forma testada em protótipo, comparar cada palavra da pergunta com a palavra mais parecida de cada vacina, também não superou o padrão (melhor MRR de 0,910 contra 0,928; protótipo não versionado). Ver ADR-023.",
        "",
        "## Como interpretar",
        "",
        "- **De onde vem o ganho:** comparando A, B e C, a maior parte da melhoria vem de **enriquecer os documentos** (faixas, momentos e observações: as consultas de grupo, como \"vacinas para gestante\", passam a funcionar) e de usar **n-gramas de caracteres** (as consultas com erro de fala, que o reconhecimento de voz produz).",
        "- **O que o LSA acrescenta:** com **apenas 22 documentos**, o espaço semântico é pequeno. A diferença entre C e F é de pouca consulta (cada consulta vale cerca de 1,6 ponto percentual) e não é distinguível de ruído; a tabela de componentes e pesos mostra que o resultado oscila pouco. O LSA fica na solução porque é a camada semântica pedida, é barato (milissegundos) e tende a ajudar mais quando o catálogo crescer, mas **não se deve afirmar** que ele, sozinho, melhora a busca neste conjunto.",
        "- **Limite do método:** consultas com palavras que não existem nos dados (por exemplo, \"tosse comprida\", \"bochecha inchada\", \"fígado\") continuam difíceis; nem TF-IDF nem LSA sabem sinônimos que não estão nos documentos. Resolver isso exigiria um modelo de linguagem treinado (embeddings), que traz custo, memória e dependência externa (ver abaixo).",
        "",
        "## Limitações desta avaliação",
        "",
        "- As consultas e as respostas aceitas foram **escritas por uma pessoa só**, como rascunho, e precisam de revisão independente. O conjunto é pequeno (cada consulta pesa 1,6 ponto percentual); diferenças pequenas entre configurações não são conclusivas.",
        "- Os parâmetros (componentes, peso e limiar) foram **escolhidos olhando este mesmo conjunto** (não há conjunto separado de validação por ser tão pequeno), então os números do padrão são otimistas. O índice em si é feito só com o calendário, nunca com as consultas.",
        "- Não mede a qualidade do reconhecimento de fala: as consultas \"de fala\" simulam erros típicos de transcrição, mas não vêm de áudio real.",
        "",
        "## Outras alternativas com embeddings (não adotadas)",
        "",
        "O teste acima usou vetores pequenos (50 dimensões) e gerais. Modelos de frases, treinados para comparar significado (por exemplo, da família sentence-transformers), tendem a ir melhor, mas: um modelo local pequeno (da ordem de 100 MB, com PyTorch) não cabe na instância de 512 MB da Function de PLN; um serviço de embeddings na nuvem tem custo por uso e dependência externa (decisão que o `CLAUDE.md` pede para aprovar). Fica registrada como evolução; o custo deve ser levantado antes (SCRUM-26).",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    """Imprime o relatório ou o grava em arquivo."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", type=Path, help="grava o relatório em Markdown neste arquivo")
    args = parser.parse_args()
    report = build_report(load_calendar())
    if args.write_report:
        args.write_report.write_text(report, encoding="utf-8")
        print(f"Relatório gravado em {args.write_report}")
    else:
        print(report)


if __name__ == "__main__":
    main()
