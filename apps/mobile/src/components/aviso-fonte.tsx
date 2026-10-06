import type { DoseListResponse } from '@vacina/shared';
import { Texto } from './texto';

/**
 * Rodapé obrigatório de todo conteúdo vacinal: fonte, versão e a frase de que o app não substitui
 * a caderneta oficial. Marca "Calendário de exemplo" quando os dados são fictícios.
 *
 * @param props.fonte - Fonte e versão do calendário, como a API as devolve.
 */
export function AvisoFonte({ fonte }: { fonte: DoseListResponse['source'] }) {
  return (
    <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
      {fonte.isFictitious ? 'Calendário de exemplo (dados fictícios). ' : ''}
      {`Fonte: ${fonte.name}, versão ${fonte.version}. ${fonte.notice}`}
    </Texto>
  );
}
