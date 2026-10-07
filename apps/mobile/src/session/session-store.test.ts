import * as SecureStore from 'expo-secure-store';
import { parseStoredSession, SESSION_STORAGE_KEY, type StoredSession } from './auth-storage';
import { sessionStore as nativeStore } from './session-store';
import { sessionStore as webStore } from './session-store.web';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const SESSION: StoredSession = {
  accessToken: 'acesso',
  refreshToken: 'renovacao',
  expiresAt: 1_790_000_000_000,
  account: { id: 'conta-1', email: 'mariana@exemplo.com.br' },
};
const secure = jest.mocked(SecureStore);

describe('leitura da sessão guardada', () => {
  test('CT-SES-30: lê uma sessão válida', () => {
    expect(parseStoredSession(JSON.stringify(SESSION))).toEqual(SESSION);
  });

  test.each([
    null,
    '',
    'não é json',
    '{}',
    '[]',
    JSON.stringify({ ...SESSION, accessToken: '' }),
    JSON.stringify({ ...SESSION, expiresAt: 'amanhã' }),
    JSON.stringify({ ...SESSION, account: { id: 1 } }),
  ])('CT-SES-31: recusa %p', (raw) => {
    expect(parseStoredSession(raw)).toBeNull();
  });
});

describe('armazenamento seguro (celular)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CT-SES-32: guarda, lê e apaga pela chave certa', async () => {
    secure.getItemAsync.mockResolvedValue(JSON.stringify(SESSION));
    await nativeStore.save(SESSION);
    expect(secure.setItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    expect(await nativeStore.load()).toEqual(SESSION);
    await nativeStore.clear();
    expect(secure.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  test('CT-SES-33: falhas do armazenamento seguro não derrubam o app', async () => {
    secure.getItemAsync.mockRejectedValue(new Error('x'));
    secure.setItemAsync.mockRejectedValue(new Error('x'));
    secure.deleteItemAsync.mockRejectedValue(new Error('x'));
    expect(await nativeStore.load()).toBeNull();
    await expect(nativeStore.save(SESSION)).resolves.toBeUndefined();
    await expect(nativeStore.clear()).resolves.toBeUndefined();
  });

  test('CT-SES-34: valor corrompido vira "sem sessão"', async () => {
    secure.getItemAsync.mockResolvedValue('{corrompido');
    expect(await nativeStore.load()).toBeNull();
  });
});

describe('armazenamento da web (sessionStorage)', () => {
  const g = globalThis as unknown as { sessionStorage?: unknown };
  const original = g.sessionStorage;
  afterEach(() => {
    g.sessionStorage = original;
  });

  function fakeStorage() {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  }

  test('CT-SES-35: guarda, lê e apaga a sessão', async () => {
    const storage = fakeStorage();
    g.sessionStorage = storage;
    await webStore.save(SESSION);
    expect(JSON.parse(storage.data.get(SESSION_STORAGE_KEY) as string)).toEqual(SESSION);
    expect(await webStore.load()).toEqual(SESSION);
    await webStore.clear();
    expect(await webStore.load()).toBeNull();
  });

  test('CT-SES-36: sem sessionStorage, o app segue sem guardar nada', async () => {
    g.sessionStorage = undefined;
    expect(await webStore.load()).toBeNull();
    await expect(webStore.save(SESSION)).resolves.toBeUndefined();
    await expect(webStore.clear()).resolves.toBeUndefined();
  });

  test('CT-SES-37: sessionStorage bloqueado (janela privada) não derruba o app', async () => {
    const blocked = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    g.sessionStorage = blocked;
    expect(await webStore.load()).toBeNull();
    await expect(webStore.save(SESSION)).resolves.toBeUndefined();
    await expect(webStore.clear()).resolves.toBeUndefined();
  });

  test('CT-SES-38: acessar o sessionStorage lançando erro (propriedade bloqueada) também é seguro', async () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(await webStore.load()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});
