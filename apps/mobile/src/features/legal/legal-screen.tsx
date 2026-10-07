import { View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { Tela } from '../../components/tela';
import { Texto } from '../../components/texto';
import type { LegalDocument } from './legal-content';

/**
 * Tela de leitura de um documento legal (Termos de uso ou Política de privacidade). Pública: abre
 * também para quem ainda não entrou, pois o aceite acontece em "Criar conta".
 *
 * @param props.documento - Documento a exibir.
 */
export function LegalScreen({ documento }: { documento: LegalDocument }) {
  return (
    <Tela titulo={documento.titulo} subtitulo={documento.subtitulo} voltar>
      <Cartao className="gap-xl">
        {documento.secoes.map((secao) => (
          <View key={secao.titulo} className="gap-sm">
            <Texto variante="titulo3" accessibilityRole="header">
              {secao.titulo}
            </Texto>
            {secao.paragrafos.map((paragrafo) => (
              <Texto key={paragrafo}>{paragrafo}</Texto>
            ))}
          </View>
        ))}
      </Cartao>
    </Tela>
  );
}
