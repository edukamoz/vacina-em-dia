import AsyncStorage from '@react-native-async-storage/async-storage';
import { nearbyUnitsResponseSchema, type NearbyUnitsResponse } from '@vacina/shared';

const KEY = 'vacina-em-dia:postos:v1';

/** Última lista de unidades recebida, guardada no aparelho para funcionar sem internet. */
export interface UnitsCache {
  /** Quando a lista foi recebida (ISO 8601). */
  readonly savedAt: string;
  readonly response: NearbyUnitsResponse;
}

/**
 * Lê a lista guardada. Devolve `null` se não há nada, se está corrompida ou se o armazenamento
 * falhou: o cache nunca é motivo de erro para a pessoa. Não guarda a posição, só as unidades.
 */
export async function loadUnitsCache(): Promise<UnitsCache | null> {
  try {
    const text = await AsyncStorage.getItem(KEY);
    if (!text) return null;
    const parsed = JSON.parse(text) as { savedAt?: unknown; response?: unknown };
    const response = nearbyUnitsResponseSchema.safeParse(parsed.response);
    if (!response.success || typeof parsed.savedAt !== 'string') return null;
    return { savedAt: parsed.savedAt, response: response.data };
  } catch {
    return null;
  }
}

/** Guarda a lista recebida; falha de armazenamento é ignorada. */
export async function saveUnitsCache(cache: UnitsCache): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Sem espaço ou sem permissão: o app segue funcionando só com a rede.
  }
}

/** Apaga a lista guardada (ao sair da conta ou excluí-la). */
export async function clearUnitsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nada a fazer.
  }
}
