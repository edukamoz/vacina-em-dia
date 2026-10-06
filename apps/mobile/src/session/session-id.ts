const STORAGE_KEY = 'vacina-em-dia:sessao-demo';
const SESSION_PATTERN = /^[a-z0-9-]{16,64}$/;

/** Sorteio de bytes injetável, para testar sem aleatoriedade. */
export type RandomBytes = (length: number) => Uint8Array;

const defaultRandomBytes: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

/**
 * Cria um identificador de sessão de demonstração (32 caracteres hexadecimais).
 *
 * **Provisório:** só separa os dados de um navegador dos de outro enquanto o login real do
 * Microsoft Entra External ID não existe (SCRUM-13). Não é uma credencial.
 *
 * @param randomBytes - Fonte de bytes aleatórios (por padrão, a do sistema).
 */
export function createSessionId(randomBytes: RandomBytes = defaultRandomBytes): string {
  return Array.from(randomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Armazenamento simples de texto (por exemplo, o `localStorage` do navegador). */
export interface TextStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Recupera a sessão guardada no navegador ou cria uma nova e a guarda. No celular, onde não há
 * `localStorage`, a sessão vale só enquanto o app está aberto. Todo acesso ao armazenamento é
 * protegido: ele pode estar bloqueado (janela privada) sem que o app deixe de funcionar.
 *
 * @param storage - Armazenamento, se existir.
 * @param randomBytes - Fonte de bytes aleatórios.
 */
export function loadSessionId(
  storage: TextStorage | undefined,
  randomBytes: RandomBytes = defaultRandomBytes,
): string {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved && SESSION_PATTERN.test(saved)) return saved;
  } catch {
    // Armazenamento bloqueado: segue com uma sessão nova.
  }
  const created = createSessionId(randomBytes);
  try {
    storage?.setItem(STORAGE_KEY, created);
  } catch {
    // Sem armazenamento, a sessão vale só até fechar o app.
  }
  return created;
}
