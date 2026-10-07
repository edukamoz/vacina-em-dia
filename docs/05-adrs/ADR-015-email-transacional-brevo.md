# ADR-015: E-mail transacional com o Brevo (recuperação de senha)

- **Status:** Aceita
- **Data:** 2026-10-07
- **Decisor:** autor
- **Requisitos relacionados:** RF01, RNF02, RNF03, RF09

## Contexto

O login próprio (ADR-014) precisa de recuperação de senha, que exige enviar e-mail. O `CLAUDE.md` §3 pede aprovação antes de adotar serviço novo. O autor aprovou o Brevo em 07/10/2026. A alternativa dentro da Azure (Azure Communication Services Email) não teve preço confirmado na consulta de 07/10/2026 e exige configurar domínio de envio.

## Decisão

- Usar a **API de e-mail transacional do Brevo** (`POST https://api.brevo.com/v3/smtp/email`, cabeçalho `api-key`), sem biblioteca nova: chamada com `fetch`, validada e com tempo limite de 10 s.
- **Só dois e-mails existem:** o de recuperação de senha agora. Confirmação de e-mail do cadastro **não** foi implementada (a conta funciona sem confirmar; é um risco aceito para a demonstração).
- **Fluxo (OWASP Forgot Password):** `POST /auth/forgot-password` responde sempre 202, exista a conta ou não; se existir, grava um token aleatório de 256 bits (só o hash SHA-256 no banco, validade de 1 hora, uso único) e envia o link. `POST /auth/reset-password` troca a senha, usa o token **uma única vez** (atômico) e **encerra todas as sessões** da conta.
- O token vai no **fragmento** do endereço (`/redefinir-senha#token=...`), que o navegador não envia ao servidor nem no `Referer`; o app o lê e o apaga da barra de endereço.
- **Limites:** 3 pedidos por hora por e-mail e 10 por hora por origem (429 com `Retry-After`).
- **Privacidade (LGPD):** o e-mail enviado não traz nome nem outro dado, só o link. O endereço do usuário passa a ser tratado também pelo Brevo (operador); isso entra na política de privacidade. Nada além do endereço e do link é enviado.
- **Segredos:** a chave do Brevo fica em configuração da aplicação (Key Vault quando houver acesso de escrita), nunca no repositório. O remetente (`EMAIL_SENDER_ADDRESS`) e o endereço do app (`WEB_BASE_URL`) vêm do ambiente. Sem `BREVO_API_KEY`, nenhum e-mail sai e a resposta continua sendo 202.
- **Falha do provedor:** registrada só pelo tipo (`PASSWORD_RESET_EMAIL_FAILED`), sem endereço; a resposta ao cliente não muda.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Azure Communication Services Email | Preço não confirmado; exige domínio próprio de envio. Pode substituir o Brevo depois, pois o envio está atrás da interface `EmailClient`. |
| Sem recuperação de senha | Quem esquece a senha perde a conta e os dados; ruim para o público idoso. |
| Responder "conta não encontrada" no pedido | Revela quais e-mails têm conta (enumeração). |

## Consequências

- **Custo:** plano gratuito do Brevo, com 300 e-mails por dia segundo a página de produto do Brevo (conferida em 07/10/2026). Sem custo na Azure.
- **Entrega:** o remetente precisa ser verificado no Brevo. Remetentes de provedores gratuitos (como Gmail) podem cair em spam por causa da política DMARC do provedor; um domínio próprio entrega melhor. Verificar na prática antes da apresentação.
- **Enumeração por tempo de resposta:** o pedido de conta existente é um pouco mais lento (chama o Brevo) do que o de conta inexistente. O limite de 3 e 10 pedidos por hora torna o ataque caro; fica registrado como risco residual.
- **Teste:** os testes usam um cliente falso; o envio real só pode ser verificado com a chave do Brevo no ambiente.
- A migração `002-redefinicao-de-senha.sql` precisa ser aplicada no banco antes de usar a rota (`scripts/db-migrate.mjs`); o deploy não aplica migrações.

## Verificações e fontes

- [Brevo, API de e-mail (300 e-mails por dia no plano gratuito)](https://www.brevo.com/features/email-api/), consultada em 07/10/2026.
- [Brevo, referência de envio de e-mail transacional](https://developers.brevo.com/reference/sendtransacemail), consultada em 07/10/2026 (endpoint, cabeçalho `api-key`, campos `sender`, `to`, `subject`, `htmlContent`/`textContent`, resposta 201).
- OWASP Forgot Password Cheat Sheet (princípios: resposta uniforme, token aleatório de uso único e com validade, limite de tentativas).
