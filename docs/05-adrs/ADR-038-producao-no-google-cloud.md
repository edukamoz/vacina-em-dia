# ADR-038: Produção no Google Cloud (saída da Azure)

- **Status:** aceito em 17/11/2026 (decisão do autor: os créditos de estudante da Azure acabaram e a produção passa a rodar só no Google Cloud)
- **Substitui em parte:** ADR-001 (arquitetura na Azure), ADR-004 (Azure SQL) e ADR-010 (contador no Table Storage)
- **Amplia:** ADR-035 (que tratava o Google Cloud como reserva)
- **Relacionados:** ADR-014 (login próprio), `docs/16-custos-azure.md`, `docs/26-contingencia-google-cloud.md`; itens B79 (migração) e B80 (voz)

## Contexto

A Azure for Students esgotou os créditos em 17/11/2026: o app web responde 404 e as Function Apps respondem 403. A reserva da ADR-035 já estava implantada no Google Cloud (Cloud Run, Firestore, Secret Manager e Cloud Scheduler), com os três serviços respondendo, e o teste gratuito de US$ 300 estava ativo desde 16/11/2026. A apresentação foi remarcada para 01/12/2026 às 19:00.

## Decisão

1. **O Google Cloud passa a ser a produção.** O que era "reserva" (ADR-035) é o ambiente principal. A Azure sai do plano.
2. **Mesmas imagens, mesma arquitetura da ADR-035:** app web (nginx), API e PLN no Cloud Run; dados no Firestore; rotinas no Cloud Scheduler; segredos no Secret Manager.
3. **Deploy automático** pelo GitHub Actions (`deploy.yml`): o Cloud Build constrói as três imagens e o `gcloud run services update` troca a imagem de cada serviço. O GitHub entra por **Workload Identity Federation**, sem chave guardada; a identidade é criada por `scripts/gcp/ci-identidade.sh` e fica restrita a este repositório e à branch `main`.
4. **Voz:** passa para o Google Cloud Speech-to-Text (item B80, PR próprio), com limite de uso para não gerar custo. Até lá, a voz responde "indisponível" e a digitação funciona.
5. **Custos controlados:** máximo de 2 instâncias por serviço, 0 parado; dois orçamentos com alerta (R$ 5 líquido de créditos e R$ 50 de uso bruto, só avisam); política de limpeza que mantém a `latest` e as 3 imagens mais recentes de cada serviço no Artifact Registry.
6. **O código da Azure fica no repositório como histórico** (`infra/`, cliente do Azure SQL e do Blob), sem uso em produção. O Firestore é mantido nos testes de contrato.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Pagar a Azure | Fora do orçamento do projeto |
| Outro fornecedor (AWS, Render, Fly.io) | A reserva no Google Cloud já estava pronta e testada; trocar de novo custaria tempo que não há antes de 01/12 |
| Cloud SQL (relacional) | Não tem camada gratuita |

## Consequências

- **Dados da Azure não vêm junto:** o Firestore começa vazio (ADR-035). Para a apresentação, cria-se uma conta de demonstração com `scripts/gcp/semear.sh`.
- **Teste gratuito acaba por volta de 14/02/2027** (90 dias a partir de 16/11/2026). Depois disso os serviços só cabem nas cotas gratuitas permanentes se o uso seguir baixo; reavaliar antes dessa data.
- **Documentação:** Técnica, do Usuário, panfleto, custos e diagramas de implantação passam a descrever o Google Cloud, mantendo o histórico AWS → Azure → Google Cloud e o motivo da saída.
- **Endereço público** do app: `https://vacina-web-mdqonfxhra-uc.a.run.app` (domínio próprio segue em aberto, B62).
