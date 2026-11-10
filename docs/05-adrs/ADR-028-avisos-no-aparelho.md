# ADR-028: Avisos de dose no aparelho, por notificações locais agendadas

- **Status:** aceito em 10/11/2026 (decisão do autor: seguir a ordem proposta, começando pelas notificações locais)
- **Item do backlog:** B70
- **Relacionados:** ADR-017 (lembretes por e-mail e no app), ADR-027 (aviso antecipado por dose), `docs/06-seguranca-e-lgpd.md`, CLAUDE.md §10.

## Contexto

O lembrete existente é a lista na aba Doses e um e-mail diário (ADR-017). O autor pediu avisos no aplicativo, porque "apenas e-mail acaba se tornando inútil". As opções avaliadas em 10/11/2026 (documentação do Expo consultada nesse dia):

| Opção | Exige | Limites |
|---|---|---|
| A. Notificações **locais** agendadas (`expo-notifications`) | Nenhum servidor, credencial ou custo | Só Android e iOS; reagendam quando o aplicativo abre, então não sabem de mudança feita em outro aparelho |
| B. Push remoto nativo (Expo Push, FCM e APNs) | Chaves de push; no Android, build próprio (não funciona no Expo Go desde o SDK 53); tabela de tokens; envio pela Function | O APK é gerado por Gradle, não por EAS (configurar o FCM é trabalho a confirmar); iOS nunca foi testado e, até onde sei, exige conta Apple paga (não confirmado) |
| C. Web Push (service worker + VAPID) | Service worker, que hoje não existe (decisão do `docs/25`); chaves VAPID | No iPhone só com o app instalado na tela de início, iOS 16.4 ou mais |

## Decisão

1. **Opção A agora.** Avisos agendados no próprio aparelho, sem servidor. B e C ficam para depois (B71) e só se o autor aprovar; B é necessário para avisar de mudanças de outro aparelho (família com vários responsáveis, B15).
2. **O que se agenda** (`planejarAvisos`, função pura em `apps/mobile/src/lib/avisos.ts`): para cada dose que não está aplicada nem cancelada, um aviso **na data** (a agendada ou, sem ela, a prevista), um **na antecedência** escolhida para a dose (7 dias por padrão; 0 avisa só no dia; ADR-027) e, se a data passou ontem, um de **atraso**. Dose atrasada há mais tempo não gera aviso novo, no mesmo espírito do e-mail (ADR-017): o atraso aparece em destaque no aplicativo.
3. **Um aviso por dia**, juntando as doses daquela data, com **só quantidades** ("1 vacina é para hoje, 2 vacinas chegam nos próximos dias e 1 vacina está atrasada"), **sem nome de pessoa nem de vacina**: o texto aparece na tela bloqueada.
4. **Horizonte:** 45 dias à frente, no máximo 60 avisos (o iOS guarda 64). O que passar disso é coberto pelo próximo agendamento.
5. **Quando reagenda:** ao abrir o aplicativo, ao voltar a ele, a cada mudança nas doses e ao mudar o horário. Cada vez troca todos os agendados pelos novos.
6. **Horário:** 8h, 12h ou 18h (padrão 8h, o mesmo do e-mail), na hora do aparelho. A escolha (ligado e hora) fica **só no aparelho** (`AsyncStorage`), não vai ao servidor.
7. **Permissão:** o sistema só é perguntado quando a pessoa **liga o interruptor** na aba Conta, nunca ao abrir o aplicativo. Se negar, o app explica como ativar nas configurações e deixa desligado.
8. **Privacidade:** nada do que se agenda sai do aparelho; ao **sair da conta** (a tela de abas some), todos os avisos agendados são cancelados, para que nada de uma conta apareça na outra.
9. **Web:** não há aviso agendado; a aba Conta explica que o recurso é do aplicativo e o lembrete segue na aba Doses e por e-mail.
10. **Dependência nova:** `expo-notifications` ~57.0.25 (versão do SDK 57, `docs/tech-versions.md`), com o plugin no `app.json` (cor da marca). No Android 13 ou mais, a permissão `POST_NOTIFICATIONS` vem do plugin.

## Consequências

- Nenhum serviço Azure novo, nenhuma credencial e nenhum custo.
- **Não foi testado em aparelho real** nesta entrega (só com o módulo nativo simulado nos testes e o build web). Antes de dar por pronto, o autor precisa conferir no celular: pedir a permissão, receber um aviso agendado para daqui a poucos minutos e ver o aviso sumir ao sair da conta.
- No Android 12 ou mais, o horário pode variar alguns minutos (alarme não exato); sem a permissão de alarme exato o aviso chega "por volta" da hora (documentação do Expo).
- O aviso não sabe de mudanças feitas em **outro aparelho** até o aplicativo abrir neste (por isso B e C existem).
- A Política de Privacidade (`features/legal/legal-content.ts`) fala só do e-mail; os avisos no aparelho não enviam nada a lugar nenhum, mas o autor deve decidir se quer citá-los no texto.

## Alternativas consideradas

| Alternativa | Por que não agora |
|---|---|
| Push remoto nativo | Credenciais, build próprio e conta Apple (a confirmar); só se compensa quando houver vários responsáveis por família |
| Web Push | Exige service worker, hoje inexistente; entra depois |
| Aviso diário enquanto houver dose atrasada | Insiste demais; o atraso já aparece no aplicativo (ADR-017) |
| Texto com nome da pessoa e da vacina | Dado de saúde na tela bloqueada (LGPD) |

## Verificações e fontes

- Recursos de agendamento, push remoto e limitações do Expo Go: [documentação do `expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/), consultada em 10/11/2026. A página não informa o limite de avisos agendados no iOS (64 é o teto conhecido da plataforma, a reconfirmar).
- API conferida nos tipos do pacote instalado: gatilho `DATE`, `getPermissionsAsync`, `requestPermissionsAsync`, `cancelAllScheduledNotificationsAsync`, canal do Android.
- Casos de teste: `apps/mobile/src/lib/avisos.test.ts` (CT-AVISO-01 a 17) e `apps/mobile/src/features/avisos/avisos.test.tsx` (CT-AVISO-20 a 54).
