import { parseStoredSession, SESSION_STORAGE_KEY, type SessionStore } from './auth-storage';

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Armazenamento da sessão na web: `sessionStorage` (some ao fechar a aba), como pede a ADR-009,
 * com a política de segurança de conteúdo (CSP) como defesa contra scripts de terceiros. Se o
 * navegador bloquear o armazenamento, a sessão vale só até recarregar a página.
 */
export const sessionStore: SessionStore = {
  async load() {
    try {
      return parseStoredSession(storage()?.getItem(SESSION_STORAGE_KEY) ?? null);
    } catch {
      return null;
    }
  },
  async save(session) {
    try {
      storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Armazenamento bloqueado: segue só em memória.
    }
  },
  async clear() {
    try {
      storage()?.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Nada a apagar.
    }
  },
};
