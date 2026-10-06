import { createSessionId, loadSessionId, type TextStorage } from './session-id';

const fixedBytes = (value: number) => () => new Uint8Array(16).fill(value);

function memoryStorage(initial?: string): TextStorage & { saved: string | null } {
  const box = { saved: initial ?? null };
  return {
    getItem: () => box.saved,
    setItem: (_key, value) => {
      box.saved = value;
    },
    get saved() {
      return box.saved;
    },
  };
}

describe('sessão de demonstração', () => {
  test('CT-SES-01: cria 32 caracteres hexadecimais (aceitos pela API)', () => {
    const id = createSessionId(fixedBytes(171));
    expect(id).toBe('ab'.repeat(16));
    expect(id).toMatch(/^[a-z0-9-]{16,64}$/);
    expect(createSessionId()).toMatch(/^[0-9a-f]{32}$/);
  });

  test('CT-SES-02: cria e guarda uma sessão nova quando não há nenhuma', () => {
    const storage = memoryStorage();
    expect(loadSessionId(storage, fixedBytes(1))).toBe('01'.repeat(16));
    expect(storage.saved).toBe('01'.repeat(16));
  });

  test('CT-SES-03: reaproveita a sessão guardada', () => {
    const storage = memoryStorage('guardada-0123456789');
    expect(loadSessionId(storage, fixedBytes(1))).toBe('guardada-0123456789');
  });

  test('CT-SES-04: ignora uma sessão guardada com formato inválido', () => {
    const storage = memoryStorage('inválida!');
    expect(loadSessionId(storage, fixedBytes(2))).toBe('02'.repeat(16));
  });

  test('CT-SES-05: sem armazenamento, ou com ele bloqueado, o app segue funcionando', () => {
    expect(loadSessionId(undefined, fixedBytes(3))).toBe('03'.repeat(16));
    const blocked: TextStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(loadSessionId(blocked, fixedBytes(4))).toBe('04'.repeat(16));
  });
});
