import { LegalScreen } from '../src/features/legal/legal-screen';
import { POLITICA_DE_PRIVACIDADE } from '../src/features/legal/legal-content';

/** Política de privacidade (rota pública). */
export default function Privacidade() {
  return <LegalScreen documento={POLITICA_DE_PRIVACIDADE} />;
}
