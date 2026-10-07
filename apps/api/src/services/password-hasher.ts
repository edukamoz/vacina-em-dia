import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** Parâmetros do scrypt. Ficam gravados no hash, para poder aumentar o custo no futuro. */
export interface ScryptParams {
  /** Custo de CPU e memória (potência de 2). */
  readonly N: number;
  /** Tamanho do bloco. */
  readonly r: number;
  /** Paralelismo. */
  readonly p: number;
}

/** Custo inicial (ADR-014): ~32 MB por cálculo, compatível com a instância de 512 MB. */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 3 };

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const PREFIX = 'scrypt';

/** Geração e conferência de hashes de senha. A senha nunca é guardada nem registrada em log. */
export interface PasswordHasher {
  /** Gera o hash de uma senha, com sal aleatório. Formato: `scrypt$N$r$p$sal$hash` (base64url). */
  hash(password: string): Promise<string>;
  /** Confere uma senha contra um hash guardado, em tempo constante. Hash malformado dá `false`. */
  verify(password: string, stored: string): Promise<boolean>;
}

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_BYTES,
      { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.N * params.r * params.p },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

function parse(stored: string): { params: ScryptParams; salt: Buffer; key: Buffer } | undefined {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) return undefined;
  const [N, r, p] = [parts[1], parts[2], parts[3]].map((value) => Number(value));
  if (![N, r, p].every((value) => Number.isInteger(value) && (value as number) > 0)) {
    return undefined;
  }
  const salt = Buffer.from(parts[4] as string, 'base64url');
  const key = Buffer.from(parts[5] as string, 'base64url');
  if (salt.length === 0 || key.length !== KEY_BYTES) return undefined;
  return { params: { N: N as number, r: r as number, p: p as number }, salt, key };
}

/**
 * Cria o gerador de hashes com scrypt (`node:crypto`). A senha é normalizada (NFKC) antes do cálculo,
 * para que a mesma frase digitada em teclados diferentes dê o mesmo resultado.
 *
 * @param params - Custo do scrypt; os testes usam um custo baixo.
 */
export function createScryptHasher(params: ScryptParams = DEFAULT_SCRYPT_PARAMS): PasswordHasher {
  return {
    async hash(password) {
      const salt = randomBytes(SALT_BYTES);
      const key = await derive(password, salt, params);
      return [
        PREFIX,
        params.N,
        params.r,
        params.p,
        salt.toString('base64url'),
        key.toString('base64url'),
      ].join('$');
    },
    async verify(password, stored) {
      const parsed = parse(stored);
      if (!parsed) return false;
      try {
        const key = await derive(password, parsed.salt, parsed.params);
        return timingSafeEqual(key, parsed.key);
      } catch {
        return false;
      }
    },
  };
}
