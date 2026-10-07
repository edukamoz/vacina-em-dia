# Avaliação da busca por vacinas (RF06 e PLN)

> **Arquivo gerado** por `python -m vacina_nlp.search_evaluate --write-report ...` (dentro de `apps/nlp`). Não edite à mão.

- **Data:** 2026-10-06
- **Calendário:** Calendário Nacional de Vacinação 2026 (versão 2026), 21 vacinas indexadas
- **Consultas de teste:** 63 de vacinas e 12 fora do tema (`vacina_nlp/data/search_test_set.json`)
- **Bibliotecas:** scikit-learn 1.9.1, numpy 2.5.3

## O que é a busca

A transcrição da fala (Azure AI Speech) vira uma consulta. Cada vacina é um documento com nome, apelidos populares, doenças evitadas e, nos documentos enriquecidos, faixas, momentos e observações do calendário. A nota de cada vacina combina duas medidas: o **cosseno do TF-IDF de n-gramas de caracteres** (acha o que as duas partes têm em comum, mesmo com erro de transcrição) e o **cosseno no espaço LSA** (análise semântica latente: SVD truncado do TF-IDF, que aproxima termos que aparecem juntos). Sem IA generativa; o resultado são linhas do calendário oficial.

Configuração padrão: n-gramas de caracteres (3 a 5), enriquecido, LSA com 12 componentes e peso 0.3 na nota final, limiar de 0.35.

## Comparação das configurações (todas as consultas de vacinas)

Acerto na 1ª posição, acerto entre as 3 primeiras e MRR (média do inverso da posição da primeira vacina certa). Quanto maior, melhor.

| Configuração | Acerto na 1ª | Acerto nas 3 primeiras | MRR |
|---|---|---|---|
| A. Original: palavras, documento básico, só TF-IDF | 68.3% | 76.2% | 0.722 |
| B. Documentos enriquecidos (palavras, só TF-IDF) | 74.6% | 85.7% | 0.816 |
| C. N-gramas de caracteres (só TF-IDF) | 88.9% | 95.2% | 0.926 |
| D. Palavras + LSA | 68.3% | 87.3% | 0.788 |
| E. Só LSA (caracteres) | 84.1% | 95.2% | 0.898 |
| F. Padrão: caracteres + LSA | 88.9% | 95.2% | 0.928 |

## Acerto na 1ª posição por tipo de consulta

| Tipo (consultas) | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Nome ou apelido (10) | 100.0% | 90.0% | 100.0% | 70.0% | 90.0% | 100.0% |
| Doença citada (21) | 85.7% | 85.7% | 90.5% | 71.4% | 85.7% | 90.5% |
| Paráfrase (12) | 83.3% | 83.3% | 91.7% | 83.3% | 91.7% | 91.7% |
| Erro de fala (10) | 50.0% | 60.0% | 90.0% | 50.0% | 90.0% | 90.0% |
| Vocabulário ausente (5) | 0.0% | 0.0% | 40.0% | 20.0% | 20.0% | 40.0% |
| Consulta de grupo (5) | 0.0% | 80.0% | 100.0% | 100.0% | 100.0% | 100.0% |

## Efeito do LSA (caracteres), pelo número de componentes e pelo peso

MRR da busca por caracteres com LSA, variando os componentes (colunas) e o peso do LSA (linhas). Peso 0 é só TF-IDF; peso 1 é só LSA.

| Peso do LSA | k=5 | k=8 | k=12 | k=16 | k=20 | k=21 |
|---|---|---|---|---|---|---|
| 0.0 | 0.926 | 0.926 | 0.926 | 0.926 | 0.926 | 0.926 |
| 0.15 | 0.926 | 0.911 | 0.926 | 0.918 | 0.926 | 0.926 |
| 0.3 | 0.927 | 0.906 | 0.928 | 0.918 | 0.918 | 0.918 |
| 0.5 | 0.892 | 0.892 | 0.925 | 0.918 | 0.910 | 0.910 |
| 0.7 | 0.848 | 0.871 | 0.916 | 0.910 | 0.910 | 0.910 |
| 1.0 | 0.593 | 0.757 | 0.898 | 0.907 | 0.908 | 0.908 |

## Limiar de nota mínima (configuração padrão)

Abaixo do limiar a vacina não é devolvida. "Consultas com acerto" é a fração de consultas de vacinas cuja resposta certa continua entre as 3 primeiras acima do limiar; "fora do tema sem resultado" é a fração de perguntas sem relação com vacinas que não devolvem nada.

| Limiar | Consultas com acerto | Fora do tema sem resultado |
|---|---|---|
| 0.10 | 95.2% | 0.0% |
| 0.15 | 95.2% | 0.0% |
| 0.20 | 95.2% | 0.0% |
| 0.25 | 95.2% | 0.0% |
| 0.30 | 93.7% | 25.0% |
| 0.35 (padrão) | 87.3% | 91.7% |
| 0.40 | 73.0% | 100.0% |
| 0.50 | 39.7% | 100.0% |

A escolha de 0.35 prioriza **não mostrar vacinas para perguntas sem relação** (uma lista de vacinas depois de "quero uma pizza" parece erro). O custo é que as consultas com erro de fala mais forte, como "cacumba" por "caxumba", podem ficar abaixo do limiar e não devolver a lista; a resposta do chatbot continua aparecendo. É uma escolha de produto, não um resultado único: com limiar menor, mais consultas de vacina acertam e mais perguntas fora do tema recebem vacinas.

## Como interpretar

- **De onde vem o ganho:** comparando A, B e C, a maior parte da melhoria vem de **enriquecer os documentos** (faixas, momentos e observações: as consultas de grupo, como "vacinas para gestante", passam a funcionar) e de usar **n-gramas de caracteres** (as consultas com erro de fala, que o reconhecimento de voz produz).
- **O que o LSA acrescenta:** com **apenas 22 documentos**, o espaço semântico é pequeno. A diferença entre C e F é de pouca consulta (cada consulta vale cerca de 1,6 ponto percentual) e não é distinguível de ruído; a tabela de componentes e pesos mostra que o resultado oscila pouco. O LSA fica na solução porque é a camada semântica pedida, é barato (milissegundos) e tende a ajudar mais quando o catálogo crescer, mas **não se deve afirmar** que ele, sozinho, melhora a busca neste conjunto.
- **Limite do método:** consultas com palavras que não existem nos dados (por exemplo, "tosse comprida", "bochecha inchada", "fígado") continuam difíceis; nem TF-IDF nem LSA sabem sinônimos que não estão nos documentos. Resolver isso exigiria um modelo de linguagem treinado (embeddings), que traz custo, memória e dependência externa (ver abaixo).

## Limitações desta avaliação

- As consultas e as respostas aceitas foram **escritas por uma pessoa só**, como rascunho, e precisam de revisão independente. O conjunto é pequeno (cada consulta pesa 1,6 ponto percentual); diferenças pequenas entre configurações não são conclusivas.
- Os parâmetros (componentes, peso e limiar) foram **escolhidos olhando este mesmo conjunto** (não há conjunto separado de validação por ser tão pequeno), então os números do padrão são otimistas. O índice em si é feito só com o calendário, nunca com as consultas.
- Não mede a qualidade do reconhecimento de fala: as consultas "de fala" simulam erros típicos de transcrição, mas não vêm de áudio real.

## Alternativa com embeddings (não adotada)

Modelos de embeddings dão uma semântica bem mais rica (entendem "tosse comprida"), mas: um modelo local pequeno (da ordem de 100 MB, com PyTorch) não cabe na instância de 512 MB da Function de PLN; um serviço de embeddings na nuvem tem custo por uso e dependência externa (decisão que o `CLAUDE.md` pede para aprovar). Fica registrada como evolução; o custo deve ser levantado antes (SCRUM-26).
