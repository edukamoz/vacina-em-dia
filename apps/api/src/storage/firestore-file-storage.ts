import type { Firestore } from '@google-cloud/firestore';
import type { FileStorage } from './file-storage';

/**
 * Armazenamento de arquivos no Firestore (plano de contingência no Google Cloud, ADR-035). Serve às
 * fotos de perfil, que a API limita a 256 KB (o documento do Firestore aceita até 1 MiB), então não
 * é preciso outro serviço. Nada é público: a API é a única porta de acesso.
 *
 * @param db - Cliente do Firestore.
 * @param collection - Coleção onde os arquivos ficam.
 */
export function createFirestoreFileStorage(db: Firestore, collection = 'files'): FileStorage {
  // A chave pode ter "/" ou outros caracteres; o identificador do documento não pode.
  const doc = (key: string) => db.collection(collection).doc(encodeURIComponent(key));
  return {
    async put(key, file) {
      await doc(key).set({ bytes: Buffer.from(file.bytes), contentType: file.contentType });
    },
    async get(key) {
      const found = await doc(key).get();
      if (!found.exists) return null;
      const data = found.data() as { bytes: Uint8Array; contentType: string };
      return { bytes: new Uint8Array(data.bytes), contentType: data.contentType };
    },
    async remove(key) {
      await doc(key).delete();
    },
  };
}
