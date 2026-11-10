import type { CalendarSourceResponse, CalendarWatchStatus } from '@vacina/shared';
import { View } from 'react-native';
import { formatCivilDate } from '../features/doses/format-date';
import { todayCivil } from '../lib/dates';
import { Texto } from './texto';

/**
 * Rodapé obrigatório de todo conteúdo vacinal: fonte, versão e a frase de que o app não substitui
 * a caderneta oficial. Marca "Calendário de exemplo" quando os dados são fictícios.
 *
 * @param props.fonte - Fonte e versão do calendário, como a API as devolve.
 * @param props.conferencia - Quando o vigia conferiu o calendário com o Ministério e se achou
 *   diferença; sem ela (ainda carregando ou fora do ar), a frase simplesmente não aparece.
 */
export function AvisoFonte({
  fonte,
  conferencia,
}: {
  fonte: CalendarSourceResponse;
  conferencia?: CalendarWatchStatus | undefined;
}) {
  return (
    <View className="rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-lg">
      <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
        {fonte.isFictitious ? 'Calendário de exemplo (dados fictícios). ' : ''}
        {`Fonte: ${fonte.name}, ${fonte.publisher}, versão ${fonte.version}. ${fonte.notice}`}
      </Texto>
      {conferencia?.checkedAt ? (
        <Texto variante="apoio" className="mt-sm text-textoSecundario" accessibilityRole="text">
          {`Conferido com o site do Ministério da Saúde em ${formatCivilDate(todayCivil(new Date(conferencia.checkedAt)))}.`}
          {conferencia.changed
            ? ' O Ministério publicou arquivos diferentes dos que o app usa; a atualização está em análise.'
            : ''}
        </Texto>
      ) : null}
    </View>
  );
}
