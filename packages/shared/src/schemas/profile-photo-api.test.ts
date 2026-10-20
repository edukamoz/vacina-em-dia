import { PROFILE_PHOTO_MAX_BASE64_LENGTH, profilePhotoSchema } from './profile-photo-api';

describe('profilePhotoSchema', () => {
  test('CT-FOTO-S01: aceita imagem em base64 de um formato permitido', () => {
    expect(
      profilePhotoSchema.safeParse({ contentType: 'image/jpeg', data: '/9j/4AAQSkZJRg==' }).success,
    ).toBe(true);
  });

  test.each([
    ['formato não permitido', { contentType: 'image/gif', data: 'R0lGODlhAQABAAAAACw=' }],
    ['texto que não é base64', { contentType: 'image/png', data: 'não é base64!' }],
    [
      'data URI com prefixo',
      { contentType: 'image/png', data: 'data:image/png;base64,iVBORw0KGgo=' },
    ],
    ['vazio', { contentType: 'image/png', data: '' }],
    ['campo a mais', { contentType: 'image/png', data: 'iVBORw0KGgo=', extra: 1 }],
    [
      'grande demais',
      { contentType: 'image/png', data: 'A'.repeat(PROFILE_PHOTO_MAX_BASE64_LENGTH + 1) },
    ],
  ])('CT-FOTO-S02: recusa %s', (_nome, corpo) => {
    expect(profilePhotoSchema.safeParse(corpo).success).toBe(false);
  });

  test('CT-FOTO-S03: aceita o tamanho máximo exato do texto', () => {
    const data = 'A'.repeat(PROFILE_PHOTO_MAX_BASE64_LENGTH);
    expect(profilePhotoSchema.safeParse({ contentType: 'image/webp', data }).success).toBe(true);
  });
});
