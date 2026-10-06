# ADR-009: Armazenamento do token de sessão no app (nativo e web)

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor (decisão delegada ao Claude após estudo; a validar no protótipo do SCRUM-13)
- **Requisitos relacionados:** RF01, RNF02, RNF09

## Contexto

O `CLAUDE.md` §10 exige token de sessão em armazenamento seguro (`expo-secure-store`), mas esse módulo **não funciona na web** (a chamada falha com "método não disponível na web"). Como o app tem uma base única para Android, iOS e web (RNF09), é preciso definir como guardar o token em cada plataforma. Dados de saúde estão em jogo, então o risco de roubo de token (por exemplo, por XSS) deve ser baixo.

## Decisão

- Criar uma interface única `TokenStorage` no app, com duas implementações escolhidas por plataforma:
  - **Android e iOS:** `expo-secure-store` (Keychain e Keystore).
  - **Web:** `sessionStorage` do navegador, com **tempo de vida curto do token de acesso**, sem `localStorage`.
- Na web, o token some ao **fechar a aba**; o usuário entra de novo. É um custo aceito em troca de menos exposição.
- **Mitigações obrigatórias na web:** Content Security Policy restritiva, sem scripts de terceiros, sem `dangerouslySetInnerHTML` com entrada do usuário, cabeçalhos de segurança e CORS restrito (CLAUDE.md §10).
- Se for usado o MSAL no navegador, configurar o cache em `sessionStorage` (o padrão); a escolha da biblioteca é feita no SCRUM-13 (ADR-005).
- O token **nunca** é registrado em log nem enviado em URL.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `localStorage` | Persiste entre sessões e abas, e fica legível a qualquer script injetado; a própria Microsoft recomenda `sessionStorage` por ser mais seguro, deixando o `localStorage` para quem prioriza a experiência. |
| Token só em memória | Mais seguro, mas perde a sessão a cada recarga da página, o que é ruim para quem tem baixa familiaridade digital; o MSAL também indica que o modo em memória não suporta o fluxo de redirecionamento. |
| Cookie `httpOnly` com um serviço intermediário (BFF) | É a opção mais segura contra XSS, mas exige mais um serviço, gestão de cookie e proteção contra CSRF; excede o escopo e o orçamento de tempo de uma pessoa. |
| Criptografar o token no `localStorage` | Não protege contra XSS: quem executa script também chega à chave (a documentação do MSAL afirma que a criptografia só reduz a persistência). |

## Consequências

- Equilíbrio entre segurança e uso: a sessão na web dura enquanto a aba estiver aberta; no celular, persiste de forma segura.
- A regra de segurança do `CLAUDE.md` §10 fica atendida por plataforma: "armazenamento seguro" é Keychain/Keystore no nativo e `sessionStorage` com mitigações na web.
- Testes de unidade usam um `TokenStorage` falso, sem depender de plataforma.
- Se um dia a web virar a plataforma principal, **reavaliar o BFF** com cookie `httpOnly` em um novo ADR que substitua este.
- Esta decisão será validada com o fluxo real de login no SCRUM-13; se o MSAL exigir outra configuração, o ADR é atualizado.

## Verificações e fontes

- [Cache de tokens no MSAL.js (Microsoft Learn)](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching): `sessionStorage` é o padrão e o recomendado; `localStorage` favorece a experiência; memória é mais segura mas perde a sessão e não suporta redirecionamento. Consultado em 06/10/2026.
- [Autenticação no Expo](https://docs.expo.dev/guides/authentication/) e relatos da comunidade: o `expo-secure-store` não está disponível na web; usar verificação por plataforma. Consultado em 06/10/2026.
