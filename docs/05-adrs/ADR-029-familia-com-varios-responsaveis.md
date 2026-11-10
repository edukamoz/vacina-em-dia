# ADR-029: Família com vários responsáveis

- **Status:** aceito em 10/11/2026 (decisões do autor: uma família por conta, papéis dono e responsável, convite por código, e quem já tem pessoas cadastradas as leva para a família com confirmação)
- **Item do backlog:** B15 (RF12, compartilhar com cuidador)
- **Relacionados:** ADR-014 (login próprio), ADR-010 (limitação de taxa), ADR-017 (lembretes), ADR-027 e ADR-028 (aviso e repetição), `docs/06-seguranca-e-lgpd.md`, `docs/21-seguranca-owasp-e-carga.md` (A01).

## Contexto

Hoje cada pessoa cadastrada (`member`) pertence a **uma conta** (`member.account_id`) e toda consulta filtra por esse dono. O autor pediu que uma família possa ter **mais de um responsável**, que alguém possa **entrar numa família** e que várias contas se conectem. Dados de vacinação são dados pessoais de saúde (LGPD): compartilhá-los com outra conta precisa de autorização explícita, ser revogável e não abrir brecha de acesso (OWASP A01).

## Decisão

1. **Uma família por conta.** Toda conta pertence a exatamente uma família. A conta nova ganha uma família própria e é a **dona** dela. A tela Família continua sendo uma lista única.
2. **Dois papéis.** **Dono**: convida, remove responsáveis, passa a propriedade e pode excluir a família. **Responsável**: vê e edita tudo (pessoas e doses), mas não gerencia os acessos. Não há papel só de leitura nesta etapa.
3. **Os dados passam a pertencer à família**, não à conta: `member.family_id`. O serviço descobre a família da conta uma vez por requisição e todas as consultas filtram por ela; a API continua sem aceitar identificador de família vindo do cliente. A coluna `member.account_id` é mantida como "criada por" (histórico).
4. **Convite por código.** O dono gera um código de uso único, de 10 caracteres de um alfabeto sem ambiguidade, válido por **7 dias**, guardado **só como hash** (como o token de redefinição de senha). No máximo 5 convites ativos por família. Quem tem conta digita o código. Código inválido, vencido ou usado dá a **mesma resposta**, e a tentativa tem limite de taxa por conta (ADR-010).
5. **Quem entra e já tem pessoas.** Só entra quem é a **única conta** da própria família. Se tiver pessoas cadastradas, o app mostra a lista e pergunta; confirmada, as pessoas **passam para a família de destino** e a família vazia de origem é apagada. Sem a confirmação (`moveMembers`), a API responde 409 com a quantidade e nada muda.
6. **Sair e remover.** O responsável pode **sair** e o dono pode **remover** um responsável: a conta que sai ganha uma família nova e vazia (a regra "toda conta tem uma família" se mantém) e **perde o acesso na hora**; as pessoas ficam com a família. O dono não pode sair sem antes **passar a propriedade**.
7. **Excluir a conta.** Se a conta é a **única** da família, tudo é apagado como hoje (RF09). Se é **responsável**, só a conta sai; as pessoas ficam com a família. Se é **dono** e há outros responsáveis, a propriedade passa ao responsável mais antigo e as pessoas ficam; o app **avisa isto antes** de confirmar a exclusão.
8. **Privacidade e consentimento.** Cada conta tem o próprio consentimento (RF09) e precisa dele para ver ou editar pessoas. Ao gerar o convite, o app avisa em linguagem simples que **quem entrar verá os dados de saúde de todas as pessoas da família**. Todos os responsáveis veem todas as pessoas (sem visibilidade por pessoa nesta etapa). Os responsáveis aparecem com o e-mail **parcialmente oculto** (por exemplo, `m***@g***.com`); o identificador mostrado é o do vínculo, nunca o da conta.
9. **Lembretes.** Cada responsável recebe o **próprio** e-mail e os próprios avisos no aparelho, sobre as pessoas da família, conforme as próprias preferências.
10. **Registro de quem aplicou** cada dose: fica para uma segunda etapa (não bloqueia o acesso compartilhado).

### Modelo de dados (migração `007`)

- `family (id, created_at)`.
- `family_membership (id, family_id, account_id UNIQUE, role, joined_at)`: a unicidade de `account_id` garante uma família por conta. Exclusão em cascata com a conta e com a família.
- `family_invite (token_hash PK, family_id, created_by_account_id, expires_at, used_at, used_by_account_id)`.
- `member.family_id`: preenchido na migração com uma família por conta existente (a conta vira dona); depois `NOT NULL` com chave estrangeira. Nenhuma pessoa nem dose muda de dono visível.

### API (todas exigem sessão e consentimento; registradas no OpenAPI)

| Rota | O que faz | Quem |
|---|---|---|
| `GET /api/family` | Família, papel de quem pergunta, responsáveis (e-mail oculto) e convites ativos | qualquer responsável |
| `POST /api/family/invites` | Gera o código (devolvido **uma vez**) e a validade | dono |
| `DELETE /api/family/invites` | Revoga os convites ativos | dono |
| `POST /api/family/join` | Entra com o código; `moveMembers` confirma levar as próprias pessoas | quem não é dono de família com mais gente |
| `POST /api/family/leave` | Sai da família | responsável |
| `DELETE /api/family/guardians/{id}` | Remove um responsável | dono |
| `POST /api/family/transfer` | Passa a propriedade a um responsável | dono |

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Várias famílias por conta | Exige seletor de família em toda tela e multiplica o risco de erro de permissão; fica para depois se houver pedido |
| Papel só de leitura | Mais uma regra em toda escrita da API; o pedido é de responsáveis que dividem o cuidado |
| Convite por e-mail | Gasta a cota gratuita do Brevo (300 por dia) e exige tratar quem ainda não tem conta; pode vir depois |
| Só entra quem não tem pessoas | Mais conservador, mas obriga a apagar dados; a confirmação explícita resolve o risco de privacidade |
| Compartilhar pessoa a pessoa | Modelo mais flexível, bem mais complexo de testar e de explicar a quem usa |

## Consequências

- **Risco principal:** a regra de acesso muda de "a conta é dona" para "a conta é da família" em todo repositório (OWASP A01). Mitigação: a mudança fica concentrada nos repositórios SQL e em memória; testes de **isolamento entre famílias** em todas as operações e o teste de contrato nas duas implementações (inclusive no Azure SQL real).
- **Migração obrigatória antes do deploy** (o deploy não aplica migrações); só acrescenta tabelas e coluna e preenche dados, sem apagar nada. Aplicar com autorização do autor.
- O aviso no aparelho (ADR-028) não sabe de mudança feita por outro responsável até o aplicativo abrir; o push do servidor (B71) fecha essa lacuna.
- O e-mail oculto deixa os responsáveis identificáveis só para quem já os conhece.
- A Política de Privacidade e o Termo de Uso precisam citar o compartilhamento com outros responsáveis (decisão do texto legal é do autor).

## Fatias de entrega

1. **API e banco:** migração 007, repositórios por família, serviço, rotas, OpenAPI e testes de isolamento. Verificado no Azure SQL real.
2. **App:** seção "Responsáveis da família" na aba Conta (lista, convidar, remover, sair, passar a propriedade) e a tela para entrar com um código, com a confirmação de levar as pessoas.
3. **Depois:** registro de quem aplicou cada dose, convite por e-mail e push do servidor.

## Verificações e fontes

- O mapa de onde a regra de dono é usada foi feito no código em 10/11/2026: `ownerId` em ~35 arquivos da API, com a consulta concentrada em `repositories/sql/sql-repositories.ts` e `repositories/in-memory-store.ts`.
- Casos de teste previstos: `CT-FAMR-*` (a numerar na implementação).
