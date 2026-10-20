import { NOW, OWNER } from '../test-support';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createProfilePhotoService } from '../services/profile-photo-service';
import { createInMemoryFileStorage, type FileStorage } from '../storage/file-storage';
import { createProfilePhotoHandlers } from './profile-photo';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');

function build(storage: FileStorage = createInMemoryFileStorage()) {
  return createProfilePhotoHandlers(
    createProfilePhotoService({ storage, limiter: createFixedWindowLimiter(() => NOW) }),
  );
}

describe('handlers da foto de perfil', () => {
  test('CT-FOTO-H01: sem foto responde 404; depois de PUT, GET devolve a foto sem cache', async () => {
    const handlers = build();
    expect((await handlers.get(OWNER)).status).toBe(404);
    expect(await handlers.put(OWNER, { contentType: 'image/jpeg', data: JPEG })).toEqual({
      status: 204,
    });
    const got = await handlers.get(OWNER);
    expect(got).toEqual({
      status: 200,
      jsonBody: { contentType: 'image/jpeg', data: JPEG },
      headers: { 'cache-control': 'private, no-store' },
    });
  });

  test.each([
    ['corpo ausente', undefined],
    ['formato fora da lista', { contentType: 'image/gif', data: JPEG }],
    ['não é base64', { contentType: 'image/jpeg', data: 'isto não é base64' }],
    ['campo a mais', { contentType: 'image/jpeg', data: JPEG, nome: 'x' }],
  ])('CT-FOTO-H02: PUT com %s responde 400', async (_nome, corpo) => {
    const result = await build().put(OWNER, corpo);
    expect(result.status).toBe(400);
    expect(result.jsonBody).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('CT-FOTO-H03: base64 válido de outro tipo de arquivo responde 415', async () => {
    const texto = Buffer.from('isto não é uma imagem').toString('base64');
    const result = await build().put(OWNER, { contentType: 'image/png', data: texto });
    expect(result.status).toBe(415);
    expect(result.jsonBody).toMatchObject({ code: 'INVALID_IMAGE' });
  });

  test('CT-FOTO-H04: DELETE responde 204 com ou sem foto', async () => {
    const handlers = build();
    expect((await handlers.remove(OWNER)).status).toBe(204);
    await handlers.put(OWNER, { contentType: 'image/jpeg', data: JPEG });
    expect((await handlers.remove(OWNER)).status).toBe(204);
    expect((await handlers.get(OWNER)).status).toBe(404);
  });

  test('CT-FOTO-H05: armazenamento fora do ar responde 503 com mensagem simples', async () => {
    const down: FileStorage = {
      put: () => Promise.reject(new Error('segredo interno')),
      get: () => Promise.reject(new Error('segredo interno')),
      remove: () => Promise.reject(new Error('segredo interno')),
    };
    const handlers = build(down);
    for (const result of [
      await handlers.get(OWNER),
      await handlers.put(OWNER, { contentType: 'image/jpeg', data: JPEG }),
      await handlers.remove(OWNER),
    ]) {
      expect(result.status).toBe(503);
      expect(JSON.stringify(result.jsonBody)).not.toContain('segredo');
    }
  });

  test('CT-FOTO-H06: excesso de trocas responde 429 com Retry-After', async () => {
    const handlers = build();
    for (let i = 0; i < 10; i += 1) {
      await handlers.put(OWNER, { contentType: 'image/jpeg', data: JPEG });
    }
    const result = await handlers.put(OWNER, { contentType: 'image/jpeg', data: JPEG });
    expect(result.status).toBe(429);
    expect(Number(result.headers?.['retry-after'])).toBeGreaterThan(0);
  });
});
