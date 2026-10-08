/** O que a API oficial acrescenta ao cadastro de uma unidade. */
export interface OfficialUnitInfo {
  readonly cnes: string;
  readonly phone: string | null;
  readonly shift: string | null;
  /** Número do endereço (o arquivo que acompanha a API traz só o logradouro). */
  readonly number: string | null;
  readonly updatedAt: string | null;
}

/** Cliente da API oficial de dados abertos do Ministério da Saúde (CNES). */
export interface OfficialUnitsClient {
  /**
   * Lista as unidades básicas de um município, como a API oficial as informa hoje.
   *
   * @param municipalityCode - Código IBGE de 6 dígitos.
   * @param signal - Para abortar a consulta por tempo.
   * @throws Error se a API oficial não responder ou responder fora do formato.
   */
  fetchMunicipality(municipalityCode: string, signal?: AbortSignal): Promise<OfficialUnitInfo[]>;
}

/** Cliente usado quando a API oficial não está disponível: sempre falha, e a API segue com o arquivo local. */
export const unavailableOfficialUnitsClient: OfficialUnitsClient = {
  fetchMunicipality: () => Promise.reject(new Error('API oficial indisponível.')),
};

/** Endereço padrão da API de dados abertos do Ministério da Saúde. */
export const OFFICIAL_API_BASE_URL = 'https://apidadosabertos.saude.gov.br';

/** A API oficial devolve no máximo 20 registros por página. */
const PAGE_SIZE = 20;
/** Tipos de unidade consultados: 2 = centro de saúde/unidade básica; 1 = posto de saúde. */
const UNIT_TYPES = [2, 1] as const;
/** Teto de páginas por tipo e município (600 unidades), para não prender a resposta. */
const MAX_PAGES = 30;

const SHIFTS: readonly [RegExp, string][] = [
  [/MANHA E A TARDE/, 'Manhã e tarde'],
  [/SOMENTE PELA MANHA/, 'Somente pela manhã'],
  [/SOMENTE A TARDE|SOMENTE PELA TARDE/, 'Somente à tarde'],
  [/24 ?H|SEMPRE ABERTO|PLANTAO/, '24 horas'],
  [/NOITE/, 'Com atendimento à noite'],
];

/**
 * Deixa o texto do turno legível; devolve `null` se não reconhecer, para nunca inventar horário.
 *
 * @param text - Texto do cadastro, por exemplo "ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE".
 */
export function describeShift(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const upper = text.toUpperCase();
  return SHIFTS.find(([pattern]) => pattern.test(upper))?.[1] ?? null;
}

/**
 * Limpa o telefone do cadastro: mantém só dígitos, parênteses, hífen, espaço e "+", e descarta o
 * que tem menos de 8 dígitos.
 *
 * @param text - Telefone como veio do cadastro.
 */
export function cleanPhone(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const clean = text.replace(/[^\d()+\- ]/g, '').trim();
  return clean.replace(/\D/g, '').length >= 8 ? clean : null;
}

function toInfo(raw: Record<string, unknown>): OfficialUnitInfo | null {
  const code = raw['codigo_cnes'];
  if (typeof code !== 'number' && typeof code !== 'string') return null;
  const number = raw['numero_estabelecimento'];
  const updated = raw['data_atualizacao'];
  return {
    cnes: String(code).padStart(7, '0'),
    phone: cleanPhone(raw['numero_telefone_estabelecimento']),
    shift: describeShift(raw['descricao_turno_atendimento']),
    number:
      typeof number === 'string' && /^[\dA-Za-z/-]{1,10}$/.test(number.trim())
        ? number.trim()
        : null,
    updatedAt:
      typeof updated === 'string' && /^\d{4}-\d{2}-\d{2}/.test(updated)
        ? updated.slice(0, 10)
        : null,
  };
}

/**
 * Cliente HTTP da API oficial (`GET /cnes/estabelecimentos` com `codigo_municipio` e
 * `codigo_tipo_unidade`). A API oficial não libera CORS, então só o servidor a consulta. Só o código
 * do município (e nunca a posição da pessoa) vai na consulta.
 *
 * @param options.fetchFn - `fetch` injetável, para testar sem rede.
 * @param options.baseUrl - Endereço da API; por padrão, o oficial.
 */
export function createOfficialUnitsClient(
  options: {
    fetchFn?: typeof fetch;
    baseUrl?: string;
  } = {},
): OfficialUnitsClient {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = (options.baseUrl ?? OFFICIAL_API_BASE_URL).replace(/\/+$/, '');

  async function page(
    municipality: string,
    type: number,
    offset: number,
    signal: AbortSignal | undefined,
  ): Promise<Record<string, unknown>[]> {
    const url = `${baseUrl}/cnes/estabelecimentos?codigo_municipio=${encodeURIComponent(
      municipality,
    )}&codigo_tipo_unidade=${type}&limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetchFn(url, {
      ...(signal ? { signal } : {}),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`API oficial respondeu ${response.status}.`);
    const body = (await response.json()) as { estabelecimentos?: unknown };
    if (!Array.isArray(body.estabelecimentos))
      throw new Error('API oficial em formato inesperado.');
    return body.estabelecimentos as Record<string, unknown>[];
  }

  return {
    async fetchMunicipality(municipalityCode, signal) {
      const found: OfficialUnitInfo[] = [];
      for (const type of UNIT_TYPES) {
        for (let n = 0; n < MAX_PAGES; n++) {
          const items = await page(municipalityCode, type, n * PAGE_SIZE, signal);
          for (const item of items) {
            const info = toInfo(item);
            if (info) found.push(info);
          }
          if (items.length < PAGE_SIZE) break;
        }
      }
      return found;
    },
  };
}
