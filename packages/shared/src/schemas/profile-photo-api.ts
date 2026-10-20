import { z } from 'zod';

/** Tamanho máximo da foto de perfil já decodificada: 256 KiB (o app a reduz para cerca de 30 KiB). */
export const PROFILE_PHOTO_MAX_BYTES = 256 * 1024;

/** Formatos aceitos para a foto de perfil. */
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Tamanho máximo do texto em base64 que representa `PROFILE_PHOTO_MAX_BYTES`. */
export const PROFILE_PHOTO_MAX_BASE64_LENGTH = Math.ceil((PROFILE_PHOTO_MAX_BYTES * 4) / 3) + 4;

const base64Schema = z
  .string()
  .min(8)
  .max(PROFILE_PHOTO_MAX_BASE64_LENGTH)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'A imagem precisa estar em base64.');

/** Corpo de `PUT /api/account/photo` e resposta de `GET /api/account/photo`. */
export const profilePhotoSchema = z
  .object({
    contentType: z.enum(PROFILE_PHOTO_TYPES).meta({
      description: 'Formato da imagem.',
      example: 'image/jpeg',
    }),
    data: base64Schema.meta({
      description:
        'Imagem em base64, sem o prefixo `data:`. No máximo 256 KiB depois de decodificada.',
    }),
  })
  .strict()
  .meta({ id: 'ProfilePhoto' });

export type ProfilePhoto = z.infer<typeof profilePhotoSchema>;
