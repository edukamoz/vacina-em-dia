# ADR-037: Régua de movimento do aplicativo

- **Status:** aceito em 17/11/2026 (decisão do autor: aprovou o exemplo de movimento v4, em artifact do Claude, e mandou aplicar)
- **Relacionados:** ADR-036 (redesenho visual v3), ADR-026 (movimento padrão segue o aparelho)
- **Requisitos:** RNF04 (acessibilidade)

## Contexto

O app tinha dois tempos nomeados (`suave` 450 ms e `passo` 50 ms) e vários valores soltos no código (220, 500 e 520 ms, curvas escritas à mão). Cada componente escolhia o seu, e as animações novas da landing e das telas (abas deslizantes, acordeão, aviso, visto, interruptor) precisavam de uma régua para não ficarem desencontradas.

## Decisão

1. **Sete tempos, cada um com um uso:** escalonamento 40 ms, micro 80, rapida 150, passo 250, media 350, lenta 400 e enfase 500. Ficam em `duracoes` no `tokens.json` (única fonte) e o código os lê de `DURACAO`, em `animacao.tsx`.
2. **Duas curvas:** `padrao` (`cubic-bezier(.22,1,.36,1)`) para abrir, fechar, deslizar e mudar de tamanho; `salto` (`cubic-bezier(.34,1.35,.64,1)`) só para entradas curtas. Nunca se faz uma saída com salto.
3. **Abrir é mais lento que fechar,** e nada que fecha espera. Entradas em sequência usam o escalonamento de 40 ms e no máximo 8 itens.
4. **Mesmas regras de acessibilidade de antes:** tudo para com "Reduzir movimento", o Alto contraste fica parado e nada essencial depende de animação.
5. Os tempos antigos (`padrao` 200, `enfatica` 320, `suave` 450 e `passo` 50) e as curvas `saida` e `mola` saem. Um valor que não casa com nenhum uso da régua não é forçado: fica com comentário dizendo o motivo.

## Alternativas

- **Manter os valores soltos:** mais barato, mas cada tela nova teria um ritmo próprio.
- **Biblioteca de animação:** não é preciso; o `Animated` do React Native e o CSS da web bastam, e o `CLAUDE.md` pede aprovação para dependência nova.

## Consequências

- Toda animação nova escolhe um tempo pelo uso, não pelo número.
- As transições da skill "transitions-dev" (CSS) usam estes mesmos tempos; no celular viram `Animated` com os mesmos valores.
- Um teste (CT-TOK-13) confere a régua e a ordem crescente.
