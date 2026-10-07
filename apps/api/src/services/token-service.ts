import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Clock } from '../clock';

/** Emissor gravado nos tokens de acesso. */
const ISSUER = 'vacina-em-dia';

/** Tamanho mínimo da chave de assinatura (caracteres). */
export const MIN_SECRET_LENGTH = 32;

/** Token de renovação recém-criado: o valor vai ao cliente, só o hash é guardado. */
export interface NewRefreshToken {
  readonly token: string;
  readonly hash: string;
}

/** Emissão e conferência de tokens (ADR-014). */
export interface TokenService {
  /** Gera o JWT de acesso da conta, com a validade em segundos. */
  signAccess(accountId: string): { readonly token: string; readonly expiresIn: number };
  /** Confere o JWT (assinatura, algoritmo, emissor e validade) e devolve o id da conta. */
  verifyAccess(token: string): string | undefined;
  /** Gera um token de renovação aleatório de 256 bits. */
  newRefreshToken(): NewRefreshToken;
  /** Calcula o hash (SHA-256) de um token de renovação, para guardar e procurar. */
  hashRefreshToken(token: string): string;
  /** Validade do token de renovação, em segundos. */
  readonly refreshTtlSeconds: number;
}

/** Configuração do serviço de tokens. */
export interface TokenServiceOptions {
  /** Chave HS256, com pelo menos {@link MIN_SECRET_LENGTH} caracteres. Vem do Key Vault. */
  readonly secret: string;
  readonly clock: Clock;
  /** Validade do token de acesso; por padrão 15 minutos. */
  readonly accessTtlSeconds?: number;
  /** Validade do token de renovação; por padrão 30 dias. */
  readonly refreshTtlSeconds?: number;
}

const b64 = (value: string | Buffer): string => Buffer.from(value).toString('base64url');

/**
 * Cria o serviço de tokens. O JWT usa só HS256 e a conferência recusa qualquer outro algoritmo
 * (inclusive `none`), assinatura alterada, emissor diferente ou token vencido.
 *
 * @param options - Chave, relógio e validades.
 * @throws Error se a chave for curta demais.
 */
export function createTokenService(options: TokenServiceOptions): TokenService {
  if (options.secret.length < MIN_SECRET_LENGTH) {
    throw new Error('A chave de assinatura é curta demais.');
  }
  const accessTtl = options.accessTtlSeconds ?? 15 * 60;
  const refreshTtl = options.refreshTtlSeconds ?? 30 * 24 * 60 * 60;
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const sign = (data: string): Buffer => createHmac('sha256', options.secret).update(data).digest();
  const nowSeconds = (): number => Math.floor(Date.parse(options.clock()) / 1000);

  return {
    refreshTtlSeconds: refreshTtl,
    signAccess(accountId) {
      const iat = nowSeconds();
      const payload = b64(
        JSON.stringify({ iss: ISSUER, sub: accountId, iat, exp: iat + accessTtl }),
      );
      const data = `${header}.${payload}`;
      return { token: `${data}.${b64(sign(data))}`, expiresIn: accessTtl };
    },
    verifyAccess(token) {
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;
      const [h, p, s] = parts as [string, string, string];
      if (h !== header) return undefined;
      const expected = sign(`${h}.${p}`);
      const given = Buffer.from(s, 'base64url');
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
      try {
        const claims: unknown = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
        if (typeof claims !== 'object' || claims === null) return undefined;
        const { iss, sub, exp } = claims as Record<string, unknown>;
        if (iss !== ISSUER || typeof sub !== 'string' || typeof exp !== 'number') return undefined;
        return exp > nowSeconds() ? sub : undefined;
      } catch {
        return undefined;
      }
    },
    newRefreshToken() {
      const token = randomBytes(32).toString('base64url');
      return { token, hash: this.hashRefreshToken(token) };
    },
    hashRefreshToken: (token) => createHash('sha256').update(token).digest('hex'),
  };
}
