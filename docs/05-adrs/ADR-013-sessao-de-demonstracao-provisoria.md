# ADR-013: Sessão de demonstração provisória (antes do login)

- **Status:** Aceita (provisória; substituída pelo login do SCRUM-13)
- **Data:** 2026-10-06
- **Decisor:** autor (a apresentação exige o app navegável antes de o tenant do Entra External ID existir)
- **Requisitos relacionados:** RF01, RNF02, RNF03

## Contexto

O login real usa o Microsoft Entra External ID (ADR-005), cujo tenant ainda precisa ser criado no portal (SCRUM-13). Para ter o app navegável (família, calendário, doses, consentimento e exclusão de dados), a API precisa saber **de quem são os dados**; senão todo visitante do site público veria e alteraria a mesma família, o que expõe dado de saúde (CLAUDE.md §10).

## Decisão

- O navegador gera um **identificador aleatório de 32 caracteres hexadecimais**, guarda no `localStorage` (na web) e o envia no cabeçalho `x-demo-session` em toda chamada. No celular, onde não há `localStorage`, vale só enquanto o app está aberto (não se adicionou dependência, para respeitar o escopo).
- A API trata o identificador como **dono opaco** dos dados: todo repositório recebe o dono e **confere a propriedade em todo acesso**; um recurso de outro dono responde 404, como se não existisse. Isso já é o contrato final: ao entrar o login, só a função `resolveDemoOwner` (`apps/api/src/identity.ts`) muda, passando a ler o token em vez do cabeçalho.
- Os dados ficam **em memória** (por dono, com limite de 500 donos e 20 pessoas por conta) e **somem quando a API reinicia**. O banco (Azure SQL, ADR-004) entra depois do login.
- O consentimento (RF09) é exigido antes de cadastrar pessoas; menores de 18 anos exigem a declaração de responsável legal; a exclusão da conta apaga tudo do dono.
- O app avisa na tela de consentimento e na aba Conta que é uma **versão de demonstração, sem login**, e orienta a não cadastrar dados de pessoas reais sem autorização.

## O que isto **não** é

- **Não é autenticação.** Quem souber o identificador acessa os dados daquela sessão. O identificador é aleatório e não aparece em URL nem em log, mas isso só dificulta, não impede.
- Não protege contra abuso: o limite de taxa (ADR-010) e o login ainda não existem; o endpoint de cadastro limita só o volume por dono.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Um único "usuário demo" compartilhado | Todo visitante veria os dados dos outros. |
| Esperar o tenant do Entra | Não haveria o que apresentar; o tenant depende de ação do autor no portal. |
| Guardar a sessão em `expo-secure-store` | Dependência nova sem aprovação, e o módulo não funciona na web (ADR-009); desnecessário para um identificador sem valor de credencial. |

## Consequências

- A API já nasce com a propriedade por dono e sem confiar em identificadores vindos do cliente para acesso entre usuários; o login só troca a origem do dono.
- Antes de uso real (dados de pessoas verdadeiras), este mecanismo **precisa** ser trocado pelo login e os dados movidos para o banco.
- Registrado como risco na documentação técnica.
