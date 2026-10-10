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

/**
 * Como o movimento (animações e efeitos de profundidade) é tratado: `animar` anima sempre, mesmo
 * que o aparelho peça menos movimento; `reduzir` deixa tudo parado; `sistema` segue o aparelho.
 * O tema Alto contraste sempre deixa parado, seja qual for a escolha.
 */
export type ModoDeMovimento = 'animar' | 'reduzir' | 'sistema';

/** Modos de movimento, na ordem em que a pessoa os escolhe. */
export const MODOS_DE_MOVIMENTO: readonly ModoDeMovimento[] = ['animar', 'sistema', 'reduzir'];

/** Rótulos dos modos de movimento exibidos na interface. */
export const ROTULOS_DO_MOVIMENTO: Readonly<Record<ModoDeMovimento, string>> = {
  animar: 'Animar sempre',
  sistema: 'Seguir o aparelho',
  reduzir: 'Reduzir movimento',
};

/** Modo de movimento de quem ainda não escolheu. */
export const MOVIMENTO_PADRAO: ModoDeMovimento = 'animar';

/** Preferências de aparência guardadas neste aparelho (não são dados pessoais). */
export interface Preferencias {
  readonly movimento: ModoDeMovimento;
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
    const { movimento, reduzirMovimento, tamanhoDoTexto } = dado as Record<string, unknown>;
    // `reduzirMovimento` (booleano) é o formato da primeira versão; vale só se `movimento` faltar.
    const modo =
      typeof movimento === 'string' && (MODOS_DE_MOVIMENTO as readonly string[]).includes(movimento)
        ? (movimento as ModoDeMovimento)
        : typeof reduzirMovimento === 'boolean'
          ? reduzirMovimento
            ? 'reduzir'
            : 'animar'
          : undefined;
    return {
      ...(modo ? { movimento: modo } : {}),
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
