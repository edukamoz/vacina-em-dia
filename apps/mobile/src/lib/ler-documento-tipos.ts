/** De onde vem a foto do documento. */
export type OrigemDoDocumento = 'camera' | 'galeria';

/**
 * Resultado de ler um documento: as linhas de texto, `cancelado`, `negado` (sem permissão) ou
 * `indisponivel` (o leitor de texto não existe neste aparelho ou neste build do app).
 */
export type DocumentoLido =
  | { readonly tipo: 'texto'; readonly linhas: readonly string[] }
  | { readonly tipo: 'cancelado' }
  | { readonly tipo: 'negado' }
  | { readonly tipo: 'indisponivel' };
