import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { HORAS_DE_AVISO, HORA_PADRAO_DO_AVISO } from '../../lib/avisos';

/** O que a pessoa escolheu sobre os avisos neste aparelho (não vai para o servidor). */
export interface PreferenciaDeAvisos {
  readonly ligado: boolean;
  readonly hora: number;
}

const CHAVE = 'avisos-no-aparelho:v1';
const PADRAO: PreferenciaDeAvisos = { ligado: false, hora: HORA_PADRAO_DO_AVISO };

let atual: PreferenciaDeAvisos = PADRAO;
let carregada = false;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Aceita só o que o app grava; qualquer outra coisa volta ao padrão (avisos desligados). */
function lerDoTexto(texto: string | null): PreferenciaDeAvisos {
  if (!texto) return PADRAO;
  try {
    const valor: unknown = JSON.parse(texto);
    if (typeof valor !== 'object' || valor === null) return PADRAO;
    const { ligado, hora } = valor as { ligado?: unknown; hora?: unknown };
    return {
      ligado: ligado === true,
      hora: (HORAS_DE_AVISO as readonly unknown[]).includes(hora)
        ? (hora as number)
        : HORA_PADRAO_DO_AVISO,
    };
  } catch {
    return PADRAO;
  }
}

/** Lê a preferência guardada no aparelho (uma vez) e avisa quem está acompanhando. */
export async function carregarPreferenciaDeAvisos(): Promise<PreferenciaDeAvisos> {
  if (carregada) return atual;
  try {
    atual = lerDoTexto(await AsyncStorage.getItem(CHAVE));
  } catch {
    atual = PADRAO;
  }
  carregada = true;
  avisar();
  return atual;
}

/**
 * Muda e guarda a preferência. Mesmo que o armazenamento falhe, a mudança vale até o aplicativo
 * fechar.
 *
 * @param mudanca - Só os campos que mudaram.
 */
export async function definirPreferenciaDeAvisos(
  mudanca: Partial<PreferenciaDeAvisos>,
): Promise<void> {
  atual = { ...atual, ...mudanca };
  carregada = true;
  avisar();
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // Sem armazenamento, a escolha vale só nesta abertura do aplicativo.
  }
}

/** Volta ao estado de fábrica (usado nos testes e ao sair da conta). */
export function reiniciarPreferenciaDeAvisos(): void {
  atual = PADRAO;
  carregada = false;
  avisar();
}

/**
 * Acompanha a preferência de avisos; carrega do aparelho na primeira vez.
 *
 * @returns A preferência e se já foi lida do armazenamento.
 */
export function usePreferenciaDeAvisos(): { preferencia: PreferenciaDeAvisos; pronta: boolean } {
  const preferencia = useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      if (!carregada) void carregarPreferenciaDeAvisos();
      return () => ouvintes.delete(ouvinte);
    },
    () => atual,
    () => PADRAO,
  );
  const pronta = useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => carregada,
    () => false,
  );
  return { preferencia, pronta };
}
