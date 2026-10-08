import {
  distanceMeters,
  type GeoPoint,
  type HealthUnit,
  type NearbyUnitsResponse,
} from '@vacina/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError } from '../../api/client';
import { endpoints } from '../../api/endpoints';
import { useSession } from '../../session/session-provider';
import { getCurrentPosition, LocationError } from './location';
import { loadUnitsCache, saveUnitsCache } from './units-cache';

/** Raio e quantidade pedidos à API. */
const RADIUS_KM = 10;
const LIMIT = 20;

/** Etapa em que a busca está. */
export type UnitsPhase = 'idle' | 'locating' | 'loading' | 'ready' | 'error';

/** O que a tela de postos precisa. */
export interface UnitsState {
  /** Unidades, da mais perto para a mais longe da posição atual (ou da última busca). */
  readonly items: readonly HealthUnit[];
  readonly position: GeoPoint | null;
  readonly source: NearbyUnitsResponse['source'] | null;
  readonly notice: string | null;
  /** Quando a lista foi recebida da API (ISO 8601); `null` se ainda não há lista. */
  readonly receivedAt: string | null;
  readonly phase: UnitsPhase;
  readonly error: string | null;
  /** Verdadeiro quando a última tentativa falhou por falta de internet e a lista é a guardada. */
  readonly offline: boolean;
  /** Pede a localização e busca os postos perto da pessoa. */
  readonly locate: () => Promise<void>;
}

/**
 * Estado do mapa de postos (RF10), com a lista guardada no aparelho (offline primeiro): ao abrir,
 * mostra na hora a última lista recebida; ao tocar em localizar, pede a posição, busca na API e
 * guarda a lista nova. Sem internet, mantém a lista guardada reordenada pela posição atual. A
 * posição fica só na memória desta tela; nunca é guardada.
 */
export function useUnits(): UnitsState {
  const { api } = useSession();
  const [response, setResponse] = useState<NearbyUnitsResponse | null>(null);
  const [receivedAt, setReceivedAt] = useState<string | null>(null);
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [phase, setPhase] = useState<UnitsPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    void loadUnitsCache().then((cache) => {
      if (!active || !cache) return;
      setResponse((atual) => atual ?? cache.response);
      setReceivedAt((atual) => atual ?? cache.savedAt);
    });
    return () => {
      active = false;
    };
  }, []);

  const locate = useCallback(async () => {
    setError(null);
    setOffline(false);
    setPhase('locating');
    let here: GeoPoint;
    try {
      here = await getCurrentPosition();
    } catch (failure) {
      setError(
        failure instanceof LocationError
          ? failure.message
          : new LocationError('UNAVAILABLE').message,
      );
      setPhase('error');
      return;
    }
    setPosition(here);
    setPhase('loading');
    try {
      const fresh = await endpoints.getNearbyUnits(api, {
        lat: here.latitude,
        lon: here.longitude,
        radiusKm: RADIUS_KM,
        limit: LIMIT,
      });
      const now = new Date().toISOString();
      setResponse(fresh);
      setReceivedAt(now);
      setPhase('ready');
      void saveUnitsCache({ savedAt: now, response: fresh });
    } catch (failure) {
      const network = failure instanceof ApiRequestError && failure.kind === 'network';
      if (network && response) {
        setOffline(true);
        setPhase('ready');
        return;
      }
      setError(
        failure instanceof ApiRequestError
          ? network
            ? 'Sem internet e nenhuma lista salva neste aparelho. Conecte-se e tente de novo.'
            : failure.message
          : 'Não foi possível buscar os postos agora. Tente de novo.',
      );
      setPhase('error');
    }
  }, [api, response]);

  const items = useMemo(() => {
    const list = response?.items ?? [];
    if (!position) return list;
    return list
      .map((unit) => ({ ...unit, distanceMeters: Math.round(distanceMeters(position, unit)) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [response, position]);

  return {
    items,
    position,
    source: response?.source ?? null,
    notice: response?.notice ?? null,
    receivedAt,
    phase,
    error,
    offline,
    locate,
  };
}
