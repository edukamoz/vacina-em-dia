# ADR-033: Fichas "Sobre esta vacina", com trechos copiados dos manuais do Ministério

- **Status:** aceito em 12/11/2026 (pedido do autor: trazer informações indicativas sobre as vacinas)
- **Item do backlog:** B75
- **Relacionados:** ADR-032 (dado clínico versionado, com fonte e data), CLAUDE.md §8, `docs/18-termos-e-privacidade.md`.

## Contexto

O autor pediu mais informação sobre cada vacina. Não há API oficial do bulário da Anvisa, e escrever fichas de memória é proibido (CLAUDE.md §8). O Ministério da Saúde publica, em PDF **com texto extraível** (ao contrário dos PDFs do calendário), dois manuais que cobrem o assunto: o **Manual de Normas e Procedimentos para Vacinação** (2ª edição revisada, 2024; capítulo 12, vacina por vacina, com Composição e Contraindicação) e o **Manual de Vigilância Epidemiológica de Eventos Adversos Pós-Vacinação** (4ª edição atualizada, 2021; um quadro de "principais eventos adversos" por vacina). O segundo permite reprodução parcial ou total, citada a fonte.

## Decisão

1. **Copiar, não reescrever.** A ficha traz a **composição** e as **contraindicações** exatamente como estão no Manual de Normas (só a primeira letra em maiúscula e as quebras de linha do PDF desfeitas), mais as contraindicações comuns a todos os imunobiológicos (seção 10.1.4.1). Cada trecho foi **conferido por programa** contra o texto extraído do PDF (17 vacinas, 0 divergências em 12/11/2026), e o teste CT-INF-09 impede lixo de formatação.
2. **Reações: apontar, não transcrever.** As reações esperadas estão em quadros do manual de eventos adversos cuja tabela não se extrai com segurança por programa, e um erro de transcrição em dado de saúde é inaceitável. A ficha aponta o quadro e a página e abre o manual. Transcrever os quadros mais importantes, com conferência do autor, fica como próximo passo.
3. **Sem cruzamento com a pessoa.** O app não compara a ficha com alergias, idade ou histórico para dizer se alguém pode ou não tomar a vacina (seria orientação médica individual); o aviso diz isso.
4. **Sem ficha onde não há fonte.** Pneumocócica 20-valente, covid-19, dengue (DNG4) e VSR são mais novas que os manuais: ficam sem ficha (CT-INF-04 lista a lacuna e falha se ela mudar sem querer).
5. **Onde aparece:** botão "Sobre esta vacina" no detalhe da dose do calendário oficial, fechado por padrão. Doses avulsas não têm ficha.
6. **Sem servidor:** os dados ficam em `packages/shared/src/vaccine-info/vaccine-info.ts`, versionados, com a edição e a data da leitura de cada fonte.

## Alternativas

| Opção | Por que não |
|---|---|
| Resumir os manuais com as minhas palavras | Qualquer paráfrase pode mudar o sentido de uma contraindicação. |
| Transcrever os quadros de eventos adversos agora | A extração por programa dos quadros embaralha colunas (frequência, conduta); precisa de conferência manual do autor. |
| Bula da Anvisa por vacina | Não há API documentada; seria transcrição manual de dezenas de PDFs. |

## Consequências

- **Chatbot (feito em 12/11/2026):** a nova intenção `vacina_reacoes` responde a perguntas **gerais** sobre reações apontando o quadro e a página do manual de eventos adversos (os mesmos da ficha, exportados para o serviço de PLN); relato de caso continua indo a um profissional. F1 macro 0,901 para 0,890, meta de 0,85 mantida.
- **Faltam do critério do B75:** as reações comuns copiadas (hoje só apontadas) e as fichas das vacinas novas. Ficam no backlog.
- Os manuais mudam com o tempo; a conferência é manual (o vigia, ADR-030, só cobre os PDFs do calendário).
- O texto "Contraindicações comuns a todos os imunobiológicos" vem da seção 10.1.4.1 do manual de 2024.
