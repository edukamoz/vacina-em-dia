# Estimativa de custos na Azure (SCRUM-26)

Critério da banca de CN2 ("Apresentação dos custos de serviços no Azure") e seção de custos da Documentação Técnica. Valores em **dólar americano (USD)**, região **Brazil South** (Static Web Apps em Central US), lidos da **API pública de preços de varejo da Azure** (`prices.azure.com/api/retail/prices`) em **07/10/2026**. A **calculadora oficial** (azure.microsoft.com/pricing/calculator) deve ser reaberta antes da entrega para gerar o PDF/print que a documentação pede; este arquivo registra a conta e as premissas.

> **Regra do projeto:** só entra aqui valor conferido. O que não foi possível confirmar está marcado como **a confirmar**.

## Resumo

| Cenário | Custo mensal estimado |
|---|---|
| **Hoje** (demonstração, tráfego baixo, créditos do Azure for Students) | **cerca de US$ 13** desde 07/10/2026: uma instância sempre pronta para o PLN e outra para a API (a da API elimina os 503 intermitentes; ver `docs/21`). Antes disso eram cerca de US$ 6,50 |
| Mesmo cenário **sem** a instância sempre pronta | **cerca de US$ 0**, mas a primeira pergunta ao assistente depois de ociosidade leva ~50 s (partida a frio) |
| Primeiro login depois de ociosidade | O banco gratuito **pausa após 60 min parado** e a primeira consulta leva até ~1 min. O app chama `GET /api/warmup` ao abrir (uma vez por abertura), o que acorda o banco enquanto a pessoa digita; a API consulta o banco no máximo 1 vez por minuto por instância. **Não** se mantém o banco acordado o tempo todo: a franquia gratuita (100 mil vCore-segundos por mês) acabaria em poucas semanas e o banco pausaria até o mês virar |
| Se o banco gratuito esgotar a franquia | O banco **pausa** (configurado como `AutoPause`): não gera cobrança, mas fica indisponível até o mês virar |

## Por serviço

| Serviço | Camada usada | Preço conferido (07/10/2026) | Estimativa mensal |
|---|---|---|---|
| **Azure Functions, API** (Flex Consumption, sob demanda, 512 MB, no máximo 1 instância) | Pagamento por uso | Execução: US$ 0,000037 por GB-s; chamadas: US$ 0,000004 por 10 (US$ 0,40 por milhão) | ~US$ 0 no volume da demonstração; os preços de franquia mensal gratuita aparecem com valor 0 na tabela de preços (valores exatos da franquia: **a confirmar** na documentação) |
| **Azure Functions, PLN** (Flex Consumption, **1 instância sempre pronta**, 512 MB) | Sempre pronta | Base: US$ 0,000005 por GB-s; execução: US$ 0,000019 por GB-s; chamadas: US$ 0,000004 por 10 | **Base:** 0,5 GB × 2.592.000 s (30 dias) = 1.296.000 GB-s × 0,000005 = **US$ 6,48**. Execução: 3.000 perguntas × 0,3 s × 0,5 GB = 450 GB-s × 0,000019 = US$ 0,01. Total ≈ **US$ 6,50** |
| **Azure SQL Database** | Uso Geral serverless, **oferta gratuita** (`AutoPause` ao esgotar) | Fora da oferta: US$ 0,99134 por vCore-hora (mínimo 0,5 vCore) | **US$ 0** dentro da franquia (limites da oferta gratuita: **a confirmar** na página oficial) |
| **Static Web Apps** | Free | Plano Free sem cobrança (a consulta de preços não devolveu linha para o plano Free; confirmar na calculadora) | US$ 0 |
| **Azure AI Speech** | F0 (gratuita) | Camada gratuita com franquia mensal de áudio (**a confirmar**: horas por mês). Preço do plano pago real-time padrão **a confirmar**; os planos em lote custam US$ 0,18 por hora e o recurso "enhanced" US$ 0,30 por hora, que **não** usamos | US$ 0 dentro da franquia |
| **Key Vault** | Standard | US$ 0,03 por 10 mil operações | ~US$ 0 (poucas leituras de segredo) |
| **Application Insights + Log Analytics** | Por uso, retenção de 30 dias, **teto diário de 0,1 GB** | Ingestão: os primeiros 5 GB por mês são gratuitos; depois US$ 4,60 por GB | US$ 0 (0,1 GB por dia dá no máximo ~3 GB por mês) |
| **Armazenamento (Storage, LRS)** | Standard, para o pacote das Functions | US$ 0,0326 por GB por mês (blob quente) | < US$ 0,01 |
| **E-mail transacional** (recuperação de senha, ADR-015) | Brevo, plano gratuito (serviço externo, fora da Azure) | 300 e-mails por dia no plano gratuito, segundo a página de produto do Brevo (07/10/2026); limites e regras de remetente: **a confirmar** na conta | US$ 0 |
| **Tráfego de saída (internet)** | n/a | **A confirmar** (a Azure tem franquia mensal de saída) | ~US$ 0 |

## O que mais pesa e por quê

A única parcela relevante é a **instância sempre pronta do PLN** (US$ 6,50 por mês). Ela existe porque o serviço Python carrega bibliotecas de ML na partida (~50 s) e a API espera no máximo 15 s pela resposta (RNF01 pede voz em até 3 s). Alternativas:

1. **Manter** (recomendado até 19/11): resposta em 0,05 a 0,16 s, custo fixo baixo.
2. **Escalar a zero** (US$ 0): aceitável fora de demonstração, mas a primeira pergunta falha por tempo de espera.
3. **Tornar a partida mais leve** (por exemplo, carregar o modelo pré-treinado em vez de treinar na partida): reduziria a partida, mas hoje o projeto não usa arquivo binário de modelo por decisão de segurança (sem `pickle`).

## Premissas do cenário

- Demonstração e avaliação: até alguns milhares de chamadas por mês e poucos usuários simultâneos.
- 30 dias por mês (2.592.000 s). Em meses de 31 dias a base do PLN sobe para US$ 6,70.
- Sem conversão para real: usar a cotação do dia da entrega, se a documentação exigir.
- A assinatura Azure for Students tem crédito inicial; o custo estimado cabe nele (valor do crédito: **a confirmar** no portal).

## Como reproduzir

Consulta usada (exemplo para o Flex Consumption), sem autenticação:

```
https://prices.azure.com/api/retail/prices?currencyCode=USD&$filter=armRegionName eq 'brazilsouth' and serviceName eq 'Functions' and contains(productName,'Flex')
```

A API limita a taxa de requisições (resposta 429): espaçar as consultas.

## Pendências para fechar o critério

- Abrir a calculadora oficial, montar a estimativa com estes serviços e salvar o resultado (PDF ou link) na Documentação Técnica.
- Confirmar as franquias gratuitas (Functions, Azure SQL, Speech) e o preço do e-mail.
- Atualizar este arquivo se o serviço de e-mail ou outro recurso for adotado.
