import type { DoseStatus } from '@vacina/shared';
import { View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { Texto } from '../../components/texto';
import { formatCivilDate } from './format-date';
import type { SampleDose } from './sample-doses';

const DICA: Readonly<Record<DoseStatus, string>> = {
  PENDING: 'Ainda sem data marcada',
  SCHEDULED: 'Marcada para',
  OVERDUE: 'Era para',
  APPLIED: 'Aplicada em',
  CANCELLED: 'Não é mais necessária',
};

const FAIXA: Readonly<Record<DoseStatus, string>> = {
  PENDING: 'bg-pendente',
  SCHEDULED: 'bg-agendada',
  OVERDUE: 'bg-atrasada',
  APPLIED: 'bg-aplicada',
  CANCELLED: 'bg-cancelada',
};

/** Texto de apoio do cartão, por exemplo "Marcada para 04/11/2026". */
export function doseHint(dose: Pick<SampleDose, 'status' | 'date'>): string {
  if (dose.status === 'PENDING' || dose.status === 'CANCELLED') return DICA[dose.status];
  return `${DICA[dose.status]} ${formatCivilDate(dose.date)}`;
}

/**
 * Cartão de dose: faixa lateral de 6 px na cor do estado, nome da vacina, selo e dica de leitura.
 *
 * @param props.dose - Dose a exibir.
 */
export function DoseCard({ dose }: { dose: SampleDose }) {
  return (
    <Cartao className="flex-row overflow-hidden p-0">
      <View className={`w-[6px] ${FAIXA[dose.status]}`} />
      <View className="flex-1 gap-sm p-lg">
        <Texto variante="corpoNegrito">{`${dose.vaccine}, ${dose.doseLabel}`}</Texto>
        <SeloEstadoDose status={dose.status} />
        <Texto variante="apoio" className="text-textoSecundario">
          {doseHint(dose)}
        </Texto>
      </View>
    </Cartao>
  );
}
