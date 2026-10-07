import { LegalScreen } from '../src/features/legal/legal-screen';
import { TERMOS_DE_USO } from '../src/features/legal/legal-content';

/** Termos de uso (rota pública). */
export default function Termos() {
  return <LegalScreen documento={TERMOS_DE_USO} />;
}
