import type { EstadoDoGrafico } from '../../lib/estatisticas';
import { useThemeColors } from '../../theme/theme-provider';

/** Cor de cada estado: as mesmas do selo da dose, para o gráfico e a lista dizerem a mesma coisa. */
export function useCoresDosEstados(): Readonly<Record<EstadoDoGrafico, string>> {
  const cores = useThemeColors();
  return {
    APPLIED: cores.aplicada,
    SCHEDULED: cores.agendada,
    PENDING: cores.pendente,
    OVERDUE: cores.atrasada,
  };
}
