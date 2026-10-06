# ADR-010: Limitação de taxa nos endpoints sensíveis

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor (decisão delegada ao Claude após estudo; valores a calibrar nos SCRUM-20 e SCRUM-21)
- **Requisitos relacionados:** RNF01, RNF02, RNF03

## Contexto

O `CLAUDE.md` §10 pede limitação de taxa em login, voz e chatbot, com o mecanismo definido em ADR. Há dois motivos: proteger contra abuso e **proteger o orçamento**: o Speech na camada gratuita tem franquia mensal pequena (ADR-003) e as Functions têm concessão gratuita limitada (ADR-001).

## Decisão

- **Login:** a proteção contra tentativas repetidas é da plataforma de identidade (Entra External ID, ADR-005). A API **não** recebe senha, então não implementa limite de login próprio. A configuração do bloqueio do Entra deve ser conferida no SCRUM-13.
- **Voz e chatbot:** limite **na própria API**, por **usuário autenticado**, com **janela fixa**, guardado em **Azure Table Storage**.
  - A conta de armazenamento já existe para as Functions; localmente é atendida pelo Azurite (RNF08).
  - A chave do contador é um *hash* do identificador do usuário mais o nome do endpoint e a janela, sem dado pessoal em claro.
  - O incremento usa concorrência otimista (ETag) e uma rotina por tempo limpa as janelas antigas.
- **Teto mensal global de voz:** um contador único protege a franquia do Speech; ao atingir o teto, o app avisa e oferece digitar a pergunta.
- Ao exceder, a API responde **HTTP 429** com `Retry-After` e mensagem clara em português; o erro é mapeado em **um único ponto** (CLAUDE.md §7).
- Valores iniciais propostos (ajustáveis por configuração): voz, 20 por hora e 60 por dia por usuário; chatbot, 60 por hora por usuário. A calibragem usa dados reais no SCRUM-20 e no SCRUM-21.
- Endpoints sem sessão (se houver) usam o *hash* do endereço IP como chave.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Azure API Management na frente das Functions | Política de limite pronta, mas é mais um serviço, com custo e configuração; excessivo para o tamanho do projeto. |
| Azure Front Door com WAF | A documentação indica que limites baixos (como 10 chamadas por minuto) não são confiáveis, pelo modo como o tráfego é distribuído; também tem custo fixo. |
| Contadores no Azure SQL | Funciona, mas gera escritas frequentes que mantêm o banco ativo e consomem a franquia gratuita (ADR-004). |
| Apenas controle de concorrência do `host.json` | Limita simultaneidade, não requisições por usuário. |
| Sem limite | Risco de abuso e de estourar a franquia gratuita. |

## Consequências

- Nenhum serviço novo e custo desprezível; funciona igual no ambiente local e na nuvem.
- Janela fixa permite rajada na virada da janela; aceitável para este escopo (pode evoluir para janela deslizante).
- Cada requisição limitada faz uma leitura/escrita extra no Table Storage, com pequena latência (medir contra o RNF01).
- A limitação é regra de negócio testável: testes unitários com relógio injetável e Table Storage simulado, incluindo o valor limite e a virada de janela.
- Logs registram apenas o *hash* da chave e o resultado (permitido ou bloqueado).
- Os provedores `Microsoft.Storage` já estão registrados na assinatura (06/10/2026).

## Verificações e fontes

- [Limitação de taxa do Azure Front Door com WAF](https://learn.microsoft.com/azure/web-application-firewall/afds/waf-front-door-rate-limit): janelas maiores e limites maiores são mais precisos; limites muito baixos são pouco confiáveis. Consultado em 06/10/2026.
- Franquia do Speech: ver ADR-003.
