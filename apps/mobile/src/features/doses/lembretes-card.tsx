import type { ReminderItem } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Avatar } from '../../components/avatar';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { SELO_POR_ESTADO } from '../../components/selo-estado-dose';
import { Texto } from '../../components/texto';
import { longDateLabel } from '../../lib/calendar-grid';
import { todayCivil } from '../../lib/dates';
import { useThemeColors } from '../../theme/theme-provider';
import { useReminders } from '../data/hooks';

/** Quantos lembretes aparecem no cartão; os demais ficam nas listas de cada pessoa. */
export const LIMITE_LEMBRETES = 5;

/**
 * Frase do prazo de um lembrete: "hoje", "amanhã", "em 3 dias" ou "atrasada desde 2 de setembro de
 * 2026".
 *
 * @param item - Lembrete.
 * @param hoje - Data de hoje (`AAAA-MM-DD`).
 */
export function descreverPrazo(item: ReminderItem, hoje: string): string {
  if (item.kind === 'OVERDUE') return `atrasada desde ${longDateLabel(item.date)}`;
  if (item.kind === 'TODAY') return 'hoje';
  const dias = Math.round(
    (Date.parse(`${item.date}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000,
  );
  return dias === 1 ? 'amanhã' : `em ${dias} dias`;
}

/** Cores do selo de prazo: atrasada em vermelho, hoje em destaque e os próximos dias em azul. */
const SELO_DO_PRAZO = {
  OVERDUE: SELO_POR_ESTADO.OVERDUE,
  TODAY: SELO_POR_ESTADO.PENDING,
  UPCOMING: SELO_POR_ESTADO.SCHEDULED,
} as const;

/**
 * Rótulo curto do prazo, para o selo do lembrete: "Atrasada", "Hoje", "Amanhã" ou "Em 3 dias".
 *
 * @param item - Lembrete.
 * @param hoje - Data de hoje (`AAAA-MM-DD`).
 */
export function rotuloDoPrazo(item: ReminderItem, hoje: string): string {
  if (item.kind === 'OVERDUE') return 'Atrasada';
  const frase = descreverPrazo(item, hoje);
  return `${frase.charAt(0).toLocaleUpperCase('pt-BR')}${frase.slice(1)}`;
}

/**
 * Cartão "Lembretes" da aba Doses (RF05): as doses que pedem atenção em toda a família (atrasadas,
 * de hoje e dos próximos 7 dias). Some quando não há nada a lembrar. Tocar em um lembrete abre a
 * dose. Funciona na web e no celular; o e-mail de lembrete é opcional e se liga na aba Conta.
 *
 * @param props.hoje - Data de hoje; por padrão, a do aparelho (injetável nos testes).
 */
export function LembretesCard({ hoje = todayCivil() }: { hoje?: string }) {
  const router = useRouter();
  const cores = useThemeColors();
  const reminders = useReminders();
  const itens = reminders.data?.items ?? [];
  if (itens.length === 0) return null;
  const visiveis = itens.slice(0, LIMITE_LEMBRETES);

  return (
    <Cartao className="gap-md border-primaria bg-primariaSuave">
      <View className="flex-row items-center gap-sm">
        <Icone nome="lembrete" cor={cores.primaria} />
        <Texto variante="titulo3" accessibilityRole="header">
          {itens.length === 1 ? '1 lembrete' : `${itens.length} lembretes`}
        </Texto>
      </View>
      <View className="gap-sm medio:flex-row medio:flex-wrap">
        {visiveis.map((item, indice) => {
          const selo = SELO_DO_PRAZO[item.kind];
          return (
            <Pressable
              key={item.doseId}
              accessibilityRole="link"
              accessibilityLabel={`${item.memberName}: ${item.vaccine}, ${item.doseLabel}, ${descreverPrazo(item, hoje)}`}
              onPress={() => router.push({ pathname: '/dose/[id]', params: { id: item.doseId } })}
              className="min-h-toque flex-row items-center gap-md rounded-botao border-fina border-bordaSuave bg-superficie p-md hover:bg-superficieSuave medio:min-w-[300px] medio:flex-1"
            >
              <Avatar nome={item.memberName} indice={indice} tamanho={40} />
              <View className="min-w-0 flex-1">
                <Texto variante="corpoNegrito" numberOfLines={2}>
                  {`${item.vaccine}, ${item.doseLabel}`}
                </Texto>
                <Texto variante="apoio" className="text-textoSecundario">
                  {item.kind === 'OVERDUE'
                    ? `${item.memberName} · ${descreverPrazo(item, hoje)}`
                    : item.memberName}
                </Texto>
              </View>
              <View className={`rounded-selo border-padrao px-md py-xs ${selo.caixa}`}>
                <Texto variante="rotulo" className={selo.texto}>
                  {rotuloDoPrazo(item, hoje)}
                </Texto>
              </View>
            </Pressable>
          );
        })}
      </View>
      {itens.length > visiveis.length && (
        <Texto className="text-textoSecundario">{`e mais ${itens.length - visiveis.length}`}</Texto>
      )}
    </Cartao>
  );
}
