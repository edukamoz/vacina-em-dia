import { Children, useRef, type CSSProperties, type ReactNode } from 'react';
import { Image } from 'react-native';
import { useMovimentoReduzido } from '../../theme/theme-provider';
import { FOTOS, FUNDO_DA_CENA } from './fotos';

/** Quanto cada camada anda com o mouse (px) e a profundidade dela (z, para o efeito 3D). */
const CAMADAS = {
  fundo: { x: -12, y: -8, z: 0 },
  jose: { x: 14, y: 8, z: 0 },
  mariana: { x: 26, y: 12, z: 0 },
  cartaoAlto: { x: 46, y: 30, z: 120 },
  cartaoBaixo: { x: 40, y: 26, z: 100 },
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
  if (!animar) return giro ? { transform: giro } : {};
  return {
    transform: `translate3d(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px), ${z}px) ${giro}`,
    transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  };
}

/** Proporção dos recortes das pessoas (largura/altura, 640 x 856). */
const PROPORCAO = '640 / 856';
const SOMBRA_DA_PESSOA = 'drop-shadow(0 20px 22px rgba(11, 45, 35, 0.32))';

/**
 * Cena do alto da apresentação na web: o fundo de vidro, duas pessoas fictícias recortadas, que
 * saem do fundo para a frente, e dois cartões de exemplo em camadas de profundidade diferentes.
 * Com o mouse sobre a cena, cada camada anda um pouco e o conjunto inclina em 3D; os cartões
 * também flutuam sozinhos, devagar. Tudo para com "Reduzir movimento" e no Alto contraste.
 *
 * @param props.cartoes - Dois cartões de exemplo de dose, posicionados sobre as pessoas.
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
    el.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
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
          aspectRatio: '1 / 0.98',
          transformStyle: 'preserve-3d',
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '16% 0 0 0',
            borderRadius: 36,
            overflow: 'hidden',
            boxShadow: '0 30px 60px rgba(11, 45, 35, 0.18)',
            ...camada(CAMADAS.fundo, '', animar),
          }}
        >
          <Image
            source={FUNDO_DA_CENA}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* As pessoas passam do alto do fundo, mas são cortadas rente à borda de baixo dele. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'inset(-30% -10% 0 -10% round 0 0 36px 36px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-1%',
              bottom: -24,
              width: '58%',
              aspectRatio: PROPORCAO,
              filter: SOMBRA_DA_PESSOA,
              ...camada(CAMADAS.jose, '', animar),
            }}
          >
            <Image
              source={FOTOS.jose.fonte}
              accessibilityLabel={FOTOS.jose.alt}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: '-4%',
              bottom: -24,
              width: '72%',
              aspectRatio: PROPORCAO,
              filter: SOMBRA_DA_PESSOA,
              ...camada(CAMADAS.mariana, '', animar),
            }}
          >
            <Image
              source={FOTOS.mariana.fonte}
              accessibilityLabel={FOTOS.mariana.alt}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '-3%',
            top: '2%',
            width: '52%',
            ...camada(CAMADAS.cartaoAlto, 'rotate(2deg)', animar),
          }}
        >
          <div style={flutua(0.8)}>{cartaoAlto}</div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '-3%',
            bottom: '4%',
            width: '50%',
            ...camada(CAMADAS.cartaoBaixo, 'rotate(-2deg)', animar),
          }}
        >
          <div style={flutua(2.2)}>{cartaoBaixo}</div>
        </div>
      </div>
    </div>
  );
}
