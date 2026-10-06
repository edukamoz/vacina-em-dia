# ADR-003: Reconhecimento de voz com Azure AI Speech

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF06, RNF01, RNF03, RNF09

## Contexto

A busca por voz atende, em especial, o Sr. José (idoso). O reconhecimento de fala é feito por serviço gerenciado, sem treinar modelo próprio. A meta é resposta em até 3 s para 90% das requisições (RNF01), e falha de reconhecimento deve mostrar mensagem clara e permitir digitar.

## Decisão

- Usar o **Azure AI Speech** (fala para texto) em português do Brasil, na camada gratuita **F0** enquanto atender.
- O app envia o áudio curto à API; a API chama o Speech e entrega a transcrição à busca semântica. A **chave do serviço fica no Key Vault** (ADR-008), nunca no app.
- O **áudio não é armazenado**: é transcrito e descartado. Logs não contêm áudio nem transcrição (LGPD).
- O consumo é protegido pela limitação de taxa e por um teto mensal global (ADR-010).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Reconhecimento no dispositivo (APIs nativas) | Resultado diferente entre Android, iOS e web; sem controle nem métrica centralizada. |
| Web Speech API do navegador | Só web e dependente do navegador; não cobre o app. |
| Modelo próprio (Whisper etc.) | Hospedagem e custo maiores, sem ganho para o escopo. |

## Consequências

- Sem treinar modelo; serviço na mesma nuvem.
- A F0 tem franquia limitada (consulta de 06/10/2026: 5 horas de áudio por mês para fala para texto, valor a reconfirmar no SCRUM-26). Acima disso, é preciso a camada paga (S0) ou bloquear o uso e pedir para digitar.
- Verificado em 06/10/2026: a região Brazil South oferece as camadas F0 e S0; o provedor `Microsoft.CognitiveServices` ainda não está registrado na assinatura (feito no SCRUM-22).
- Gravação de áudio no app depende da API de áudio vigente do Expo e difere entre mobile e web (conferir a documentação no SCRUM-20).

## Verificações e fontes

- Disponibilidade por região: `az cognitiveservices account list-skus --kind SpeechServices --location brazilsouth`, em 06/10/2026.
- Franquia: [Azure Speech: preços](https://azure.microsoft.com/pricing/details/speech), consultado em 06/10/2026.
