import type { AccountRepository, AuthRepository } from '../repositories/repositories';

/** Casos de uso da conta (RF09). */
export interface AccountService {
  /** Exclui todos os dados do dono: membros, doses, consentimento e, se houver, a conta de login. */
  deleteAccount(ownerId: string): Promise<void>;
}

/**
 * Cria os casos de uso da conta.
 *
 * @param accounts - Repositório da conta.
 * @param auth - Contas de login: quando informado, a conta e os tokens também são apagados.
 */
export function createAccountService(
  accounts: AccountRepository,
  auth?: Pick<AuthRepository, 'deleteAccount'>,
): AccountService {
  return {
    async deleteAccount(ownerId) {
      await accounts.deleteAll(ownerId);
      await auth?.deleteAccount(ownerId);
    },
  };
}
