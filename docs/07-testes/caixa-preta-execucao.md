# Tabela de execução dos testes de caixa preta

> **Arquivo gerado** pela execução automatizada (`GERAR_TABELA=1 npx jest src/caixa-preta` em `apps/api`). Não edite à mão: rode de novo. O "Obtido" é o que a API devolveu **nesta execução**, não o que se esperava.

- **Data da execução:** 2026-10-07
- **Versão do código (commit):** 91ce223
- **Resultado geral:** 127 de 127 casos aprovados
- **Como foi executado:** pelas camadas de entrada da API (validação Zod, handlers, serviços e regras de domínio reais), em memória, com relógio controlado (hoje = 2026-10-06), sem rede e sem Azure. Atende a "teste de caixa preta com tabela de execução" da entrega de Qualidade e Testes.
- **Técnicas:** PE = partição de equivalência; VL = análise de valor limite. Descrição das partições e dos limites: `docs/07-testes/caixa-preta-casos.md`.
- **Legenda de "Esperado" e "Obtido":** código HTTP, código de erro da API e, quando conferido, um detalhe (por exemplo, a faixa etária ou o estado da dose).

## Resumo por funcionalidade

| Funcionalidade | Requisito | Casos | PE | VL | Aprovados | Reprovados |
|---|---|---|---|---|---|---|
| Cadastro de conta | RF01 | 17 | 9 | 8 | 17 | 0 |
| Login | RF01 | 11 | 7 | 4 | 11 | 0 |
| Recuperação de senha | RF01 | 16 | 8 | 8 | 16 | 0 |
| Consentimento | RF09 | 10 | 6 | 4 | 10 | 0 |
| Membros da família | RF02 | 25 | 13 | 12 | 25 | 0 |
| Faixa etária do calendário | RF03 | 7 | 0 | 7 | 7 | 0 |
| Doses | RF04 | 22 | 16 | 6 | 22 | 0 |
| Assistente | RF06 e RF07 | 19 | 8 | 11 | 19 | 0 |
| **Total** | | **127** | **67** | **60** | **127** | **0** |

## Cadastro de conta (RF01)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-C01 | PE | E-mail e senha válidos | ana@exemplo.com.br / frase de 24 caracteres | 201 | 201 | Aprovado |
| CT-CP-C02 | PE | E-mail inválido: sem @ | ana.exemplo.com.br | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C03 | PE | E-mail inválido: vazio | (vazio) | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C04 | PE | E-mail inválido: sem domínio | ana@ | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C05 | VL | E-mail no limite máximo (254) | e-mail de 254 caracteres | 201 | 201 | Aprovado |
| CT-CP-C06 | VL | E-mail acima do máximo (255) | e-mail de 255 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C07 | VL | Senha abaixo do mínimo (7) | senha de 7 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C08 | VL | Senha no mínimo (8) | senha de 8 caracteres | 201 | 201 | Aprovado |
| CT-CP-C09 | VL | Senha no máximo (128) | senha de 128 caracteres | 201 | 201 | Aprovado |
| CT-CP-C10 | VL | Senha acima do máximo (129) | senha de 129 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C11 | PE | Senha comum | senha123 | 422 WEAK_PASSWORD | 422 WEAK_PASSWORD | Aprovado |
| CT-CP-C12 | PE | Senha igual ao e-mail | ana@exemplo.com.br como senha | 422 WEAK_PASSWORD | 422 WEAK_PASSWORD | Aprovado |
| CT-CP-C13 | PE | Senha de um caractere repetido | aaaaaaaa | 422 WEAK_PASSWORD | 422 WEAK_PASSWORD | Aprovado |
| CT-CP-C14 | PE | E-mail já cadastrado (outra caixa) | ANA@EXEMPLO.COM.BR depois de ana@exemplo.com.br | 409 EMAIL_ALREADY_REGISTERED | 409 EMAIL_ALREADY_REGISTERED | Aprovado |
| CT-CP-C15 | PE | Corpo ausente | (sem corpo) | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-C16 | VL | Limite de cadastros por origem (10 por hora): o 10º | 10º cadastro da mesma origem na hora | 201 | 201 | Aprovado |
| CT-CP-C17 | VL | Limite de cadastros por origem: o 11º | 11º cadastro da mesma origem na hora | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |

## Login (RF01)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-L01 | PE | Credenciais corretas | e-mail e senha do cadastro | 200 | 200 | Aprovado |
| CT-CP-L02 | PE | E-mail em outra caixa | ANA@EXEMPLO.COM.BR | 200 | 200 | Aprovado |
| CT-CP-L03 | PE | Senha errada | senha diferente da cadastrada | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | Aprovado |
| CT-CP-L04 | PE | E-mail sem conta (mesma resposta da senha errada) | ninguem@exemplo.com.br | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | Aprovado |
| CT-CP-L05 | PE | Senha vazia | (vazia) | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-L06 | PE | E-mail inválido | sem-arroba | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-L07 | PE | E-mail com espaços nas pontas (o app os remove antes de enviar) | " ana@exemplo.com.br " | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-L08 | VL | Quatro falhas seguidas (abaixo do limite de 5) e depois a senha certa | 4 senhas erradas e 1 correta | 200 | 200 | Aprovado |
| CT-CP-L09 | VL | Cinco falhas seguidas (limite): a 6ª tentativa, mesmo certa, é bloqueada | 5 senhas erradas e 1 correta | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |
| CT-CP-L10 | VL | Fim do bloqueio: 15 minutos menos 1 segundo | tentativa certa 899 s depois do bloqueio | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |
| CT-CP-L11 | VL | Fim do bloqueio: 15 minutos | tentativa certa 900 s depois do bloqueio | 200 | 200 | Aprovado |

## Recuperação de senha (RF01)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-R01 | PE | Pedido com e-mail de conta existente | ana@exemplo.com.br | 202 | 202 | Aprovado |
| CT-CP-R02 | PE | Pedido com e-mail sem conta (mesma resposta) | ninguem@exemplo.com.br | 202 | 202 | Aprovado |
| CT-CP-R03 | PE | Pedido com e-mail inválido | sem-arroba | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-R04 | VL | Terceiro pedido do mesmo e-mail na hora (limite 3) | 3º pedido | 202 | 202 | Aprovado |
| CT-CP-R05 | VL | Quarto pedido do mesmo e-mail na hora | 4º pedido | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |
| CT-CP-R06 | PE | Token válido e senha nova válida | token do e-mail e frase de 23 caracteres | 204 | 204 | Aprovado |
| CT-CP-R07 | VL | Token dentro da validade: 59 min 59 s | uso 3599 s depois do pedido | 204 | 204 | Aprovado |
| CT-CP-R08 | VL | Token no limite da validade: 60 min | uso 3600 s depois do pedido | 400 INVALID_RESET_TOKEN | 400 INVALID_RESET_TOKEN | Aprovado |
| CT-CP-R09 | PE | Token já usado | segundo uso do mesmo token | 400 INVALID_RESET_TOKEN | 400 INVALID_RESET_TOKEN | Aprovado |
| CT-CP-R10 | PE | Token desconhecido com formato válido | token de 43 caracteres inexistente | 400 INVALID_RESET_TOKEN | 400 INVALID_RESET_TOKEN | Aprovado |
| CT-CP-R11 | VL | Token abaixo do tamanho mínimo (19) | token de 19 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-R12 | VL | Token no tamanho mínimo (20), desconhecido | token de 20 caracteres | 400 INVALID_RESET_TOKEN | 400 INVALID_RESET_TOKEN | Aprovado |
| CT-CP-R13 | VL | Token acima do tamanho máximo (201) | token de 201 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-R14 | PE | Senha nova comum | 12345678 | 422 WEAK_PASSWORD | 422 WEAK_PASSWORD | Aprovado |
| CT-CP-R15 | VL | Senha nova abaixo do mínimo (7) | senha de 7 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-R16 | PE | Senha antiga deixa de valer depois da troca | login com a senha antiga após redefinir | 401 INVALID_CREDENTIALS | 401 INVALID_CREDENTIALS | Aprovado |

## Consentimento (RF09)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-K01 | PE | Aceite explícito | acceptedTerms=true, versão 2026-10-06 | 200 | 200 | Aprovado |
| CT-CP-K02 | PE | Aceite negado | acceptedTerms=false | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-K03 | PE | Aceite ausente | sem acceptedTerms | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-K04 | PE | Aceite como texto | acceptedTerms="true" | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-K05 | VL | Versão do termo vazia (abaixo do mínimo de 1) | termVersion="" | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-K06 | VL | Versão do termo com 1 caractere | termVersion de 1 caractere | 200 | 200 | Aprovado |
| CT-CP-K07 | VL | Versão do termo com 20 caracteres (máximo) | termVersion de 20 caracteres | 200 | 200 | Aprovado |
| CT-CP-K08 | VL | Versão do termo com 21 caracteres | termVersion de 21 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-K09 | PE | Declaração de responsável omitida (padrão falso) | sem guardianDeclaration | 200 | 200 | Aprovado |
| CT-CP-K10 | PE | Corpo ausente | (sem corpo) | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |

## Membros da família (RF02)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-M01 | PE | Dados válidos | Maria, 1990-01-10 | 201 | 201 | Aprovado |
| CT-CP-M02 | VL | Nome vazio (abaixo do mínimo de 1) | nome vazio | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M03 | PE | Nome só com espaços | nome "   " | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M04 | VL | Nome com 1 caractere | nome de 1 caractere | 201 | 201 | Aprovado |
| CT-CP-M05 | VL | Nome com 60 caracteres (máximo) | nome de 60 caracteres | 201 | 201 | Aprovado |
| CT-CP-M06 | VL | Nome com 61 caracteres | nome de 61 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M07 | PE | Nome ausente | sem nome | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M08 | PE | Nome com acento e espaços nas pontas | " João Çedilha " | 201 | 201 | Aprovado |
| CT-CP-M09 | VL | Nascimento hoje (limite superior válido) | 2026-10-06 | 201 | 201 | Aprovado |
| CT-CP-M10 | VL | Nascimento amanhã (futuro) | 2026-10-07 | 422 INVALID_BIRTH_DATE | 422 INVALID_BIRTH_DATE | Aprovado |
| CT-CP-M11 | PE | Data em formato brasileiro | 06/10/2026 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M12 | PE | Dia inexistente | 2026-02-30 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M13 | PE | Mês inexistente | 2026-13-01 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M14 | VL | 29 de fevereiro em ano bissexto | 2024-02-29 | 201 | 201 | Aprovado |
| CT-CP-M15 | VL | 29 de fevereiro em ano comum | 2025-02-29 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M16 | PE | Data muito antiga | 1900-01-01 | 201 | 201 | Aprovado |
| CT-CP-M17 | PE | Gestante informada como texto | isPregnant="sim" | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-M18 | PE | Gestante omitida (padrão falso) | sem isPregnant | 201 | 201 | Aprovado |
| CT-CP-M19 | PE | Sem consentimento prévio | cadastro antes do aceite | 403 CONSENT_REQUIRED | 403 CONSENT_REQUIRED | Aprovado |
| CT-CP-M20 | VL | Menor de 18 anos por 1 dia, sem declaração de responsável | nascimento 2008-10-07 (17 anos e 364 dias) | 422 GUARDIAN_DECLARATION_REQUIRED | 422 GUARDIAN_DECLARATION_REQUIRED | Aprovado |
| CT-CP-M21 | VL | Exatamente 18 anos, sem declaração de responsável | nascimento 2008-10-06 | 201 | 201 | Aprovado |
| CT-CP-M22 | PE | Menor com declaração de responsável | criança de 3 anos com declaração | 201 | 201 | Aprovado |
| CT-CP-M23 | VL | 20º membro da conta (limite) | 20º cadastro | 201 | 201 | Aprovado |
| CT-CP-M24 | VL | 21º membro da conta | 21º cadastro | 422 LIMIT_REACHED | 422 LIMIT_REACHED | Aprovado |
| CT-CP-M25 | PE | Membro de outro usuário | dono B consulta o membro do dono A | 404 NOT_FOUND | 404 NOT_FOUND | Aprovado |

## Faixa etária do calendário (RF03)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-F01 | VL | Último dia como criança (10 anos menos 1 dia) | nascimento 2016-10-07 | 201 CHILD | 201 CHILD | Aprovado |
| CT-CP-F02 | VL | Primeiro dia como adolescente (10 anos) | nascimento 2016-10-06 | 201 ADOLESCENT_YOUTH | 201 ADOLESCENT_YOUTH | Aprovado |
| CT-CP-F03 | VL | Último dia como adolescente e jovem (25 anos menos 1 dia) | nascimento 2001-10-07 | 201 ADOLESCENT_YOUTH | 201 ADOLESCENT_YOUTH | Aprovado |
| CT-CP-F04 | VL | Primeiro dia como adulto (25 anos) | nascimento 2001-10-06 | 201 ADULT | 201 ADULT | Aprovado |
| CT-CP-F05 | VL | Último dia como adulto (60 anos menos 1 dia) | nascimento 1966-10-07 | 201 ADULT | 201 ADULT | Aprovado |
| CT-CP-F06 | VL | Primeiro dia como idoso (60 anos) | nascimento 1966-10-06 | 201 ELDERLY | 201 ELDERLY | Aprovado |
| CT-CP-F07 | VL | Recém-nascido (0 dias) | nascimento 2026-10-06 | 201 CHILD | 201 CHILD | Aprovado |

## Doses (RF04)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-D01 | VL | Agendar para ontem (D-1) | SCHEDULE 2026-10-05 | 422 GUARD_VIOLATION | 422 GUARD_VIOLATION | Aprovado |
| CT-CP-D02 | VL | Agendar para hoje (D) | SCHEDULE 2026-10-06 | 200 | 200 | Aprovado |
| CT-CP-D03 | VL | Agendar para amanhã (D+1) | SCHEDULE 2026-10-07 | 200 | 200 | Aprovado |
| CT-CP-D04 | PE | Agendar com data inexistente | SCHEDULE 2026-02-30 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D05 | PE | Agendar com data em formato brasileiro | SCHEDULE 06/10/2026 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D06 | PE | Agendar sem data | SCHEDULE sem date | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D07 | VL | Aplicar amanhã (D+1) | APPLY 2026-10-07 | 422 GUARD_VIOLATION | 422 GUARD_VIOLATION | Aprovado |
| CT-CP-D08 | VL | Aplicar hoje (D) | APPLY 2026-10-06 | 200 | 200 | Aprovado |
| CT-CP-D09 | VL | Aplicar ontem (D-1) | APPLY 2026-10-05 | 200 | 200 | Aprovado |
| CT-CP-D10 | PE | Aplicar com data inválida | APPLY 2026-13-40 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D11 | PE | Cancelar sem confirmar | CANCEL confirmed=false | 422 GUARD_VIOLATION | 422 GUARD_VIOLATION | Aprovado |
| CT-CP-D12 | PE | Cancelar confirmando | CANCEL confirmed=true | 200 | 200 | Aprovado |
| CT-CP-D13 | PE | Cancelar sem o campo de confirmação | CANCEL sem confirmed | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D14 | PE | O cliente tenta marcar atraso (só a rotina de prazo pode) | MARK_OVERDUE enviado pelo cliente | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D15 | PE | Evento desconhecido | type="EXPLODIR" | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D16 | PE | Corpo ausente | (sem corpo) | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-D17 | PE | Aplicar uma dose já aplicada (estado final) | segundo APPLY | 409 INVALID_TRANSITION | 409 INVALID_TRANSITION | Aprovado |
| CT-CP-D18 | PE | Agendar uma dose cancelada (estado final) | SCHEDULE depois de CANCEL | 409 INVALID_TRANSITION | 409 INVALID_TRANSITION | Aprovado |
| CT-CP-D19 | PE | Reagendar uma dose que não está atrasada | RESCHEDULE em dose Pendente | 409 INVALID_TRANSITION | 409 INVALID_TRANSITION | Aprovado |
| CT-CP-D20 | PE | Dose inexistente | id que não existe | 404 NOT_FOUND | 404 NOT_FOUND | Aprovado |
| CT-CP-D21 | PE | Dose de outro usuário | dono B tenta aplicar a dose do dono A | 404 NOT_FOUND | 404 NOT_FOUND | Aprovado |
| CT-CP-D22 | PE | Atraso: dose vencida vira Atrasada na leitura (rotina de prazo) | dose de BCG (ao nascer) lida 1 dia depois | 200 OVERDUE | 200 OVERDUE | Aprovado |

## Assistente (RF06 e RF07)

| ID | Técnica | Classe ou valor | Entrada | Esperado | Obtido | Resultado |
|---|---|---|---|---|---|---|
| CT-CP-A01 | PE | Pergunta válida | Para que serve a BCG? | 200 | 200 | Aprovado |
| CT-CP-A02 | VL | Pergunta vazia (abaixo do mínimo) | texto vazio | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-A03 | PE | Pergunta só com espaços | texto "   " | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-A04 | VL | Pergunta com 1 caractere | texto de 1 caractere | 200 | 200 | Aprovado |
| CT-CP-A05 | VL | Pergunta com 300 caracteres (máximo) | texto de 300 caracteres | 200 | 200 | Aprovado |
| CT-CP-A06 | VL | Pergunta com 301 caracteres | texto de 301 caracteres | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-A07 | PE | Pergunta que não é texto | text=5 | 400 VALIDATION_ERROR | 400 VALIDATION_ERROR | Aprovado |
| CT-CP-A08 | VL | Limite de uso do chat (60 por hora): a 60ª | 60ª pergunta na hora | 200 | 200 | Aprovado |
| CT-CP-A09 | VL | Limite de uso do chat: a 61ª | 61ª pergunta na hora | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |
| CT-CP-A10 | PE | Áudio WAV válido | audio/wav com 44 bytes | 200 | 200 | Aprovado |
| CT-CP-A11 | VL | Áudio no tamanho máximo | 1921024 bytes | 200 | 200 | Aprovado |
| CT-CP-A12 | VL | Áudio 1 byte acima do máximo | 1921025 bytes | 413 AUDIO_TOO_LARGE | 413 AUDIO_TOO_LARGE | Aprovado |
| CT-CP-A13 | VL | Áudio abaixo do cabeçalho mínimo (43 bytes) | 43 bytes | 415 UNSUPPORTED_AUDIO | 415 UNSUPPORTED_AUDIO | Aprovado |
| CT-CP-A14 | PE | Tipo de conteúdo não aceito | audio/webm | 415 UNSUPPORTED_AUDIO | 415 UNSUPPORTED_AUDIO | Aprovado |
| CT-CP-A15 | PE | Tipo de conteúdo ausente | (sem Content-Type) | 415 UNSUPPORTED_AUDIO | 415 UNSUPPORTED_AUDIO | Aprovado |
| CT-CP-A16 | PE | Arquivo sem o cabeçalho RIFF/WAVE | 100 bytes zerados | 415 UNSUPPORTED_AUDIO | 415 UNSUPPORTED_AUDIO | Aprovado |
| CT-CP-A17 | PE | Fala não entendida | áudio sem fala reconhecível | 422 SPEECH_NOT_RECOGNIZED | 422 SPEECH_NOT_RECOGNIZED | Aprovado |
| CT-CP-A18 | VL | Limite de uso da voz (20 por hora): a 20ª | 20ª pergunta por voz na hora | 200 | 200 | Aprovado |
| CT-CP-A19 | VL | Limite de uso da voz: a 21ª | 21ª pergunta por voz na hora | 429 RATE_LIMITED | 429 RATE_LIMITED | Aprovado |
