import type { AuthRepository, StoredAccount, StoredRefreshToken } from './repositories';

/** Quantidade máxima de contas em memória; passou disso, o cadastro é recusado pelo serviço. */
export const MAX_ACCOUNTS = 10_000;

/**
 * Repositório de contas em memória. Os dados somem quando a API reinicia; o ADR-014 exige o Azure
 * SQL para valer em produção, e esta versão serve a testes e ao desenvolvimento.
 */
export function createInMemoryAuthRepository(): AuthRepository & { readonly size: () => number } {
  const byId = new Map<string, StoredAccount>();
  const byEmail = new Map<string, string>();
  const tokens = new Map<string, StoredRefreshToken>();

  return {
    size: () => byId.size,
    async createAccount(account) {
      if (byEmail.has(account.email)) return false;
      byId.set(account.id, account);
      byEmail.set(account.email, account.id);
      return true;
    },
    async findAccountByEmail(email) {
      const id = byEmail.get(email);
      return id === undefined ? undefined : byId.get(id);
    },
    findAccountById: async (id) => byId.get(id),
    async saveRefreshToken(token) {
      tokens.set(token.tokenHash, token);
    },
    findRefreshToken: async (tokenHash) => tokens.get(tokenHash),
    async revokeRefreshToken(tokenHash, at) {
      const token = tokens.get(tokenHash);
      if (token) tokens.set(tokenHash, { ...token, revokedAt: at });
    },
    async revokeAllRefreshTokens(accountId, at) {
      for (const [hash, token] of tokens) {
        if (token.accountId === accountId && !token.revokedAt) {
          tokens.set(hash, { ...token, revokedAt: at });
        }
      }
    },
    async deleteAccount(id) {
      const account = byId.get(id);
      if (account) byEmail.delete(account.email);
      byId.delete(id);
      for (const [hash, token] of tokens) if (token.accountId === id) tokens.delete(hash);
    },
  };
}
