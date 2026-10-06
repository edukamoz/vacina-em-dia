import type { HttpResult } from '../http';
import type { AccountService } from '../services/account-service';

/** Handlers HTTP da conta (RF09). */
export interface AccountHandlers {
  /** `DELETE /api/account`: exclui a conta e todos os dados. */
  deleteAccount(ownerId: string): Promise<HttpResult>;
}

/**
 * Cria os handlers da conta.
 *
 * @param service - Casos de uso da conta.
 */
export function createAccountHandlers(service: AccountService): AccountHandlers {
  return {
    async deleteAccount(ownerId) {
      await service.deleteAccount(ownerId);
      return { status: 204 };
    },
  };
}
