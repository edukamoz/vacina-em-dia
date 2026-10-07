import type { ReminderItem } from '@vacina/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { Texto } from '../../components/texto';
import { longDateLabel } from '../../lib/calendar-grid';
import { todayCivil } from '../../lib/dates';
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

/**
 * Cartão "Lembretes" da aba Doses (RF05): as doses que pedem atenção em toda a família (atrasadas,
 * de hoje e dos próximos 7 dias). Some quando não há nada a lembrar. Tocar em um lembrete abre a
 * dose. Funciona na web e no celular; o e-mail de lembrete é opcional e se liga na aba Conta.
 *
 * @param props.hoje - Data de hoje; por padrão, a do aparelho (injetável nos testes).
 */
export function LembretesCard({ hoje = todayCivil() }: { hoje?: string }) {
  const router = useRouter();
  const reminders = useReminders();
  const itens = reminders.data?.items ?? [];
  if (itens.length === 0) return null;
  const visiveis = itens.slice(0, LIMITE_LEMBRETES);

  return (
    <Cartao className="gap-md border-primaria bg-primariaSuave">
      <Texto variante="titulo3" accessibilityRole="header">
        {itens.length === 1 ? '1 lembrete' : `${itens.length} lembretes`}
      </Texto>
      {visiveis.map((item) => (
        <Pressable
          key={item.doseId}
          accessibilityRole="link"
          accessibilityLabel={`${item.memberName}: ${item.vaccine}, ${item.doseLabel}, ${descreverPrazo(item, hoje)}`}
          onPress={() => router.push({ pathname: '/dose/[id]', params: { id: item.doseId } })}
          className="min-h-toque justify-center"
        >
          <View>
            <Texto variante="corpoNegrito">
              {`${item.memberName}: ${item.vaccine}, ${item.doseLabel}`}
            </Texto>
            <Texto className={item.kind === 'OVERDUE' ? 'text-erro' : 'text-textoSecundario'}>
              {descreverPrazo(item, hoje)}
            </Texto>
          </View>
        </Pressable>
      ))}
      {itens.length > visiveis.length && (
        <Texto className="text-textoSecundario">{`e mais ${itens.length - visiveis.length}`}</Texto>
      )}
    </Cartao>
  );
}
