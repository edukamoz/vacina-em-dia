# ADR-023: Embeddings de palavras na busca: avaliados e não adotados

- **Status:** aceito em 21/10/2026 (decisão do autor: aplicar os embeddings vistos nas aulas e adotar só se melhorarem a busca)
- **Item do backlog:** B58 (técnicas das aulas de PLN)
- **Relacionados:** `docs/07-testes/avaliacao-busca-semantica.md`, `docs/07-testes/comparacao-pln.md`, `docs/11-assistente-pln.md`.

## Contexto

O critério da banca "Sistema de busca semântica" é o de maior peso do semestre (20 pontos). A busca usa TF-IDF de caracteres e LSA, e o relatório reconhecia que consultas com palavras ausentes dos dados ("tosse comprida") eram o ponto fraco, que a aula de Word Embeddings promete resolver com similaridade semântica.

## Decisão

1. **Aplicar e medir.** A busca ganhou um terceiro sinal opcional (`embedding_weight` em `VaccineSearch`, em `vacina_nlp/embeddings.py`): vetores de palavras em português, **GloVe 50d do NILC/USP** (licença CC-BY-4.0; Hartmann et al., 2017, STIL). O arquivo original (186 MB) não cabe na Function de 512 MB; `scripts/gerar_embeddings.py` gera um recorte de 37 mil palavras em float16 (3,6 MB, `data/embeddings-pt-50d.npz`). Cada texto vira a média dos vetores das palavras ponderada pelo IDF, menos a média dos documentos; a nota é o cosseno. Sem rede, sem PyTorch, sem serviço novo, sem IA generativa.
2. **Não adotar por padrão.** Nas 63 consultas de teste, **nenhum peso melhorou** a busca e todos pioraram o acerto, inclusive no grupo de vocabulário ausente (de 40% para 0%); como reserva para o que fica abaixo do limiar, os embeddings acertaram 0 de 8 e deram nota alta a perguntas fora do tema. O motivo é que a proximidade dos vetores é por assunto, e as 22 vacinas são todas sobre doenças: "tosse comprida" fica perto de todas, sem apontar a coqueluche. `embedding_weight` fica em 0 e a busca em produção não muda.
3. **Manter o código e o arquivo** como recurso desligado e como evidência da avaliação (o arquivo só é lido quando o peso é maior que 0; custo em produção: nenhum).
4. **Registrar o resultado negativo** no relatório da busca, com os números e as limitações (conjunto pequeno, escrito por uma pessoa só, parâmetros avaliados no mesmo conjunto).

## Alternativas

- **Modelo de frases (sentence-transformers) local:** da ordem de 100 MB, com PyTorch; não cabe na instância de 512 MB. Fica como evolução.
- **Serviço de embeddings na nuvem (por exemplo, Azure OpenAI):** custo por uso e dependência externa; exige aprovação e levantar o custo (B20).
- **Vetores maiores (fastText 300d):** não testados; o problema observado é de domínio homogêneo, não só de dimensão, e o arquivo seria muito maior.

## Consequências

- Atribuição obrigatória (CC-BY-4.0): a fonte e a citação estão em `docs/tech-versions.md` e no cabeçalho de `embeddings.py`.
- O repositório ganha 3,6 MB de dados. O Dockerfile do PLN já copia a pasta `data`.
- A defesa para a banca: a técnica foi implementada e avaliada com honestidade; a escolha do TF-IDF de caracteres com LSA se sustenta nos números.
