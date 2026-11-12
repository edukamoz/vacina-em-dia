# Termos de uso e Política de privacidade

Rascunho em linguagem simples, de **07/10/2026**, para validação do autor antes da apresentação. **Não é parecer jurídico**; vale uma leitura por quem entenda de LGPD (por exemplo, o professor).

## Onde está

| O quê | Onde |
|---|---|
| Texto (fonte única) | `apps/mobile/src/features/legal/legal-content.ts` (`TERMOS_DE_USO`, `POLITICA_DE_PRIVACIDADE`, `LEGAL_VERSION`) |
| Telas | rotas públicas `/termos` e `/privacidade` (abrem com ou sem login) |
| Aceite | **Criar conta** exige marcar "Li e aceito os termos de uso e a política de privacidade", com links para os dois textos |
| Consulta depois | aba **Conta**, cartão Privacidade |
| Consentimento de dados de saúde | continua na tela seguinte (`TERMS_VERSION`, RF09), registrado na API com data e versão |

Ao mudar um texto, mude `LEGAL_VERSION`.

## Cada afirmação do texto tem origem no projeto

| Afirmação | Fonte |
|---|---|
| Não coleta CPF nem Cartão Nacional de Saúde | `CLAUDE.md` §10 |
| Dados guardados (e-mail, hash da senha, consentimento; nome ou apelido, nascimento, gestante, parentesco; doses, inclusive avulsas; foto de perfil opcional, no Blob Storage) | ADR-014, ADR-016, ADR-020, migrações 003 e 004 |
| A foto de caderneta ou comprovante é lida no aparelho e não é enviada nem guardada; só as doses confirmadas são salvas | ADR-022 |
| Texto das perguntas ao assistente não é gravado | `docs/11-assistente-pln.md` |
| Áudio só em memória, enviado ao Azure AI Speech | `docs/11-assistente-pln.md` |
| Brevo recebe só e-mail e link | ADR-015 |
| Azure, região Brazil South | `docs/08-infraestrutura-azure.md` |
| Logs sem dados pessoais | `CLAUDE.md` §10 |
| Exclusão apaga conta, pessoas e doses | RF09 |

## Decisões e pontos a conferir

- **Campo Nome na criação de conta (design):** não implementado, por decisão do autor em 07/10/2026. Mantém só e-mail e senha, o mínimo de dados.
- **Contato para pedidos do titular:** e-mail do autor (constante `PRIVACY_CONTACT`). Trocar se o professor indicar outro canal.
- **A confirmar pelo autor:** prazo de cópias de segurança do banco (o texto não promete prazo), quem é o controlador formalmente (aqui: o aluno, no contexto acadêmico) e se a faculdade exige texto próprio.
- **Static Web Apps fica em Central US** (só serve o site, sem dados pessoais); não consta no texto.

## Atualização de 08/10/2026: localização (mapa de postos)

A Política de privacidade (versão `2026-10-08`) ganhou a seção "Postos de saúde e localização": a posição só é pedida ao tocar em "Usar minha localização"; vai arredondada (cerca de 110 m) para a API, que **não a guarda nem a registra em log**; a lista de postos fica no aparelho (sem a posição) e é apagada ao sair da conta; só o código do município vai à base oficial do Ministério da Saúde; as imagens do mapa vêm do OpenStreetMap. Ver `docs/05-adrs/ADR-018-mapa-de-postos.md`.

## Atualização de 12/11/2026: animais e vários responsáveis (rascunho a validar, B39)

`LEGAL_VERSION` passou a `2026-11-12`. Mudanças, cada uma com a fonte no projeto:

| Mudança no texto | Fonte |
|---|---|
| Animais de estimação: nome, espécie e as vacinas digitadas; sem calendário oficial; mesmas regras de segurança e exclusão (Termos e Política) | ADR-031, migração 008 |
| Nova seção "Família com vários responsáveis": convite por código de uso único (7 dias, guardado só como hash); quem entra vê e edita todos os dados; cada responsável com o próprio login, consentimento e lembretes; e-mail parcialmente oculto; remover e sair terminam o acesso na hora | ADR-029 (itens 2, 4, 6, 8 e 9) |
| Exclusão da conta: só quem é a única responsável apaga tudo; responsável só sai; dono passa a propriedade ao responsável mais antigo, com aviso | ADR-029 (item 7), `CT-FAMR-53` a `55` |
| Lembretes: o e-mail vale para a antecedência escolhida (7 dias por padrão) e a pessoa pode marcar vários avisos | ADR-027, atualização de 12/11/2026 |

**A validar pelo autor ou por quem entende de LGPD (B39):**
- O texto é redação minha a partir dos ADRs; não foi revisado por ninguém.
- **`TERMS_VERSION` não mudou** (`2026-10-06`), para não pedir novo consentimento a todas as contas. O termo de consentimento ainda não cita o compartilhamento com outros responsáveis; hoje o aviso aparece ao gerar o convite e ao entrar na família. Decidir se vale uma frase nova no termo (isso exige novo aceite de todos).
- Dados de animais, em si, não são dados pessoais; o nome do animal pode, porém, identificar o dono. O texto os trata com o mesmo cuidado, por simplicidade.
