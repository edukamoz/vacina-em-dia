"""Painel de métricas do chatbot: uma página HTML única, sem bibliotecas externas.

Gerada por ``python -m vacina_nlp.evaluate --write-dashboard <arquivo.html>``. Mostra acurácia, F1
por intenção, matriz de confusão, a escolha do limiar de confiança e os erros do conjunto de teste.
Serve para a apresentação e para a Documentação Técnica; os números vêm da mesma avaliação do
relatório em Markdown (``evaluate.render_report``).
"""

from __future__ import annotations

from datetime import date
from html import escape

import sklearn

from .evaluate import F1_TARGET, Evaluation

_CSS = """
:root{--fundo:#f6faf8;--superficie:#fff;--texto:#10241d;--suave:#4d625a;--borda:#cfdcd6;
--marca:#0b6b52;--bom:#0b6b52;--medio:#b7791f;--ruim:#b42318;--grade:#e4ece8}
@media (prefers-color-scheme:dark){:root{--fundo:#0d1512;--superficie:#15211c;--texto:#e8f1ed;
--suave:#a7bab2;--borda:#2b3d36;--marca:#6fd0aa;--bom:#6fd0aa;--medio:#f0b866;--ruim:#ff8a7a;
--grade:#22322b}}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.5 "Atkinson Hyperlegible",
system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:2rem;line-height:1.2;margin:0 0 4px}
h2{font-size:1.4rem;margin:40px 0 12px}
p.apoio{color:var(--suave);margin:0 0 16px;max-width:70ch}
.cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.cartao{background:var(--superficie);border:1px solid var(--borda);border-radius:16px;padding:16px}
.cartao b{display:block;font-size:2rem;line-height:1.1}
.cartao span{color:var(--suave)}
.cartao .ok{color:var(--bom);font-weight:700}
.cartao .falha{color:var(--ruim);font-weight:700}
.barras{background:var(--superficie);border:1px solid var(--borda);border-radius:16px;padding:16px}
.barra{display:grid;grid-template-columns:minmax(120px,230px) 1fr 56px;gap:12px;align-items:center;
padding:4px 0}
.barra code{font-size:.85rem;overflow-wrap:anywhere}
.trilho{position:relative;height:14px;background:var(--grade);border-radius:7px;overflow:visible}
.trilho i{display:block;height:100%;border-radius:7px}
.trilho .meta{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--texto);opacity:.6}
.bom{background:var(--bom)}.medio{background:var(--medio)}.ruim{background:var(--ruim)}
.barra output{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.legenda{color:var(--suave);font-size:.9rem;margin-top:8px}
.rolagem{overflow-x:auto;background:var(--superficie);border:1px solid var(--borda);
border-radius:16px;padding:12px}
table{border-collapse:collapse;font-variant-numeric:tabular-nums}
.matriz th,.matriz td{width:28px;min-width:28px;height:28px;text-align:center;font-size:.8rem;
padding:0;border:1px solid var(--grade)}
.matriz thead th{height:150px;vertical-align:bottom}
.matriz thead th span{display:inline-block;writing-mode:vertical-rl;transform:rotate(180deg);
white-space:nowrap;font-weight:400;font-size:.78rem;padding:4px 0}
.matriz tbody th{text-align:right;width:auto;padding:0 8px;white-space:nowrap;font-weight:400;
font-size:.78rem}
.matriz td.zero{color:transparent}
.tabela{width:100%}
.tabela th,.tabela td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--grade)}
.tabela th{color:var(--suave);font-weight:700}
.grafico{background:var(--superficie);border:1px solid var(--borda);border-radius:16px;padding:16px}
.grafico svg{width:100%;height:auto;display:block}
.chave{display:flex;gap:16px;flex-wrap:wrap;color:var(--suave);font-size:.9rem;margin-top:8px}
.chave i{display:inline-block;width:18px;height:4px;border-radius:2px;margin-right:6px;
vertical-align:middle}
footer{margin-top:40px;color:var(--suave);font-size:.9rem;max-width:80ch}
"""


def _pct(valor: float) -> str:
    return f"{valor * 100:.1f}%".replace(".", ",")


def _num(valor: float) -> str:
    return f"{valor:.3f}".replace(".", ",")


def _classe_f1(f1: float) -> str:
    if f1 >= F1_TARGET:
        return "bom"
    return "medio" if f1 >= 0.7 else "ruim"


def _cartoes(r: Evaluation) -> str:
    atingiu = r.macro_f1 >= F1_TARGET
    estado = (
        f'<b class="ok" style="display:inline;font-size:1rem">Meta de {_num(F1_TARGET)} atingida</b>'
        if atingiu
        else f'<b class="falha" style="display:inline;font-size:1rem">Abaixo da meta de '
        f"{_num(F1_TARGET)}</b>"
    )
    itens = [
        (_pct(r.accuracy), "Acurácia no teste", escape(f"{r.test_size} frases separadas do treino")),
        (_num(r.macro_f1), "F1 macro", estado),
        (_num(r.weighted_f1), "F1 ponderado", "Peso por número de frases"),
        (
            _pct(r.cv_accuracy),
            "Acurácia na validação cruzada",
            escape(f"F1 macro {_num(r.cv_macro_f1)}; só treino, 5 partes"),
        ),
        (
            f"{r.noise_fallback} de {r.noise_total}",
            "Entradas sem sentido na resposta padrão",
            escape(f"Limiar de confiança em uso: {_num(r.threshold_in_use)}"),
        ),
        (f"{r.train_size}", "Frases de treino", escape(f"{r.intents} intenções, escritas à mão")),
    ]
    return "\n".join(
        f'<div class="cartao"><b>{escape(valor)}</b>{escape(titulo)}<br><span>{detalhe}</span></div>'
        for valor, titulo, detalhe in itens
    )


def _barras(r: Evaluation) -> str:
    linhas = []
    for m in sorted(r.per_class, key=lambda c: (c.f1, c.intent)):
        linhas.append(
            '<div class="barra">'
            f"<code>{escape(m.intent)}</code>"
            f'<div class="trilho" role="img" aria-label="F1 de {escape(m.intent)}: {_num(m.f1)}">'
            f'<i class="{_classe_f1(m.f1)}" style="width:{m.f1 * 100:.1f}%"></i>'
            f'<span class="meta" style="left:{F1_TARGET * 100:.1f}%"></span></div>'
            f"<output>{_num(m.f1)}</output></div>"
        )
    return "\n".join(linhas)


def _matriz(r: Evaluation) -> str:
    if not r.labels:
        return "<p>Matriz indisponível.</p>"
    cabecalho = "".join(f'<th scope="col"><span>{escape(nome)}</span></th>' for nome in r.labels)
    corpo = []
    for i, nome in enumerate(r.labels):
        celulas = []
        for j, valor in enumerate(r.confusion[i]):
            if valor == 0:
                celulas.append('<td class="zero">0</td>')
                continue
            cor = "var(--bom)" if i == j else "var(--ruim)"
            peso = min(1.0, 0.25 + 0.2 * valor)
            celulas.append(
                f'<td style="background:color-mix(in srgb,{cor} {peso * 100:.0f}%,transparent)" '
                f'title="Esperada {escape(nome)}, prevista {escape(r.labels[j])}: {valor}">'
                f"{valor}</td>"
            )
        corpo.append(f'<tr><th scope="row">{escape(nome)}</th>{"".join(celulas)}</tr>')
    return (
        '<table class="matriz"><caption class="legenda">Linhas: intenção esperada. Colunas: '
        "intenção prevista. Verde na diagonal: acertos; vermelho fora dela: confusões.</caption>"
        f"<thead><tr><th></th>{cabecalho}</tr></thead><tbody>{''.join(corpo)}</tbody></table>"
    )


def _grafico_limiar(r: Evaluation) -> str:
    largura, altura, margem = 640, 280, 40
    xs = [m for m, _, _ in r.thresholds]
    minimo, maximo = min(xs), max(xs)

    def x(valor: float) -> float:
        return margem + (valor - minimo) / (maximo - minimo) * (largura - 2 * margem)

    def y(valor: float) -> float:
        return altura - margem - valor * (altura - 2 * margem)

    grade = "".join(
        f'<line x1="{margem}" x2="{largura - margem}" y1="{y(v):.1f}" y2="{y(v):.1f}" '
        'stroke="var(--grade)"/>'
        f'<text x="{margem - 6}" y="{y(v) + 4:.1f}" text-anchor="end" fill="var(--suave)" '
        f'font-size="11">{int(v * 100)}%</text>'
        for v in (0, 0.25, 0.5, 0.75, 1)
    )
    rotulos = "".join(
        f'<text x="{x(l):.1f}" y="{altura - margem + 18}" text-anchor="middle" '
        f'fill="var(--suave)" font-size="11">{_num(l)}</text>'
        for l, _, _ in r.thresholds
    )
    cobertura = " ".join(f"{x(l):.1f},{y(c):.1f}" for l, c, _ in r.thresholds)
    acerto = " ".join(f"{x(l):.1f},{y(a):.1f}" for l, _, a in r.thresholds)
    pontos = "".join(
        f'<circle cx="{x(l):.1f}" cy="{y(c):.1f}" r="4" fill="var(--medio)"/>'
        f'<circle cx="{x(l):.1f}" cy="{y(a):.1f}" r="4" fill="var(--bom)"/>'
        for l, c, a in r.thresholds
    )
    uso = x(r.threshold_in_use)
    return (
        f'<svg viewBox="0 0 {largura} {altura}" role="img" aria-label="Cobertura e acerto por '
        'limiar de confiança">'
        f"{grade}{rotulos}"
        f'<line x1="{uso:.1f}" x2="{uso:.1f}" y1="{margem - 10}" y2="{altura - margem}" '
        'stroke="var(--texto)" stroke-dasharray="4 4"/>'
        f'<text x="{uso + 6:.1f}" y="{margem - 2}" fill="var(--texto)" font-size="11">'
        "em uso</text>"
        f'<polyline points="{cobertura}" fill="none" stroke="var(--medio)" stroke-width="3"/>'
        f'<polyline points="{acerto}" fill="none" stroke="var(--bom)" stroke-width="3"/>'
        f"{pontos}</svg>"
        '<div class="chave"><span><i style="background:var(--medio)"></i>Cobertura (perguntas '
        "respondidas)</span><span><i style=\"background:var(--bom)\"></i>Acerto entre as "
        "respondidas</span></div>"
    )


def _erros(r: Evaluation) -> str:
    if not r.errors:
        return "<p>Nenhum erro no conjunto de teste.</p>"
    linhas = "".join(
        f"<tr><td>{escape(texto)}</td><td><code>{escape(esperado)}</code></td>"
        f"<td><code>{escape(previsto)}</code></td><td>{_num(confianca)}</td></tr>"
        for texto, esperado, previsto, confianca in r.errors
    )
    return (
        '<div class="rolagem"><table class="tabela"><thead><tr><th>Frase</th><th>Esperada</th>'
        f"<th>Prevista</th><th>Confiança</th></tr></thead><tbody>{linhas}</tbody></table></div>"
    )


def render_dashboard(result: Evaluation, today: date) -> str:
    """Página HTML do painel de métricas (um arquivo só, com CSS e gráficos em SVG embutidos)."""
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel de métricas do chatbot</title>
<style>{_CSS}</style>
</head>
<body>
<main>
<h1>Painel de métricas do chatbot</h1>
<p class="apoio">Classificador de intenções do Vacina em Dia: TF-IDF e SVM linear
(scikit-learn {escape(sklearn.__version__)}), sem IA generativa. Gerado em
{today.strftime("%d/%m/%Y")} a partir do conjunto de teste separado do treino. Tudo aqui é
reproduzível com <code>python -m vacina_nlp.evaluate</code>.</p>

<section aria-labelledby="resumo"><h2 id="resumo">Resumo</h2>
<div class="cartoes">{_cartoes(result)}</div></section>

<section aria-labelledby="f1"><h2 id="f1">F1 por intenção</h2>
<p class="apoio">Da menor para a maior. A linha preta marca a meta de {_num(F1_TARGET)}.</p>
<div class="barras">{_barras(result)}</div>
<p class="legenda">Verde: atinge a meta. Amarelo: entre 0,700 e a meta. Vermelho: abaixo de
0,700. O número ao lado de cada barra é o valor exato.</p></section>

<section aria-labelledby="matriz"><h2 id="matriz">Matriz de confusão</h2>
<p class="apoio">Onde o modelo troca uma intenção por outra. Os acertos ficam na diagonal.</p>
<div class="rolagem">{_matriz(result)}</div></section>

<section aria-labelledby="limiar"><h2 id="limiar">Limiar de confiança</h2>
<p class="apoio">Abaixo do limiar o assistente devolve a resposta padrão (orientar procurar um
profissional ou uma unidade de saúde). Um limiar maior responde menos perguntas, mas acerta mais
entre as que responde.</p>
<div class="grafico">{_grafico_limiar(result)}</div></section>

<section aria-labelledby="erros"><h2 id="erros">Erros no teste</h2>
{_erros(result)}</section>

<footer>
<p><b>Como ler com cuidado:</b> o conjunto de teste é pequeno e foi escrito pelo mesmo autor do
treino. A validação cruzada, feita só com o treino, dá um resultado bem menor
({_pct(result.cv_accuracy)} de acurácia): o modelo ainda depende de haver exemplos parecidos com a
pergunta. O treino não foi ajustado a partir dos erros do teste. Perguntas sobre saúde individual
não passam pelo classificador: regras de segurança as encaminham a um profissional.</p>
</footer>
</main>
</body>
</html>
"""
