import type { DoseRepository, StoredDose } from './dose-repository';

/**
 * Cria um repositório de doses que guarda tudo em memória (os dados voltam ao seed quando a API
 * reinicia). Copia o seed, para que alterá-lo depois não afete o repositório.
 *
 * @param seed - Doses iniciais, na ordem de exibição.
 */
export function createInMemoryDoseRepository(seed: readonly StoredDose[]): DoseRepository {
  const doses = new Map<string, StoredDose>(seed.map((dose) => [dose.id, dose]));
  return {
    list: async () => [...doses.values()],
    get: async (id) => doses.get(id),
    save: async (dose) => {
      doses.set(dose.id, dose);
    },
  };
}
