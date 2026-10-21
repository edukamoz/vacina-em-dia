"""Gera o recorte dos vetores de palavras (GloVe 50d do NILC) que o serviço de PLN carrega.

Fonte: https://huggingface.co/nilc-nlp/glove-50d (NILC/USP, licença CC-BY-4.0). Citar: Hartmann et
al. (2017), "Portuguese Word Embeddings: Evaluating on Word Analogies and Natural Language Tasks",
STIL 2017.

O arquivo original tem cerca de 186 MB, grande demais para a Function de 512 MB. O recorte guarda,
em meia precisão (float16), as palavras mais frequentes do vocabulário (que vem ordenado por
frequência) mais as palavras dos documentos de vacinas, do dataset de intenções e das respostas do
chatbot. As consultas do conjunto de teste da busca **não** entram na escolha das palavras.

Uso (dentro de ``apps/nlp``; ``origem`` é a pasta com ``embeddings.safetensors`` e ``vocab.txt``)::

    python -m scripts.gerar_embeddings ORIGEM
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import numpy as np

from vacina_nlp.calendar_data import DATA_DIR, load_calendar
from vacina_nlp.preprocess import normalize
from vacina_nlp.search import build_documents

MAIS_FREQUENTES = 40_000
SAIDA = DATA_DIR / "embeddings-pt-50d.npz"


def ler_matriz(caminho: Path) -> np.ndarray:
    """Lê o tensor de um arquivo safetensors simples (sem a biblioteca): cabeçalho JSON + bytes."""
    with caminho.open("rb") as arquivo:
        tamanho = struct.unpack("<Q", arquivo.read(8))[0]
        cabecalho = json.loads(arquivo.read(tamanho))
        (nome,) = [k for k in cabecalho if k != "__metadata__"]
        info = cabecalho[nome]
        if info["dtype"] != "F32":
            raise ValueError(f"Tipo inesperado: {info['dtype']}")
        inicio, fim = info["data_offsets"]
        arquivo.seek(8 + tamanho + inicio)
        dados = np.frombuffer(arquivo.read(fim - inicio), dtype="<f4")
    return dados.reshape(info["shape"])


def palavras_do_projeto() -> set[str]:
    """Palavras (normalizadas) dos documentos, das intenções e das respostas curadas."""
    textos: list[str] = []
    _, documentos = build_documents(load_calendar(), enriched=True)
    textos += documentos
    intencoes = json.loads((DATA_DIR / "intents.json").read_text(encoding="utf-8"))["intents"]
    textos += [frase for frases in intencoes.values() for frase in frases]
    respostas = (DATA_DIR / "responses.json").read_text(encoding="utf-8")
    textos.append(respostas)
    return {palavra for texto in textos for palavra in normalize(texto).split()}


def main(origem: Path) -> None:
    matriz = ler_matriz(origem / "embeddings.safetensors")
    vocabulario = (origem / "vocab.txt").read_text(encoding="utf-8").split("\n")
    if len(vocabulario) < len(matriz):
        raise ValueError("Vocabulário menor que a matriz.")
    projeto = palavras_do_projeto()
    escolhidas: dict[str, int] = {}
    # A mesma palavra normalizada pode ter várias grafias (maiúscula, acento): vale a primeira,
    # que é a mais frequente.
    for posicao, palavra in enumerate(vocabulario[: len(matriz)]):
        chave = normalize(palavra)
        if not chave or chave in escolhidas or " " in chave:
            continue
        if posicao < MAIS_FREQUENTES or chave in projeto:
            escolhidas[chave] = posicao
    palavras = sorted(escolhidas)
    vetores = matriz[[escolhidas[p] for p in palavras]].astype(np.float16)
    np.savez_compressed(SAIDA, palavras=np.array(palavras), vetores=vetores)
    faltam = sorted(projeto - set(palavras))
    print(f"{len(palavras)} palavras, {SAIDA.stat().st_size / 1e6:.1f} MB em {SAIDA.name}")
    print(f"Palavras do projeto sem vetor: {len(faltam)} de {len(projeto)}; exemplos: {faltam[:15]}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
