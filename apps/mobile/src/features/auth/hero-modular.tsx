import { CenaDoHero } from './cena-do-hero';

/**
 * Mosaico do alto da apresentação no Android e no iOS: a cena estática com as duas pessoas
 * fictícias. As peças com animação ao passar o mouse existem só na web (`hero-modular.web.tsx`).
 *
 * @param props.compacto - Ignorado aqui; existe para manter a mesma assinatura da versão da web.
 */
export function HeroModular({ compacto }: { compacto: boolean }) {
  void compacto;
  return <CenaDoHero cartoes={null} />;
}
