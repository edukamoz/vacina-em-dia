import { Texto } from './texto';

/** Dados da fonte do conteúdo vacinal exibido. */
export interface FonteCalendario {
  readonly nome: string;
  readonly versao: string;
  readonly ficticio: boolean;
}

/**
 * Rodapé obrigatório de todo conteúdo vacinal: fonte, versão e a frase de que o app não substitui
 * a caderneta oficial. Marca "Calendário de exemplo" quando os dados são fictícios.
 *
 * @param props.fonte - Fonte e versão do calendário.
 */
export function AvisoFonte({ fonte }: { fonte: FonteCalendario }) {
  return (
    <Texto variante="apoio" className="text-textoSecundario" accessibilityRole="text">
      {fonte.ficticio ? 'Calendário de exemplo (dados fictícios). ' : ''}
      {`Fonte: ${fonte.nome}, versão ${fonte.versao}. O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.`}
    </Texto>
  );
}
