import { Children, useRef, type CSSProperties, type ReactNode } from 'react';
import { Image } from 'react-native';
import { useMovimentoReduzido } from '../../theme/theme-provider';
import { FOTOS, FUNDO_DA_CENA } from './fotos';

/** Quanto cada camada anda com o mouse (px) e a profundidade dela (z, para o efeito 3D). */
const CAMADAS = {
  fundo: { x: -10, y: -8, z: 0 },
  mariana: { x: 18, y: 14, z: 40 },
  jose: { x: 30, y: 22, z: 70 },
  cartaoAlto: { x: 44, y: 30, z: 110 },
  cartaoBaixo: { x: 38, y: 26, z: 90 },
} as const;

/**
 * Posição de uma camada: anda com `--px` e `--py` (de -1 a 1, o mouse sobre a cena) e vem à frente
 * em `z`. Sem movimento fica só inclinada, na posição de repouso.
 */
function camada(
  { x, y, z }: { x: number; y: number; z: number },
  giro: string,
  animar: boolean,
): CSSProperties {
  if (!animar) return { transform: giro };
  return {
    transform: `translate3d(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px), ${z}px) ${giro}`,
    transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  };
}

const MOLDURA: CSSProperties = {
  position: 'absolute',
  aspectRatio: '3 / 4',
  borderRadius: 24,
  border: '6px solid var(--cor-superficie)',
  boxShadow: '0 24px 48px rgba(11, 45, 35, 0.28)',
  overflow: 'hidden',
  background: 'var(--cor-superficieSuave)',
};

const FOTO = { width: '100%', height: '100%' } as const;

/**
 * Cena do alto da apresentação na web: o fundo de vidro, duas fotos de pessoas fictícias e dois
 * cartões de exemplo em camadas de profundidade diferentes. Com o mouse sobre a cena, cada camada
 * anda um pouco e o conjunto inclina em 3D; as fotos e os cartões também flutuam sozinhos, devagar.
 * Tudo para com "Reduzir movimento" e no Alto contraste.
 *
 * @param props.cartoes - Dois cartões de exemplo de dose, posicionados sobre as fotos.
 */
export function CenaDoHero({ cartoes }: { cartoes: ReactNode }) {
  const reduzido = useMovimentoReduzido();
  const alvo = useRef<HTMLDivElement>(null);
  const [cartaoAlto, cartaoBaixo] = Children.toArray(cartoes);
  const animar = !reduzido;

  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    const el = alvo.current;
    if (!el) return;
    const caixa = el.getBoundingClientRect();
    const x = ((evento.clientX - caixa.left) / caixa.width - 0.5) * 2;
    const y = ((evento.clientY - caixa.top) / caixa.height - 0.5) * 2;
    el.style.setProperty('--px', x.toFixed(3));
    el.style.setProperty('--py', y.toFixed(3));
    el.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
  }

  function aoSair() {
    const el = alvo.current;
    if (!el) return;
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    el.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  const flutua = (atraso: number): CSSProperties =>
    animar ? { animation: `cena-flutua 7s ease-in-out ${atraso}s infinite` } : {};

  return (
    <div
      style={{ perspective: 1100, width: '100%' }}
      onMouseMove={animar ? aoMover : undefined}
      onMouseLeave={animar ? aoSair : undefined}
    >
      <div
        ref={alvo}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 0.96',
          transformStyle: 'preserve-3d',
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 36,
            overflow: 'hidden',
            boxShadow: '0 30px 60px rgba(11, 45, 35, 0.18)',
            ...(animar ? camada(CAMADAS.fundo, '', true) : {}),
          }}
        >
          <Image
            source={FUNDO_DA_CENA}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div
          style={{
            ...MOLDURA,
            left: '5%',
            top: '7%',
            width: '47%',
            ...camada(CAMADAS.mariana, 'rotate(-3deg)', animar),
          }}
        >
          <div style={{ width: '100%', height: '100%', ...flutua(0) }}>
            <Image
              source={FOTOS.mariana.fonte}
              accessibilityLabel={FOTOS.mariana.alt}
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              style={FOTO}
            />
          </div>
        </div>
        <div
          style={{
            ...MOLDURA,
            right: '4%',
            bottom: '7%',
            width: '40%',
            ...camada(CAMADAS.jose, 'rotate(3deg)', animar),
          }}
        >
          <div style={{ width: '100%', height: '100%', ...flutua(1.6) }}>
            <Image
              source={FOTOS.jose.fonte}
              accessibilityLabel={FOTOS.jose.alt}
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              style={FOTO}
            />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: '-3%',
            top: '6%',
            width: '58%',
            ...camada(CAMADAS.cartaoAlto, 'rotate(2deg)', animar),
          }}
        >
          <div style={flutua(0.8)}>{cartaoAlto}</div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '-3%',
            bottom: '5%',
            width: '58%',
            ...camada(CAMADAS.cartaoBaixo, 'rotate(-2deg)', animar),
          }}
        >
          <div style={flutua(2.2)}>{cartaoBaixo}</div>
        </div>
      </div>
    </div>
  );
}
