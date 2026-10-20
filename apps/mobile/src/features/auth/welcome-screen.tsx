import { useAmbiente } from '../../lib/ambiente';
import { LandingWeb } from './landing-web';
import { WelcomeApp } from './welcome-app';

/**
 * Primeira tela do app. Tem um desenho para cada forma de uso (`lib/ambiente.ts`):
 *
 * - aplicativo instalado (Android, iOS ou site instalado): abertura enxuta, direta ao ponto
 *   (`WelcomeApp`);
 * - site no computador: página de apresentação completa (`LandingWeb`);
 * - site no celular ou em janela estreita: página compacta para o toque (`LandingWeb compacta`).
 */
export function WelcomeScreen() {
  const ambiente = useAmbiente();
  if (ambiente === 'app') return <WelcomeApp />;
  return <LandingWeb compacta={ambiente === 'web-pequena'} />;
}
