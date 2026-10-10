# Vacina em Dia: do problema ao backlog

Mostra o caminho completo que o projeto percorreu e que a orientação do professor pede: **problemas → expectativas → personas → requisitos funcionais e não funcionais → backlog (épicos e itens do Jira) → desenvolvimento → testes**. Não cria requisitos novos: reúne, em uma só página, o que já está em `docs/01-visao-e-escopo.md` (Fase 0), `docs/02-requisitos.md`, `docs/19-rastreabilidade.md` e no Jira.

## 1. O caminho em uma figura

```text
Problemas (PR1 a PR4)  →  Expectativas (EX1 a EX4)  →  Personas (PE1 a PE3)
          ↓                                                    ↓
   Requisitos funcionais (RF01 a RF12)  +  Requisitos não funcionais (RNF01 a RNF10)
          ↓
   Épicos do Jira (SCRUM-5 a SCRUM-12)  →  Itens (SCRUM-13 a SCRUM-40)  →  Sprints semanais
          ↓
   Código (apps/ e packages/)  →  Casos de teste (CT-...)  →  Evidências (docs/07-testes/)
```

## 2. Problemas, expectativas e requisitos

Fonte: Quadro 1 da Fase 0 (`docs/01-visao-e-escopo.md`, seção 2.1).

| Problema | Expectativa | Personas | Requisitos que a atendem |
|---|---|---|---|
| **PR1** Doses esquecidas ou atrasadas por falta de lembrete e organização | **EX1** Notificar antes da data e sinalizar atrasadas | PE1, PE3 | RF04 (doses e ciclo de vida), RF05 (lembretes); RNF01, RNF05, RNF07 |
| **PR2** Caderneta de papel perdida ou dispersa | **EX2** Registro digital único por pessoa, consultável a qualquer momento | PE1, PE3 | RF02 (família), RF08 (histórico), RF01 (conta); RNF03, RNF04 |
| **PR3** Dúvida sobre o que é indicado por idade, em cenário de desinformação | **EX3** Calendário por faixa etária com base no PNI e respostas curadas | PE1, PE2, PE3 | RF03 (calendário), RF07 (chatbot); RNF10 (integridade dos dados vacinais) |
| **PR4** Barreiras para quem tem pouca familiaridade digital ou dificuldade de digitar | **EX4** Consulta por voz e interface acessível em linguagem simples | PE2 (e PE1) | RF06 (voz); RNF04 (acessibilidade), RNF09 (multiplataforma) |

Requisitos que sustentam todos os problemas: RF09 (consentimento e exclusão, LGPD), RNF02 (segurança), RNF03 (privacidade), RNF06 a RNF08 (manutenção, testes, portabilidade). Versão completa: RF10 (mapa de postos, **feito**), RF11 (PDF) e RF12 (compartilhar), estes dois não iniciados.

## 3. Personas

PE1 **Mariana**, 32 anos (mãe, pouco tempo); PE2 **Sr. José**, 68 anos (idoso, voz e letras grandes); PE3 **Carla**, 45 anos (cuidadora de várias pessoas). Perfil, necessidades e dificuldades de cada uma: Quadro 3 da Fase 0. Cada RF indica as personas que atende (Quadro 4).

## 4. Requisitos e o backlog

| Requisito | Épico | Item do Jira |
|---|---|---|
| RF01 Cadastro e login | SCRUM-7 Conta e privacidade | SCRUM-13 |
| RF09 Consentimento e exclusão | SCRUM-7 | SCRUM-14 |
| RF02 Membros da família | SCRUM-8 Família e calendário vacinal | SCRUM-15 |
| RF03 Calendário por faixa etária | SCRUM-8 | SCRUM-16 |
| RF08 Histórico | SCRUM-8 | SCRUM-17 |
| RF04 Registro e ciclo de vida da dose | SCRUM-9 Doses e lembretes | SCRUM-18 |
| RF05 Lembretes | SCRUM-9 | SCRUM-19 |
| RF06 Busca por voz | SCRUM-10 PLN | SCRUM-20 |
| RF07 Chatbot | SCRUM-10 | SCRUM-21 |
| RF10 Mapa de postos | SCRUM-12 Versão completa | SCRUM-38 |
| RF11 Exportar PDF | SCRUM-12 | SCRUM-39 |
| RF12 Compartilhar com cuidador | SCRUM-12 | SCRUM-40 |
| RNF05 e RNF08 (monitoramento, contêiner) | (épico a conferir no Jira) | SCRUM-22 a SCRUM-26 |
| RNF07 (testabilidade) | (épico a conferir no Jira) | SCRUM-27 a SCRUM-30 |
| RNF04 e RNF06 (design, ADRs, UML, documentações) | (épico a conferir no Jira) | SCRUM-31 a SCRUM-37 |

Os épicos dos requisitos funcionais foram associados pelo nome e pela ordem dos itens; confira a associação no Jira. As sprints semanais e as datas das entregas estão em `docs/00-handoff.md` (seção 3) e em `docs/01-visao-e-escopo.md` (seção 9).

## 5. Do backlog à evidência

Para cada requisito, onde ele aparece no app, em qual rota da API e em quais testes: `docs/19-rastreabilidade.md`. Os casos de teste seguem o padrão `CT-...` (plano em `docs/07-testes/`).

## 6. O que a documentação atende e as lacunas

**Atende:** problemas com metas mensuráveis, expectativas ligadas a cada problema, três personas, 12 requisitos funcionais e 10 não funcionais, cada um ligado a personas e a RNFs, escopo (MVP, versão completa e fora do escopo), backlog em épicos e itens com sprints, e a rastreabilidade até os testes.

**Lacunas que o professor pode apontar** (e como fechá-las):

1. **Validação com usuários reais: abandonada por decisão da autora (10/10/2026).** Não foi possível reunir pessoas parecidas com as personas; por isso problemas e personas seguem como **hipóteses de trabalho**, como a Fase 0 já declara, e isso fica registrado como limitação do projeto. Nada foi inventado para suprir a falta.
2. **Prioridade dos requisitos.** *Fechada em 10/10/2026:* cada item do backlog tem prioridade MoSCoW (`docs/24-backlog.md`), proposta a ser confirmada pela autora.
3. **Critérios de aceite por requisito.** *Fechada em 10/10/2026:* cada item do backlog traz seus critérios de aceite, derivados das metas dos problemas e dos casos de teste.
4. **Histórias de usuário.** *Fechada em 10/10/2026:* os itens estão no formato "Como [persona], quero [ação], para [benefício]".

O backlog vivo está no projeto "proj-vacina-em-dia" do GitHub Projects, que passou a substituir o Jira.
