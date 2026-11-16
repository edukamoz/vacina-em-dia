# ADR-035: Plano de contingência no Google Cloud, com custo zero

- **Status:** aceito em 16/11/2026 (decisão do autor: Firestore para os dados e teste gratuito de US$ 300 para a conta)
- **Relacionados:** ADR-001 (arquitetura), ADR-014 (login próprio), ADR-029 (família), `docs/16-custos-azure.md`, `docs/26-contingencia-google-cloud.md`

## Contexto

O app roda na Azure (créditos do Azure for Students). O banco gratuito já esgotou a franquia uma vez (ver `docs/16`) e o orçamento é apertado. Se a Azure não puder rodar no dia da apresentação (crédito acabado, conta bloqueada, serviço fora), o projeto precisa de um **segundo ambiente pronto**, em outro fornecedor, sem custo.

## Decisão

1. **Google Cloud como reserva, não como substituto.** O ambiente da Azure continua sendo o principal. O do Google fica implantado e dormindo (0 instâncias), e liga-se para a apresentação.
2. **Mesmo código, outra infraestrutura.** A API e o PLN rodam nas **mesmas imagens Docker** (host das Azure Functions) no **Cloud Run**; o app web roda em um `nginx` no Cloud Run que repassa `/api` para a API (mesma origem, sem CORS). A API escolhe o banco por variável de ambiente: `SQL_SERVER` usa o Azure SQL; `FIRESTORE_PROJECT` usa o Firestore; sem nenhuma, memória.
3. **Dados no Firestore** (modo nativo, gratuito até 1 GiB, 50 mil leituras e 20 mil escritas por dia). O Google não tem banco relacional gratuito (Cloud SQL é pago), e portar o T-SQL para Postgres traria outro fornecedor. A camada de repositórios já era uma porta; o Firestore é a **quarta implementação** dela (`apps/api/src/repositories/firestore/`) e passa nos **mesmos 31 testes de contrato** dos outros (com o emulador local, sem conta nem custo).
4. **Fotos de perfil e estado do vigia no próprio Firestore** (`createFirestoreFileStorage`): a foto tem no máximo 256 KB e o documento aceita 1 MiB, então não há outro produto para pagar nem configurar.
5. **Rotinas agendadas pelo Cloud Scheduler** (3 tarefas gratuitas): o contêiner dorme e não tem relógio. Os gatilhos de relógio das Functions ficam desligados lá (`AzureWebJobs.<nome>.Disabled`) e o Scheduler chama `POST /api/jobs/daily-reminders` (nova) e `POST /api/calendar/watch/check`, com a chave da função.
6. **Segredos no Secret Manager**, gerados no próprio ambiente (a chave do login, o arquivo de chaves do host das Functions e, se houver, a chave do Brevo). Nada vai para o Git. A API alcança o Firestore pela **conta de serviço** do Cloud Run, sem chave.
7. **Voz:** o Azure AI Speech não é replicado. Sem `SPEECH_ENDPOINT` e `SPEECH_KEY`, a API responde "indisponível" só na voz; texto, calendário e doses funcionam por inteiro.
8. **Conta e custo:** teste gratuito de US$ 300 (90 dias). O Google pede cartão só para verificar a identidade e **não cobra sozinho**: ao fim do teste os recursos param, a menos que se faça upgrade. Os serviços usados cabem nas cotas gratuitas permanentes mesmo assim (Cloud Run, Firestore, Secret Manager, Cloud Scheduler, Cloud Build). Limites: no máximo 2 instâncias por serviço e 0 instâncias paradas.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Só memória, com dados de demonstração | Tudo some quando a instância reinicia, o que pode ocorrer no meio da apresentação |
| Postgres gratuito de terceiros (Neon, Supabase) | Outro fornecedor no plano e portar o SQL (hoje T-SQL) |
| Cloud SQL | Não tem camada gratuita |
| Reescrever a API em Express para o Cloud Run | Muito código novo; reusar as imagens existentes foi bem mais barato |
| Firebase Hosting para o web | Mais uma ferramenta (CLI) e regiões limitadas; o `nginx` no Cloud Run já existia como imagem |

## Consequências

- **Dados separados:** o Firestore começa **vazio**. Não há cópia automática do Azure SQL; para a apresentação cria-se uma conta de demonstração (`scripts/gcp/semear.sh`). Sincronizar os dois ambientes ficou fora do escopo.
- **Partida a frio:** com 0 instâncias parado, a primeira chamada leva alguns segundos (API) e cerca de um minuto (PLN). Para a apresentação, `scripts/gcp/apresentacao.sh ligar` mantém 1 instância de cada, e `desligar` volta a 0.
- **Manutenção:** o Firestore tem de continuar passando nos testes de contrato quando a interface dos repositórios mudar (o CI roda o emulador).
- **Segurança:** o acesso ao Firestore é só pela API (conta de serviço); nenhuma regra de cliente é aberta. O isolamento entre famílias é o mesmo (todo acesso passa pelo vínculo da conta com a família).
- **Limite conhecido:** as rotas protegidas por chave de função só são cobradas no contêiner (modo de produção do host); no `func start` local qualquer um as chama.
