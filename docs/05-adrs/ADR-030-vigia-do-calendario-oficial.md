# ADR-030: Vigia do calendário oficial, por impressão digital dos PDFs

- **Status:** aceito em 10/11/2026 (pedido do autor: atualização automática sem baixar os calendários à mão; o autor pediu para construir o vigia)
- **Item do backlog:** B72
- **Relacionados:** `docs/28-conferencia-do-calendario-2026-11-10.md` (teste de acesso e linha de base), ADR-015 (e-mail com o Brevo), ADR-020 (Blob Storage), CLAUDE.md §8.

## Contexto

O calendário oficial é publicado como cinco PDFs em endereços fixos do portal do Ministério da Saúde. Não há API nem dado aberto estruturado, e o portal não informa data de modificação nem `ETag`. Os PDFs não têm texto extraível (as letras viraram desenho), então não dá para ler as vacinas por programa, e a conferência do conteúdo é visual (`docs/28`). Em 10/11/2026 as notas de rodapé já tinham mudado sem aviso desde a transcrição de 06/10/2026.

## Decisão

1. **Detectar mudança, não aplicá-la.** Uma Function agendada baixa os cinco PDFs, calcula o SHA-256 e compara com o do arquivo que o projeto transcreveu (`CALENDAR_SOURCES`, em `calendar-watch-service.ts`). Se difere, o autor recebe um e-mail. **A atualização do calendário continua sendo um PR com revisão**, porque dado vacinal só entra com fonte oficial confirmada.
2. **Quando:** toda segunda-feira, 12h UTC (9h em Brasília). Um calendário anual não precisa de mais.
3. **Aviso uma vez por mudança:** o estado guarda a última impressão digital que já gerou e-mail; o mesmo arquivo alterado não gera e-mail toda semana, mas a leitura pública continua dizendo `changed: true` até o autor atualizar a linha de base no código. Se o e-mail falhar, a próxima verificação tenta de novo. Falha de download de um arquivo não conta como mudança e não derruba os outros.
4. **Onde fica o estado:** um JSON no Blob Storage (contêiner `vigia-do-calendario`, a mesma conta das fotos de perfil). Sem tabela nova e sem custo adicional relevante.
5. **Para onde vai o aviso:** `CALENDAR_WATCH_ALERT_EMAIL` (configuração da Function; não fica no repositório). Sem ela, a mudança só é registrada. O envio usa o cliente do Brevo já existente.
6. **Superfície HTTP:** `GET /api/calendar/watch` (público: só a data da última conferência e `changed`) e `POST /api/calendar/watch/check` (nível `function`: exige a chave da função; confere na hora e serve para testar o acesso ao portal a partir da Azure).
7. **Boa conduta com o portal:** só baixa de `https://www.gov.br/saude/`, um arquivo por vez, `User-Agent` `vacina-em-dia-vigia/0.1`, tempo de 30 s, teto de 8 MB, uma vez por semana. O `robots.txt` do portal não bloqueia `/saude/` (conferido em 10/11/2026). Nenhum dado de usuário vai às fontes oficiais.

8. **No app:** o rodapé da fonte (`AvisoFonte`, nas abas Doses e Histórico e no painel) lê `GET /api/calendar/watch` e mostra "Conferido com o site do Ministério da Saúde em dd/mm/aaaa"; se `changed` for verdadeiro, acrescenta que o Ministério publicou arquivos diferentes e a atualização está em análise. Se a consulta falhar ou nunca tiver rodado, a frase não aparece.

## Alternativas

| Opção | Por que não |
|---|---|
| Ler o conteúdo dos PDFs por programa | Os PDFs não têm texto; exigiria OCR, que erra dado vacinal. |
| Atualizar o calendário sozinho | Contraria o CLAUDE.md §8: dado vacinal só com fonte oficial confirmada por pessoa. |
| Conferir só a página, não os PDFs | A página pouco muda; o que muda são os arquivos. |
| Tabela do Azure para o estado | Dependência e recurso novos para guardar um JSON pequeno. |

## Consequências

- Falsos positivos são possíveis: um PDF regerado com o mesmo conteúdo muda a impressão digital. O aviso diz só "diferente", e a conferência visual decide.
- **Ainda não testado a partir de um IP da Azure** (o Butantan bloqueou a Function, ADR-024). O `POST /api/calendar/watch/check` existe para isso; se o portal bloquear, a alternativa é rodar a verificação em um agendador fora da Azure (por exemplo, GitHub Actions) e abrir uma issue.
- Ao atualizar o calendário para uma versão nova, trocar as impressões digitais em `CALENDAR_SOURCES` junto com `pni-2026.ts`.
