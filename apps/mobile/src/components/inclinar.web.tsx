import { useRef, type ReactNode } from 'react';
import { useMovimentoReduzido } from '../theme/theme-provider';

/**
 * Inclinação 3D que segue o mouse: o conteúdo gira em dois eixos, até `graus`, conforme a posição
 * do ponteiro sobre ele, e volta ao centro quando o mouse sai. Só vale na apresentação e em Entrar
 * (design system, "Movimento"); parado com "Reduzir movimento", com a preferência do sistema ou
 * no Alto contraste.
 *
 * @param props.graus - Inclinação máxima, em graus; 10 por padrão.
 */
export function Inclinar({ children, graus = 10 }: { children: ReactNode; graus?: number }) {
  const reduzido = useMovimentoReduzido();
  const alvo = useRef<HTMLDivElement>(null);
  if (reduzido) return <>{children}</>;

  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    const el = alvo.current;
    if (!el) return;
    const caixa = el.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width - 0.5;
    const y = (evento.clientY - caixa.top) / caixa.height - 0.5;
    el.style.transform = `rotateX(${(-y * graus * 2).toFixed(2)}deg) rotateY(${(x * graus * 2).toFixed(2)}deg)`;
  }

  function aoSair() {
    if (alvo.current) alvo.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  return (
    <div style={{ perspective: 900, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={alvo}
        onMouseMove={aoMover}
        onMouseLeave={aoSair}
        style={{
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </div>
  );
}
