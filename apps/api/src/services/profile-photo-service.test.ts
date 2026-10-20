import { PROFILE_PHOTO_MAX_BYTES } from '@vacina/shared';
import { NOW, OTHER_OWNER, OWNER } from '../test-support';
import { createInMemoryStore } from '../repositories/in-memory-store';
import { createInMemoryFileStorage, type FileStorage } from '../storage/file-storage';
import { createAccountService } from './account-service';
import {
  createProfilePhotoService,
  matchesDeclaredType,
  type ProfilePhotoService,
} from './profile-photo-service';
import { createFixedWindowLimiter } from './rate-limiter';

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

const b64 = (bytes: readonly number[]) => Buffer.from(bytes).toString('base64');

function build(storage: FileStorage = createInMemoryFileStorage()) {
  const reported: string[] = [];
  const service = createProfilePhotoService({
    storage,
    limiter: createFixedWindowLimiter(() => NOW),
    reportError: (kind) => reported.push(kind),
  });
  return { service, storage, reported };
}

const failingStorage: FileStorage = {
  put: () => Promise.reject(new Error('rede')),
  get: () => Promise.reject(new Error('rede')),
  remove: () => Promise.reject(new Error('rede')),
};

describe('matchesDeclaredType', () => {
  test.each([
    ['image/jpeg', JPEG, true],
    ['image/png', PNG, true],
    ['image/webp', WEBP, true],
    ['image/jpeg', PNG, false],
    ['image/png', JPEG, false],
    ['image/webp', JPEG, false],
    ['image/gif', JPEG, false],
    ['image/jpeg', [], false],
  ] as const)('CT-FOTO-01: %s com cabeçalho de %#', (tipo, bytes, esperado) => {
    expect(matchesDeclaredType(new Uint8Array(bytes), tipo)).toBe(esperado);
  });
});

describe('ProfilePhotoService', () => {
  test.each([
    ['image/jpeg', JPEG],
    ['image/png', PNG],
    ['image/webp', WEBP],
  ] as const)('CT-FOTO-02: guarda e devolve uma foto %s', async (contentType, bytes) => {
    const { service } = build();
    expect(await service.put(OWNER, { contentType, data: b64(bytes) })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await service.get(OWNER)).toEqual({
      ok: true,
      value: { contentType, data: b64(bytes) },
    });
  });

  test('CT-FOTO-03: trocar a foto substitui a anterior', async () => {
    const { service, storage } = build();
    await service.put(OWNER, { contentType: 'image/jpeg', data: b64(JPEG) });
    await service.put(OWNER, { contentType: 'image/png', data: b64(PNG) });
    const got = await service.get(OWNER);
    expect(got.ok && got.value.contentType).toBe('image/png');
    expect((storage as ReturnType<typeof createInMemoryFileStorage>).size()).toBe(1);
  });

  test('CT-FOTO-04: sem foto, get responde NOT_FOUND', async () => {
    const { service } = build();
    expect(await service.get(OWNER)).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  test('CT-FOTO-05: cada conta só vê a própria foto', async () => {
    const { service } = build();
    await service.put(OWNER, { contentType: 'image/jpeg', data: b64(JPEG) });
    expect(await service.get(OTHER_OWNER)).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  test('CT-FOTO-06: recusa conteúdo que não é do formato declarado', async () => {
    const { service } = build();
    const texto = Buffer.from('isto não é uma imagem').toString('base64');
    expect(await service.put(OWNER, { contentType: 'image/png', data: texto })).toEqual({
      ok: false,
      error: { code: 'INVALID_IMAGE' },
    });
    expect(await service.put(OWNER, { contentType: 'image/png', data: b64(JPEG) })).toEqual({
      ok: false,
      error: { code: 'INVALID_IMAGE' },
    });
  });

  test('CT-FOTO-07: recusa formato fora da lista, mesmo que o esquema deixe passar', async () => {
    const { service } = build();
    const result = await service.put(OWNER, {
      contentType: 'image/gif' as 'image/png',
      data: b64(PNG),
    });
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_IMAGE' } });
  });

  test('CT-FOTO-08: valor limite: aceita 256 KiB e recusa um byte a mais', async () => {
    const { service } = build();
    const exact = [...JPEG, ...new Array<number>(PROFILE_PHOTO_MAX_BYTES - JPEG.length).fill(1)];
    expect((await service.put(OWNER, { contentType: 'image/jpeg', data: b64(exact) })).ok).toBe(
      true,
    );
    const over = [...exact, 1];
    expect(await service.put(OWNER, { contentType: 'image/jpeg', data: b64(over) })).toEqual({
      ok: false,
      error: { code: 'IMAGE_TOO_LARGE' },
    });
  });

  test('CT-FOTO-09: remover apaga a foto e não falha se ela não existir', async () => {
    const { service } = build();
    await service.put(OWNER, { contentType: 'image/jpeg', data: b64(JPEG) });
    expect((await service.remove(OWNER)).ok).toBe(true);
    expect((await service.remove(OWNER)).ok).toBe(true);
    expect((await service.get(OWNER)).ok).toBe(false);
  });

  test('CT-FOTO-10: o armazenamento fora do ar vira STORAGE_UNAVAILABLE, sem vazar a causa', async () => {
    const { service, reported } = build(failingStorage);
    const unavailable = { ok: false, error: { code: 'STORAGE_UNAVAILABLE' } };
    expect(await service.put(OWNER, { contentType: 'image/jpeg', data: b64(JPEG) })).toEqual(
      unavailable,
    );
    expect(await service.get(OWNER)).toEqual(unavailable);
    expect(await service.remove(OWNER)).toEqual(unavailable);
    expect(reported).toEqual(['Error', 'Error', 'Error']);
  });

  test('CT-FOTO-11: limita as trocas a 10 por hora e informa quando tentar de novo', async () => {
    const { service } = build();
    const foto = { contentType: 'image/jpeg', data: b64(JPEG) } as const;
    for (let i = 0; i < 10; i += 1) expect((await service.put(OWNER, foto)).ok).toBe(true);
    const blocked = await service.put(OWNER, foto);
    expect(blocked).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED', scope: 'photo' } });
    // Outra conta não é afetada.
    expect((await service.put(OTHER_OWNER, foto)).ok).toBe(true);
  });
});

describe('exclusão da conta com foto', () => {
  function accountWith(photos: Pick<ProfilePhotoService, 'remove'>) {
    const store = createInMemoryStore();
    return createAccountService(store.accounts, undefined, photos);
  }

  test('CT-FOTO-12: excluir a conta apaga também a foto de perfil', async () => {
    const { service } = build();
    await service.put(OWNER, { contentType: 'image/jpeg', data: b64(JPEG) });
    await accountWith(service).deleteAccount(OWNER);
    expect((await service.get(OWNER)).ok).toBe(false);
  });

  test('CT-FOTO-13: se o armazenamento falhar, a exclusão falha para a pessoa tentar de novo', async () => {
    const { service } = build(failingStorage);
    await expect(accountWith(service).deleteAccount(OWNER)).rejects.toThrow(
      'Não foi possível apagar a foto de perfil.',
    );
  });
});
