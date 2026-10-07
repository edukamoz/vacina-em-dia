import * as SecureStore from 'expo-secure-store';
import { parseStoredSession, SESSION_STORAGE_KEY, type SessionStore } from './auth-storage';

/**
 * Armazenamento da sessão no celular: `expo-secure-store` (Keychain no iOS e Keystore no Android),
 * como pede a ADR-009. Falhas do armazenamento não derrubam o app.
 */
export const sessionStore: SessionStore = {
  async load() {
    try {
      return parseStoredSession(await SecureStore.getItemAsync(SESSION_STORAGE_KEY));
    } catch {
      return null;
    }
  },
  async save(session) {
    try {
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Sem armazenamento seguro, a sessão vale só até fechar o app.
    }
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    } catch {
      // Nada a apagar.
    }
  },
};
