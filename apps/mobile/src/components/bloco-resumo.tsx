import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useVisual } from '../theme/theme-provider';
import { Texto } from './texto';

/**
 * Bloco de resumo: o destaque da tela (no máximo um), com degradê da marca, de `primaria` a
 * `primariaProfunda`, e texto em `sobrePrimaria`. No Alto contraste é cor chapada com borda de
 * 3 px; no Escuro a cor da marca é clara e o texto escuro (contraste de 8,9:1).
 *
 * @param props.legenda - Linha pequena acima do título (por exemplo, "Calendário de Helena, 3 anos").
 * @param props.titulo - Frase principal (por exemplo, "1 dose para resolver").
 * @param props.aoLado - Elemento à esquerda do texto (o anel de progresso).
 * @param props.children - Conteúdo abaixo (as contagens).
 */
export function BlocoResumo({
  legenda,
  titulo,
  aoLado,
  children,
}: {
  legenda?: string;
  titulo: string;
  aoLado?: ReactNode;
  children?: ReactNode;
}) {
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  return (
    <View
      accessibilityRole="summary"
      className={`gap-lg overflow-hidden rounded-folha p-xl ${
        altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-transparent'
      }`}
      style={[gradienteMarca, sombra(2)]}
    >
      <View className="flex-row items-center gap-lg">
        {aoLado}
        <View className="min-w-0 flex-1 gap-xs">
          {legenda ? (
            <Texto variante="apoio" className="text-sobrePrimaria">
              {legenda}
            </Texto>
          ) : null}
          <Texto variante="titulo2" accessibilityRole="header" className="text-sobrePrimaria">
            {titulo}
          </Texto>
        </View>
      </View>
      {children}
    </View>
  );
}
