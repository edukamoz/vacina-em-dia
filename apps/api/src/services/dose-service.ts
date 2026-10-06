import {
  transitionDose,
  type DoseEventInput,
  type DoseListResponse,
  type TransitionError,
} from '@vacina/shared';
import { civilToday, type Clock } from '../clock';
import type { DoseRepository, StoredDose } from '../repositories/dose-repository';

/** Dose não encontrada. */
export interface NotFoundError {
  readonly code: 'NOT_FOUND';
}

/** Erros possíveis de um caso de uso de dose. */
export type DoseServiceError = NotFoundError | TransitionError;

/** Resultado de um caso de uso: a dose ou um erro de domínio, nunca uma exceção. */
export type DoseServiceResult =
  | { readonly ok: true; readonly dose: StoredDose }
  | { readonly ok: false; readonly error: DoseServiceError };

/** Casos de uso de dose. */
export interface DoseService {
  /** Lista as doses com a fonte e a versão do calendário. */
  listDoses(): Promise<DoseListResponse>;
  /** Busca uma dose. */
  getDose(id: string): Promise<DoseServiceResult>;
  /** Aplica um evento do usuário pela máquina de estados e grava o resultado. */
  applyEvent(id: string, event: DoseEventInput): Promise<DoseServiceResult>;
}

/** Dependências do serviço, todas injetadas para testar sem rede. */
export interface DoseServiceDeps {
  readonly repository: DoseRepository;
  readonly clock: Clock;
  readonly source: DoseListResponse['source'];
}

/**
 * Cria os casos de uso de dose. As regras de transição vivem no domínio (`@vacina/shared`); aqui só
 * se busca a dose, descobre o "hoje" pelo relógio injetado e grava o novo estado.
 *
 * @param deps - Repositório, relógio e fonte do calendário.
 */
export function createDoseService({ repository, clock, source }: DoseServiceDeps): DoseService {
  return {
    async listDoses() {
      return { source, items: [...(await repository.list())] };
    },

    async getDose(id) {
      const dose = await repository.get(id);
      return dose ? { ok: true, dose } : { ok: false, error: { code: 'NOT_FOUND' } };
    },

    async applyEvent(id, event) {
      const current = await repository.get(id);
      if (!current) return { ok: false, error: { code: 'NOT_FOUND' } };

      const result = transitionDose(current, event, { today: civilToday(clock), actor: 'USER' });
      if (!result.ok) return { ok: false, error: result.error };

      const updated: StoredDose = { ...current, ...result.dose };
      await repository.save(updated);
      return { ok: true, dose: updated };
    },
  };
}
