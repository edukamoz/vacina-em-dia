import type { CalendarSourceResponse } from '@vacina/shared';
import { View } from 'react-native';
import { Texto } from './texto';

/**
 * Rodapé obrigatório de todo conteúdo vacinal: fonte, versão e a frase de que o app não substitui
 * a caderneta oficial. Marca "Calendário de exemplo" quando os dados são fictícios.
 *
 * @param props.fonte - Fonte e versão do calendário, como a API as devolve.
 */
export function AvisoFonte({ fonte }: { fonte: CalendarSourceResponse }) {
  return (
    <View className="rounded-[16px] border-fina border-bordaSuave bg-superficieSuave p-lg">
      <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
        {fonte.isFictitious ? 'Calendário de exemplo (dados fictícios). ' : ''}
        {`Fonte: ${fonte.name}, ${fonte.publisher}, versão ${fonte.version}. ${fonte.notice}`}
      </Texto>
    </View>
  );
}
