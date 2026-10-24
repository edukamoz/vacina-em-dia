import { useMemo } from 'react';
import Svg, { Defs, Circle, Path, Pattern, Rect } from 'react-native-svg';
import type { EstadoDoGrafico } from '../../lib/estatisticas';
import { useThemeColors } from '../../theme/theme-provider';
import { useCoresDosEstados } from './cores-dos-estados';

/**
 * Textura de cada estado nos gráficos. As cores dos estados têm quase o mesmo brilho (de 1,0 a
 * 1,4:1 entre si), então em tons de cinza ou para quem não distingue cores as fatias se confundem.
 * A textura separa os estados sem depender da cor (WCAG 1.4.1).
 */
export const TEXTURA_DO_ESTADO: Readonly<
  Record<EstadoDoGrafico, 'liso' | 'diagonal' | 'pontos' | 'grade'>
> = {
  APPLIED: 'liso',
  SCHEDULED: 'diagonal',
  PENDING: 'pontos',
  OVERDUE: 'grade',
};

const LADO = 8;
let contador = 0;

/** Prefixo único dos identificadores dos padrões; ids repetidos entre SVGs se confundem na web. */
export function usePrefixoDePadroes(): string {
  return useMemo(() => `padrao${(contador += 1)}`, []);
}

/** Valor de `fill` ou `stroke` que usa o padrão do estado. */
export function usarPadrao(prefixo: string, estado: EstadoDoGrafico): string {
  return `url(#${prefixo}-${estado})`;
}

/**
 * Os quatro padrões (cor do estado com a textura por cima), para colocar dentro de um `Svg`.
 *
 * @param props.prefixo - Prefixo único, de `usePrefixoDePadroes`.
 */
export function Padroes({ prefixo }: { prefixo: string }) {
  const cores = useThemeColors();
  const corDoEstado = useCoresDosEstados();
  const traco = cores.superficie;
  return (
    <Defs>
      {(Object.keys(TEXTURA_DO_ESTADO) as EstadoDoGrafico[]).map((estado) => (
        <Pattern
          key={estado}
          id={`${prefixo}-${estado}`}
          patternUnits="userSpaceOnUse"
          width={LADO}
          height={LADO}
        >
          <Rect width={LADO} height={LADO} fill={corDoEstado[estado]} />
          {TEXTURA_DO_ESTADO[estado] === 'diagonal' ? (
            <Path
              d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6"
              stroke={traco}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          ) : null}
          {TEXTURA_DO_ESTADO[estado] === 'pontos' ? (
            <Circle cx={4} cy={4} r={1.6} fill={traco} fillOpacity={0.9} />
          ) : null}
          {TEXTURA_DO_ESTADO[estado] === 'grade' ? (
            <Path d="M0 4 H8 M4 0 V8" stroke={traco} strokeWidth={1.5} strokeOpacity={0.85} />
          ) : null}
        </Pattern>
      ))}
    </Defs>
  );
}

/**
 * Quadradinho da legenda com a cor e a textura do estado.
 *
 * @param props.estado - Estado a mostrar.
 * @param props.tamanho - Lado em pontos; 16 por padrão.
 */
export function AmostraDoEstado({
  estado,
  tamanho = 16,
}: {
  estado: EstadoDoGrafico;
  tamanho?: number;
}) {
  const prefixo = usePrefixoDePadroes();
  return (
    <Svg width={tamanho} height={tamanho} aria-hidden>
      <Padroes prefixo={prefixo} />
      <Rect
        width={tamanho}
        height={tamanho}
        rx={5}
        fill={usarPadrao(prefixo, estado)}
        stroke="none"
      />
    </Svg>
  );
}

/**
 * Camada que cobre o espaço do pai (que precisa de `position: relative` e `overflow: hidden`) com
 * a cor e a textura do estado. Usada nos trechos das barras empilhadas.
 */
export function CamadaDeTextura({ estado }: { estado: EstadoDoGrafico }) {
  const prefixo = usePrefixoDePadroes();
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }} aria-hidden>
      <Padroes prefixo={prefixo} />
      <Rect width="100%" height="100%" fill={usarPadrao(prefixo, estado)} />
    </Svg>
  );
}
