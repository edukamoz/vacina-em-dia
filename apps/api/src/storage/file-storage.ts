/** Arquivo guardado: os bytes e o tipo de conteúdo. */
export interface StoredFile {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

/**
 * Porta de armazenamento de arquivos. A API só conhece esta interface; em produção ela é o Azure
 * Blob Storage (`createBlobFileStorage`) e, em testes e no desenvolvimento sem armazenamento, a
 * versão em memória. Falhas de rede viram exceção, que o serviço traduz para `STORAGE_UNAVAILABLE`.
 */
export interface FileStorage {
  /** Grava (ou substitui) o arquivo da chave. */
  put(key: string, file: StoredFile): Promise<void>;
  /** Lê o arquivo da chave, ou `null` se não existir. */
  get(key: string): Promise<StoredFile | null>;
  /** Apaga o arquivo da chave; não falha se ele não existir. */
  remove(key: string): Promise<void>;
}

/** Armazenamento em memória (desenvolvimento sem armazenamento e testes). */
export function createInMemoryFileStorage(): FileStorage & { readonly size: () => number } {
  const files = new Map<string, StoredFile>();
  return {
    async put(key, file) {
      files.set(key, { bytes: new Uint8Array(file.bytes), contentType: file.contentType });
    },
    async get(key) {
      return files.get(key) ?? null;
    },
    async remove(key) {
      files.delete(key);
    },
    size: () => files.size,
  };
}
