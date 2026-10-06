# ADR-001: API em Azure Functions (Node.js e TypeScript), sem Express

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF01 a RF09, RNF01, RNF05, RNF06, RNF08

## Contexto

O projeto roda inteiramente na Azure e precisa de uma API HTTP para o app, de uma rotina por tempo (gatilho de atraso das doses, T4 e T7, e lembretes) e de baixo custo. O tráfego esperado é pequeno e irregular. O PI-VI exige uso dos serviços da nuvem.

## Decisão

- A API é um **aplicativo Azure Functions em Node.js com TypeScript**, usando os gatilhos HTTP e de tempo (timer) nativos.
- **Não usar Express** (nem outro servidor HTTP). O roteamento é o das próprias Functions. Esta é a decisão sobre o Express pedida no SCRUM-33: **não usar**.
- Camadas, conforme o `CLAUDE.md` §7: `handlers` (finos) → `services` → `domain` → `repositories`.
- O plano de hospedagem (candidatos: Flex Consumption ou Consumption) será definido no SCRUM-22. Verificado em 06/10/2026: a Flex Consumption está disponível na região Brazil South, permitida pela política da assinatura.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Express em Azure App Service | Serviço sempre ligado, custo fixo e sem gatilho por tempo nativo; duplica o que as Functions já oferecem. |
| Express dentro de uma Function | Camada extra sem ganho; vai contra o modelo serverless e aumenta o tempo de partida a frio. |
| Azure Container Apps | Mais flexível, mas mais complexo e fora do que o projeto precisa. |

## Consequências

- Custo próximo de zero em baixo uso (há concessão gratuita mensal; confirmar valores na calculadora, SCRUM-26).
- Gatilho por tempo nativo atende o atraso de doses (T4 e T7) e os lembretes.
- Partida a frio pode afetar o RNF01 (90% das requisições em menos de 3 s); medir e mitigar no SCRUM-22 e no Application Insights.
- Middleware (CORS, cabeçalhos de segurança, validação, mapeamento de erros e limitação de taxa) precisa ser feito à mão, em funções reutilizáveis, e não vem pronto como no Express.
- Execução local com Functions Core Tools e Azurite, também em Docker (RNF08).

## Verificações e fontes

- Região e plano: consulta `az functionapp list-flexconsumption-locations` em 06/10/2026 (inclui `brazilsouth`).
- Concessão gratuita e preços: [Azure Functions: preços](https://azure.microsoft.com/pricing/details/functions/), consultado em 06/10/2026; valores finais a confirmar no SCRUM-26.
