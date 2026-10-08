import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tamanho do texto escolhido na Conta. */
export type TamanhoDoTexto = 'normal' | 'grande' | 'maior';

/** Tamanhos do texto, na ordem em que a pessoa os escolhe. */
export const TAMANHOS_DO_TEXTO: readonly TamanhoDoTexto[] = ['normal', 'grande', 'maior'];

/** Rótulos dos tamanhos exibidos na interface. */
export const ROTULOS_DO_TAMANHO: Readonly<Record<TamanhoDoTexto, string>> = {
  normal: 'Normal',
  grande: 'Grande',
  maior: 'Maior',
};

/** Quanto cada tamanho multiplica a fonte base do design system (18 dp). */
export const ESCALA_DO_TEXTO: Readonly<Record<TamanhoDoTexto, number>> = {
  normal: 1,
  grande: 1.15,
  maior: 1.3,
};

/** Preferências de aparência guardadas neste aparelho (não são dados pessoais). */
export interface Preferencias {
  readonly reduzirMovimento: boolean;
  readonly tamanhoDoTexto: TamanhoDoTexto;
}

/** Chave do armazenamento local. */
export const CHAVE_DE_PREFERENCIAS = 'vacina-em-dia:preferencias:v1';

/**
 * Lê as preferências guardadas. Qualquer falha ou valor inesperado vira "sem preferência": o app
 * nunca deixa de abrir por causa disso.
 */
export async function lerPreferencias(): Promise<Partial<Preferencias>> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_DE_PREFERENCIAS);
    if (!bruto) return {};
    const dado: unknown = JSON.parse(bruto);
    if (typeof dado !== 'object' || dado === null) return {};
    const { reduzirMovimento, tamanhoDoTexto } = dado as Record<string, unknown>;
    return {
      ...(typeof reduzirMovimento === 'boolean' ? { reduzirMovimento } : {}),
      ...(typeof tamanhoDoTexto === 'string' &&
      (TAMANHOS_DO_TEXTO as readonly string[]).includes(tamanhoDoTexto)
        ? { tamanhoDoTexto: tamanhoDoTexto as TamanhoDoTexto }
        : {}),
    };
  } catch {
    return {};
  }
}

/** Guarda as preferências; se o armazenamento falhar, a escolha vale só até fechar o app. */
export async function guardarPreferencias(preferencias: Preferencias): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_DE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // sem armazenamento: a preferência continua em memória
  }
}
