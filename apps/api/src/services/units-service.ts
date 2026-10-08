import {
  boundingBox,
  distanceMeters,
  type HealthUnit,
  type NearbyUnitsQuery,
  type NearbyUnitsResponse,
} from '@vacina/shared';
import type { OfficialUnitInfo, OfficialUnitsClient } from '../clients/official-units-client';
import type { Clock } from '../clock';
import type { RateLimiter, RateRule } from './assistant-ports';
import type { RateLimitedError } from './errors';
import type { UnitRecord, UnitsDataset } from './units-dataset';

/** Aviso que acompanha toda resposta: a lista não diz quem tem sala de vacina. */
export const UNITS_NOTICE =
  'A lista traz unidades básicas de saúde do cadastro oficial (CNES). Nem todas têm sala de vacina: ligue antes de ir. O app não substitui a orientação de profissionais de saúde.';

/** Limite de buscas por pessoa: 60 a cada 10 minutos (ADR-010). */
const UNITS_RULES: readonly RateRule[] = [{ name: 'units-10min', limit: 60, windowSeconds: 600 }];

/** Quanto tempo as informações da API oficial de um município valem antes de nova consulta. */
const OFFICIAL_TTL_MS = 12 * 60 * 60 * 1000;
/** Tempo máximo esperando a API oficial; depois disso a resposta sai só com o arquivo local. */
const OFFICIAL_TIMEOUT_MS = 4000;
/** Quantos municípios, no máximo, são consultados na API oficial por busca. */
const MAX_MUNICIPALITIES = 3;

/** Resultado de uma busca: a resposta ou o limite de uso atingido. */
export type NearbyUnitsResult =
  | { readonly ok: true; readonly value: NearbyUnitsResponse }
  | { readonly ok: false; readonly error: RateLimitedError };

/** Casos de uso do mapa de postos de saúde (RF10). */
export interface UnitsService {
  /**
   * Unidades básicas de saúde perto de uma posição, da mais perto para a mais longe. Usa o arquivo
   * local (que funciona sempre) e, se a API oficial responder a tempo, acrescenta telefone, turno
   * e número do endereço. A posição não é guardada nem vai para o log.
   *
   * @param ownerId - Dono da sessão (só para o limite de uso).
   * @param query - Posição, raio e quantidade, já validados.
   */
  nearby(ownerId: string, query: NearbyUnitsQuery): Promise<NearbyUnitsResult>;
}

/** Dependências do serviço. */
export interface UnitsServiceDeps {
  readonly dataset: UnitsDataset;
  readonly official: OfficialUnitsClient;
  readonly limiter: RateLimiter;
  readonly clock: Clock;
  /** Tempo máximo de espera pela API oficial; padrão 4 s (injetável nos testes). */
  readonly officialTimeoutMs?: number;
  /** Chamada quando a API oficial falha: só o tipo do erro, nunca a posição. */
  readonly reportError?: (kind: string) => void;
}

interface CacheEntry {
  readonly at: number;
  readonly byCnes: ReadonlyMap<string, OfficialUnitInfo>;
}

/**
 * Cria o serviço do mapa de postos.
 *
 * @param deps - Arquivo local, cliente da API oficial, limitador e relógio.
 */
export function createUnitsService(deps: UnitsServiceDeps): UnitsService {
  const { dataset, official, limiter, clock } = deps;
  const timeoutMs = deps.officialTimeoutMs ?? OFFICIAL_TIMEOUT_MS;
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<CacheEntry>>();

  async function officialFor(municipality: string): Promise<CacheEntry> {
    const now = Date.parse(clock());
    const hit = cache.get(municipality);
    if (hit && now - hit.at < OFFICIAL_TTL_MS) return hit;
    const running = inFlight.get(municipality);
    if (running) return running;

    const request = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const infos = await official.fetchMunicipality(municipality, controller.signal);
        const entry: CacheEntry = {
          at: Date.parse(clock()),
          byCnes: new Map(infos.map((info) => [info.cnes, info])),
        };
        cache.set(municipality, entry);
        return entry;
      } finally {
        clearTimeout(timer);
        inFlight.delete(municipality);
      }
    })();
    inFlight.set(municipality, request);
    return request;
  }

  function toItem(
    unit: UnitRecord,
    distance: number,
    info: OfficialUnitInfo | undefined,
  ): HealthUnit {
    return {
      cnes: unit.cnes,
      name: unit.name,
      address: info?.number ? `${unit.address}, ${info.number}` : unit.address,
      neighborhood: unit.neighborhood,
      municipalityCode: unit.municipalityCode,
      latitude: unit.latitude,
      longitude: unit.longitude,
      distanceMeters: Math.round(distance),
      phone: info?.phone ?? null,
      shift: info?.shift ?? null,
      updatedAt: info?.updatedAt ?? null,
    };
  }

  return {
    async nearby(ownerId, query) {
      const decision = await limiter.consume(ownerId, UNITS_RULES);
      if (!decision.allowed) {
        return {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            scope: 'units',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
        };
      }

      const center = { latitude: query.lat, longitude: query.lon };
      const radiusMeters = query.radiusKm * 1000;
      const box = boundingBox(center, radiusMeters);
      const close: { unit: UnitRecord; distance: number }[] = [];
      for (const unit of dataset.units) {
        if (
          unit.latitude < box.minLat ||
          unit.latitude > box.maxLat ||
          unit.longitude < box.minLon ||
          unit.longitude > box.maxLon
        ) {
          continue;
        }
        const distance = distanceMeters(center, unit);
        if (distance <= radiusMeters) close.push({ unit, distance });
      }
      close.sort((a, b) => a.distance - b.distance);
      const chosen = close.slice(0, query.limit);

      const municipalities = [...new Set(chosen.map(({ unit }) => unit.municipalityCode))].slice(
        0,
        MAX_MUNICIPALITIES,
      );
      const settled = await Promise.allSettled(municipalities.map((code) => officialFor(code)));
      const infoByMunicipality = new Map<string, ReadonlyMap<string, OfficialUnitInfo>>();
      settled.forEach((result, index) => {
        const code = municipalities[index];
        if (code === undefined) return;
        if (result.status === 'fulfilled') infoByMunicipality.set(code, result.value.byCnes);
        else
          deps.reportError?.(result.reason instanceof Error ? result.reason.name : 'desconhecido');
      });

      return {
        ok: true,
        value: {
          items: chosen.map(({ unit, distance }) =>
            toItem(unit, distance, infoByMunicipality.get(unit.municipalityCode)?.get(unit.cnes)),
          ),
          source: {
            name: dataset.source.name,
            publisher: dataset.source.publisher,
            url: dataset.source.url,
            dataVersion: dataset.version,
            live: infoByMunicipality.size > 0,
          },
          notice: UNITS_NOTICE,
        },
      };
    },
  };
}
