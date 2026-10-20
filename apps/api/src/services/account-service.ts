import type { AccountRepository, AuthRepository } from '../repositories/repositories';
import type { ProfilePhotoService } from './profile-photo-service';

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
 * @param photos - Foto de perfil: quando informada, o arquivo também é apagado. Se o armazenamento
 *   falhar, a exclusão falha (HTTP 500) para a pessoa tentar de novo, em vez de deixar a foto.
 */
export function createAccountService(
  accounts: AccountRepository,
  auth?: Pick<AuthRepository, 'deleteAccount'>,
  photos?: Pick<ProfilePhotoService, 'remove'>,
): AccountService {
  return {
    async deleteAccount(ownerId) {
      if (photos) {
        const removed = await photos.remove(ownerId);
        if (!removed.ok) throw new Error('Não foi possível apagar a foto de perfil.');
      }
      await accounts.deleteAll(ownerId);
      await auth?.deleteAccount(ownerId);
    },
  };
}
