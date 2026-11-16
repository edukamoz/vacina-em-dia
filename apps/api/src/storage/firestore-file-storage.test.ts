import { createFirestoreClient } from '../repositories/firestore/firestore-client';
import { createFirestoreFileStorage } from './firestore-file-storage';

/** Roda só com o emulador do Firestore (`FIRESTORE_EMULATOR_HOST`), como o contrato dos repositórios. */
const run = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

run('armazenamento de arquivos no Firestore', () => {
  const db = createFirestoreClient('demo-vacina');
  const storage = createFirestoreFileStorage(db, `arquivos_${Date.now()}`);
  afterAll(() => db.terminate());

  test('CT-GCP-01: grava, lê e apaga, e a chave pode ter barras', async () => {
    const chave = 'fotos/conta-1';
    expect(await storage.get(chave)).toBeNull();
    await storage.put(chave, { bytes: new Uint8Array([1, 2, 3, 255]), contentType: 'image/png' });
    const lido = await storage.get(chave);
    expect(lido?.contentType).toBe('image/png');
    expect(Array.from(lido?.bytes ?? [])).toEqual([1, 2, 3, 255]);
    await storage.remove(chave);
    expect(await storage.get(chave)).toBeNull();
    await expect(storage.remove(chave)).resolves.toBeUndefined();
  });

  test('CT-GCP-02: gravar de novo substitui o arquivo', async () => {
    await storage.put('x', { bytes: new Uint8Array([1]), contentType: 'image/png' });
    await storage.put('x', { bytes: new Uint8Array([9, 9]), contentType: 'image/jpeg' });
    const lido = await storage.get('x');
    expect(lido?.contentType).toBe('image/jpeg');
    expect(Array.from(lido?.bytes ?? [])).toEqual([9, 9]);
  });
});
