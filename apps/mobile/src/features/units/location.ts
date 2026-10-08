import * as Location from 'expo-location';
import type { GeoPoint } from '@vacina/shared';

/** Motivo de não ter conseguido a posição. */
export type LocationErrorKind = 'DENIED' | 'UNAVAILABLE';

/** Falha ao obter a posição, com mensagem em linguagem simples. */
export class LocationError extends Error {
  constructor(readonly kind: LocationErrorKind) {
    super(
      kind === 'DENIED'
        ? 'Sem a permissão de localização não conseguimos achar os postos perto de você. Você pode liberar nas configurações do aparelho ou do navegador.'
        : 'Não foi possível saber onde você está agora. Confira se a localização do aparelho está ligada e tente de novo.',
    );
    this.name = 'LocationError';
  }
}

/**
 * Pede a permissão de localização "durante o uso" e lê a posição atual, uma única vez. A posição
 * não é guardada em lugar nenhum pelo app.
 *
 * @throws LocationError `DENIED` se a pessoa negou; `UNAVAILABLE` se o aparelho não conseguiu.
 */
export async function getCurrentPosition(): Promise<GeoPoint> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new LocationError('DENIED');
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    throw new LocationError('UNAVAILABLE');
  }
}
