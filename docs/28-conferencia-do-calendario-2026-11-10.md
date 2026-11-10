# Conferência do calendário vacinal contra os PDFs oficiais (10/11/2026)

Item do backlog: B72 (vigia do calendário oficial). Este documento registra uma **conferência visual** do calendário do projeto (`packages/shared/src/calendar/pni-2026.ts`, transcrito em 06/10/2026) contra os cinco PDFs que o Ministério da Saúde publica **hoje** em <https://www.gov.br/saude/pt-br/vacinacao/calendario>. Nada no calendário do projeto foi alterado por esta conferência.

## Como foi feito

- Os cinco PDFs foram baixados uma vez cada, em 10/11/2026, com identificação clara no cabeçalho (`vacina-em-dia-vigia/0.1`), e renderizados em imagem. **Os PDFs não têm nenhum texto extraível** (as letras viraram desenho), então a leitura é visual.
- Cada linha de cada tabela e cada nota de rodapé foi lida na imagem e comparada com o que está no projeto (`apps/nlp/vacina_nlp/data/pni-2026.json`, gerado do mesmo calendário).
- **Limites:** a leitura foi feita por uma sessão do Claude, não por um profissional de saúde; precisa ser confirmada pelo autor. Não é revisão clínica. As notas abaixo resumem as diferenças com trechos curtos; o texto oficial completo está nos PDFs.

## Resultado em uma frase

**As tabelas (vacina, dose, idade) estão corretas. As notas de rodapé mudaram.** Os PDFs de hoje se apresentam como "revisados" no título e foram criados em **28/10/2026**, depois da transcrição do projeto (06/10/2026).

## Tabelas de vacinas: conferem

| Faixa | Linhas no PDF | Linhas no projeto | Resultado |
|---|---|---|---|
| Criança | 34 | 34 | Conferem |
| Adolescente e jovem | 10 | 10 | Conferem |
| Adulto | 6 | 6 | Conferem |
| Idoso | 8 | 8 | Conferem |
| Gestante | 7 | 7 | Conferem |

Diferenças só de rótulo, sem efeito nas regras: a linha de febre amarela em casos excepcionais da criança aparece no PDF como "**6 a 8 meses**" e no projeto como "6 meses"; "meningite meningocócica ACWY" (PDF) contra "meningocócica ACWY" (projeto); e a dTpa e a VVSR da gestante aparecem como "1 dose em cada gestação" nos dois, o projeto só escreve o texto junto da semana.

## Notas de rodapé: o que mudou

### Mudanças de conteúdo (mais importantes)

| Nota | O que mudou no PDF de hoje |
|---|---|
| **Febre amarela**, em todas as faixas (criança.4, adolescente.2, adulto.2, idoso.2, gestante.1) | "área de risco epidemiológico" passou a "**área com circulação viral confirmada\***", com um rodapé novo que define essa área ("casos humanos, epizootia ou potenciais vetores infectados, em contextos de surto, alto risco epidemiológico e emergência em saúde pública"). Na criança sumiu uma frase ("E diante desse risco, todas as crianças devem manter a situação vacinal atualizada") e o motivo do prazo de 10 dias. Em idoso.2 sumiu "quando há alto risco de contrair a doença". Na gestante, a nota agora fala em "vivem ou vão viajar" e termina com "pelo menos 10 dias antes da viagem". **Relevante para o B74 (vacinas para viagem).** |
| **Idoso.5**, pneumocócica 20-valente | **Critério ampliado**: agora vale para "pessoas entre 60 e 84 anos, 11 meses e 29 dias acamadas e/ou institucionalizadas" **e para "todos os idosos a partir de 85 anos de idade"**, além dos povos indígenas sem histórico com pneumo conjugada. O projeto ainda diz "somente para não vacinados que vivem acamados e/ou institucionalizados...". Quem tem 85 anos ou mais não vê que é indicado. |
| **Adulto.1**, dT | Ganhou uma condição: "**para adultos com histórico vacinal em dia, conforme agenda oportuna**", reforço aos 34 anos e depois a cada 10 anos (antecipando para 5 em caso de exposição a risco de "difteria **e/ou** tétano"). |
| **Varicela** (adolescente.4, adulto.4, idoso.4) | Passou a dizer "trabalhadores da saúde e povos indígenas, **conforme histórico vacinal** e sem história da doença ou na dúvida". |
| **Gestante.2** | A nota "Esta vacina protege também o bebê nos seus primeiros meses de vida" **não existe mais** no PDF (a dTpa não tem mais marca de nota). |
| **Nova observação em todas as faixas** | "Pessoas que apresentam condições clínicas especiais que as tornem mais vulneráveis... procurar o Centro de Referência para Imunobiológicos Especiais (CRIE) mais próximo ou uma sala de vacina da Rede de Imunobiológicos para Pessoas com Situações Especiais (RIE)". O projeto não tem essa observação. |

### Mudanças só de redação (sem mudar o sentido)

- **Criança.2** (influenza): "Crianças de 6 meses a menores de 6 anos devem ser vacinadas todo ano" virou "Criança na faixa etária entre 6 meses e 5 anos, 11 meses e 29 dias deve ser vacinada todo ano". Mesmo intervalo; **o limite de idade da repetição que o app aplica (antes de completar 6 anos) continua correto**, mas o trecho citado em `recurrence.basis` e no teste `CT-OFIC-04` usa a redação antiga.
- **Criança.6** (pneumocócica aos 5 anos): saiu "a partir de 5 anos de idade".
- **Adolescente.6** (dengue): "Utilizar um só laboratório" virou "Utilizar vacinas de um só laboratório".
- **dTpa** (adolescente.8, adulto.1, idoso.1): "profissionais de saúde" virou "profissionais de saúde atuantes em quaisquer áreas".
- Pequenos ajustes de pontuação (por exemplo, "entre 15 anos a 19 anos" virou "e").

### Sem mudança

criança.1, criança.3, criança.5, criança.7, adolescente.1, 3, 5 e 7, adulto.3 e 5, idoso.3.

## O que isto significa para o app

- Os **prazos, idades e doses** que o app calcula e mostra estão corretos.
- As **notas oficiais exibidas** no detalhe de cada dose estão desatualizadas em vários pontos; os de maior efeito são o **idoso.5** (quem tem 85 anos ou mais) e a redação da **febre amarela**.
- A fonte exibida no app diz "Calendário Nacional de Vacinação 2026", versão 2026, obtido em 06/10/2026. Os arquivos de hoje são uma revisão posterior da mesma versão.

## Proposta (a confirmar pelo autor)

1. Atualizar as notas do calendário para o texto dos PDFs de hoje (e a data de obtenção e os nomes dos arquivos), em um PR com revisão do autor, porque dado vacinal só entra com fonte oficial confirmada (CLAUDE.md §8).
2. Ajustar o trecho de `recurrence.basis` e o teste `CT-OFIC-04` à nova redação da nota da influenza da criança.
3. Tratar o **idoso.5** como prioridade: decidir se a pneumocócica 20-valente passa a ser sugerida a todos com 85 anos ou mais.
4. Construir o vigia (B72) usando os hashes abaixo como ponto de partida.

## Impressão digital dos PDFs de 10/11/2026

Servem de linha de base para o vigia. Os endereços são fixos e a página não informa data de modificação nem `ETag`, então a mudança só se detecta pelo conteúdo. Duas leituras seguidas deram bytes idênticos.

| Arquivo | Tamanho (bytes) | SHA-256 | Criado em (metadado do PDF) |
|---|---|---|---|
| `calendario-nacional-de-vacinacao-crianca` | 1.674.299 | `775ebe8f734afbd9c4dccfdac9a37fac057b599d7a9992687c505eca58374f6c` | 28/10/2026 16:11 |
| `calendario-nacional-de-vacinacao-adolescentes-jovens` | 1.179.589 | `b7c994f360bc4850fe04ef71996e8c5933468ec6fa32fe98cb31eefe7849bf34` | 28/10/2026 16:14 |
| `calendario-nacional-de-vacinacao-adulto` | 1.039.708 | `d6ca03c7036efe9c76f763d3ea4d0d3fbebf0e72af273243bcf389daa87a27b5` | 28/10/2026 16:19 |
| `calendario-nacional-de-vacinacao-idoso` | 1.158.092 | `b95f057ff1e9b897e0744afc4c1ab248c3e03527ec9110314a3da693c56a0fd3` | 28/10/2026 16:24 |
| `calendario-nacional-de-vacinacao-gestante` | 1.071.446 | `d360af929f27e77f5610d61d3a02c566863bbc2dc04d9b2418b9c23ca4856d01` | 28/10/2026 16:07 |

Endereço base: `https://www.gov.br/saude/pt-br/vacinacao/arquivos/` seguido do nome do arquivo.

## Sobre o acesso automático (teste de 10/11/2026)

- O `robots.txt` do portal não bloqueia `/saude/`. A página e os cinco PDFs respondem 200 em 0,4 a 1,3 s a partir de uma rede residencial, e o PDF do idoso respondeu 200 em ~5 s a partir de três servidores externos.
- **Não foi testado a partir de um IP da Azure.** Isso só se verifica de dentro da Function do vigia.
- O rodapé do portal informa que o conteúdo é publicado sob a licença Creative Commons Atribuição-SemDerivações; vale o autor decidir se isso importa para a transcrição (o app já cita a fonte e a versão).
