import type { ConsentInput, ConsentResponse } from '@vacina/shared';
import type { Clock } from '../clock';
import type { ConsentRepository } from '../repositories/repositories';

/** Casos de uso do consentimento (RF09). */
export interface ConsentService {
  /** Consulta o consentimento do dono; sem registro, devolve "não aceito". */
  get(ownerId: string): Promise<ConsentResponse>;
  /** Registra o consentimento explícito, com a versão do termo e o horário. */
  accept(ownerId: string, input: ConsentInput): Promise<ConsentResponse>;
}

/** Dependências do serviço, injetadas para testar sem rede. */
export interface ConsentServiceDeps {
  readonly consents: ConsentRepository;
  readonly clock: Clock;
}

/**
 * Cria os casos de uso do consentimento.
 *
 * @param deps - Repositório e relógio.
 */
export function createConsentService({ consents, clock }: ConsentServiceDeps): ConsentService {
  const toResponse = (stored: Awaited<ReturnType<ConsentRepository['get']>>): ConsentResponse =>
    stored
      ? {
          accepted: true,
          termVersion: stored.termVersion,
          acceptedAt: stored.acceptedAt,
          guardianDeclaration: stored.guardianDeclaration,
        }
      : { accepted: false, termVersion: null, acceptedAt: null, guardianDeclaration: false };

  return {
    async get(ownerId) {
      return toResponse(await consents.get(ownerId));
    },

    async accept(ownerId, input) {
      const stored = {
        termVersion: input.termVersion,
        acceptedAt: clock(),
        guardianDeclaration: input.guardianDeclaration,
      };
      await consents.save(ownerId, stored);
      return toResponse(stored);
    },
  };
}
