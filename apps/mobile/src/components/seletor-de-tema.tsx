import { useTheme } from '../theme/theme-provider';
import type { ThemePreference } from '../theme/resolve-theme';
import { THEME_LABELS, THEME_NAMES } from '../theme/tokens';
import { GrupoDeRadios, type OpcaoDeRadio } from './grupo-de-radios';

const OPCOES: readonly OpcaoDeRadio<ThemePreference>[] = [
  { valor: 'system', rotulo: 'Seguir o aparelho' },
  ...THEME_NAMES.map((valor) => ({ valor, rotulo: THEME_LABELS[valor] })),
];

/**
 * Escolha da aparência: seguir o aparelho, Claro, Escuro ou Alto contraste. A escolha do usuário
 * (não o tema resolvido) é a que aparece marcada.
 */
export function SeletorDeTema() {
  const { preference, setPreference } = useTheme();
  return (
    <GrupoDeRadios rotulo="Tema" valor={preference} opcoes={OPCOES} aoEscolher={setPreference} />
  );
}
