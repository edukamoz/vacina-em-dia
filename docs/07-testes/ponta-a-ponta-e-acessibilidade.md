# Vacina em Dia: testes de ponta a ponta e de acessibilidade

> Complementa o `plano-de-teste.md` (seção 4.1). Ferramenta: **Playwright** 1.64.0 com **axe-core** 4.13.0 (`@axe-core/playwright`).
> Código: `apps/mobile/e2e/`. Rodam no pipeline (CI) a cada push, depois do build.

## 1 O que é testado

Os testes abrem o **app web de verdade** (o build da pasta `dist`, servido em `localhost:4173`), num navegador Chromium, e agem como uma pessoa: digitam, tocam e leem a tela. A **API é falsa** e fica no navegador (`e2e/api-falsa.ts`): ela responde com dados fixos, na memória. Por isso os testes não precisam de Azure, de banco nem de internet, e dão o mesmo resultado em qualquer dia: o relógio do navegador é travado em 10/10/2026.

A API falsa valida o **contrato** do app (rotas, formatos e mensagens que o app espera); a regra de negócio de verdade continua coberta pelos testes unitários e de integração da API (Jest e Supertest).

## 2 Casos de teste

| ID | Requisitos | O que verifica |
|---|---|---|
| CT-E2E-01 | RF01, RF02, RF03, RF04, RF09 | Cria a conta (senhas diferentes mostram o erro e nada é enviado), aceita o consentimento, cadastra uma pessoa, vê o calendário com a fonte oficial e o aviso, abre uma dose e registra a aplicação |
| CT-E2E-02 | RF01 | Entrar com senha errada mostra a mensagem da API; "Mostrar" revela a senha no próprio campo; com a senha certa o app abre |
| CT-E2E-03 | RF07 | Abre o balão do assistente, pergunta e recebe a resposta curada com a fonte |
| CT-E2E-04 | RNF04 | O padrão anima mesmo com o sistema pedindo menos movimento; o atalho "Reduzir movimento" vale na hora e pode ser desfeito |
| CT-E2E-A11Y | RNF04 | axe-core (WCAG 2.1 A e AA) em Apresentação, Entrar e Criar conta, nos temas claro e escuro: nenhuma violação grave |

## 3 Resultado de acessibilidade (axe-core)

Em 10/10/2026, nas três telas e nos dois temas, o axe-core encontrou **0 violações** (de 21 a 24 regras cumpridas por tela). Isso cobre o que uma máquina enxerga: contraste de cor, nomes de botões e campos, títulos, idioma da página e áreas clicáveis. **Não substitui** o teste com leitor de tela, com zoom de 200% e no celular, que continuam pendentes. Cada execução guarda o relatório completo (JSON do axe e relatório HTML) como arquivo do pipeline.

## 4 Como rodar

```bash
npm run build --workspace apps/mobile         # gera a pasta dist
npx playwright install chromium                # primeira vez (no CI, já está no pipeline)
npm run test:e2e --workspace apps/mobile       # roda os testes
```

No computador de desenvolvimento, `E2E_CANAL=chrome` usa o Chrome já instalado, sem baixar o Chromium. O relatório HTML fica em `apps/mobile/e2e/relatorio/` (fora do Git).

## 5 Limites

- Só a web (o Playwright não roda no celular). Android e iOS seguem pela verificação manual.
- A API é falsa: um erro de integração real (por exemplo, uma rota que mudou de nome só na API) não aparece aqui; para isso há os testes da API e a demonstração.
- Conteúdo vacinal e respostas do chatbot são fixos; a qualidade do chatbot é avaliada à parte (`avaliacao-chatbot.md`).
