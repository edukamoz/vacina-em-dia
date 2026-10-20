import { BlobServiceClient } from '@azure/storage-blob';
import type { FileStorage } from './file-storage';

/**
 * Armazenamento de arquivos no Azure Blob Storage (contêiner privado: nada é público; a API é a
 * única porta de acesso). A conta é a mesma que as Functions já usam, então não há serviço novo.
 *
 * @param options.connectionString - Cadeia de conexão da conta (`AzureWebJobsStorage`; em
 *   desenvolvimento, a do Azurite).
 * @param options.container - Nome do contêiner; criado na primeira escrita se ainda não existir.
 */
export function createBlobFileStorage(options: {
  readonly connectionString: string;
  readonly container: string;
}): FileStorage {
  const service = BlobServiceClient.fromConnectionString(options.connectionString);
  const container = service.getContainerClient(options.container);
  let ready: Promise<unknown> | undefined;
  const ensureContainer = (): Promise<unknown> => {
    ready ??= container.createIfNotExists().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
    return ready;
  };

  return {
    async put(key, file) {
      await ensureContainer();
      await container.getBlockBlobClient(key).uploadData(file.bytes, {
        blobHTTPHeaders: {
          blobContentType: file.contentType,
          blobCacheControl: 'private, no-store',
        },
      });
    },
    async get(key) {
      const blob = container.getBlockBlobClient(key);
      try {
        const bytes = await blob.downloadToBuffer();
        const properties = await blob.getProperties();
        return {
          bytes: new Uint8Array(bytes),
          contentType: properties.contentType ?? 'application/octet-stream',
        };
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 404) return null;
        throw error;
      }
    },
    async remove(key) {
      await container.getBlockBlobClient(key).deleteIfExists();
    },
  };
}
