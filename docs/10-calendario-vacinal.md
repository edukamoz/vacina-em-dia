# Calendário vacinal (RF03, SCRUM-16)

O app usa o **Calendário Nacional de Vacinação 2026**, do Ministério da Saúde (PNI), transcrito dos cinco arquivos oficiais obtidos em 06/10/2026 em <https://www.gov.br/saude/pt-br/vacinacao/calendario>:

| Faixa | Arquivo | Linhas |
|---|---|---|
| Criança (0 a 9 anos, 11 meses e 29 dias) | `Calendário Nacional de Vacinação - Criança.pdf` | 34 |
| Adolescente e jovem (10 a 24 anos, 11 meses e 29 dias) | `... - Adolescentes e jovens.pdf` | 10 |
| Adulto (25 a 59 anos, 11 meses e 29 dias) | `... - Adulto.pdf` | 6 |
| Idoso (60 anos ou mais) | `... - Idoso.pdf` | 8 |
| Gestante | `... - Gestante.pdf` | 7 |

Os dados ficam em `packages/shared/src/calendar/pni-2026.ts`, com fonte, versão e data de obtenção. Nada foi preenchido de memória (CLAUDE.md §8). Quando sair uma nova versão, cria-se um novo conjunto e mantém-se o anterior.

## Como o calendário vira doses

- **Faixa do membro:** definida pela idade em meses completos na data de hoje (limites acima). Cada membro recebe as linhas da sua faixa; a **gestante** soma as linhas da gestação.
- **Quem já passou da infância ao cadastrar** não recebe as doses da faixa infantil: esse histórico só consta na caderneta.
- **Linha por idade** (ex.: "12 meses"): a data prevista é o nascimento mais a idade em meses (se o dia não existe no mês, usa o último dia do mês).
- **"Conforme histórico vacinal"** e **gestação**: o calendário não fixa idade nem prazo; a dose aparece com data prevista de hoje, como lembrete de conferir a caderneta, e **nunca fica atrasada** sozinha.
- **Linha condicional** (trabalhador de saúde, povos indígenas, área de risco, casos excepcionais): mostrada com aviso e **nunca fica atrasada** sozinha.
- **Atraso automático** (rotina de prazo, T4 e T7): só para linha por idade e sem condição.
- **"3 doses" numa linha** vira uma única dose no ciclo de vida do app (simplificação assumida).
- **Notas de rodapé oficiais** acompanham cada linha e são exibidas na tela.

## Pontos a conferir pelo autor

- O rotavírus aparece como "sorotipos G1" na imagem do PDF da criança e como "G11" na camada de texto do arquivo. Foi usado **G1** (a imagem).
- Os textos das notas foram copiados dos PDFs; o asterisco de "área de risco epidemiológico" foi omitido e a definição da área (circulação viral comprovada...) não está reproduzida.
- Os 4 meses trazem "pneumocócica 10-valente" e os 2 meses e 12 meses trazem "20-valente", como está no PDF oficial.

## Casos de teste

Automatizados em `packages/shared/src/calendar/rules.test.ts` e `packages/shared/src/domain/civil-date.test.ts`:

| ID | O que verifica |
|---|---|
| CT-CAL-01 a 05 | Integridade dos dados: ids únicos, notas existentes e usadas, total de linhas por faixa, fonte oficial e versionada, idades válidas |
| CT-CAL-06 e 07 | Limites das faixas etárias (119/120, 299/300, 719/720 meses) |
| CT-CAL-08 a 12 | Regras indicadas para bebê, adulto, gestante, não gestante e idoso |
| CT-CAL-13 e 14 | Cálculo da data prevista (inclusive fim de mês) e regras sem prazo fixo |
| CT-CAL-15 | Quais regras podem atrasar |
| CT-CAL-16 e 17 | Notas de rodapé de cada regra |
| CT-CAL-D01 a D04 | Soma de meses e idade em meses (limites, fim de mês, ano bissexto, data inválida) |
