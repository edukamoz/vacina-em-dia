import type { AccountRepository } from '../repositories/repositories';

/** Casos de uso da conta (RF09). */
export interface AccountService {
  /** Exclui todos os dados do dono: membros, doses e consentimento. */
  deleteAccount(ownerId: string): Promise<void>;
}

/**
 * Cria os casos de uso da conta.
 *
 * @param accounts - Repositório da conta.
 */
export function createAccountService(accounts: AccountRepository): AccountService {
  return {
    async deleteAccount(ownerId) {
      await accounts.deleteAll(ownerId);
    },
  };
}
