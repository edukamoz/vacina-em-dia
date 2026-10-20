import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { ProfilePhoto } from '@vacina/shared';

/** De onde a foto vem. A câmera só existe no celular; na web só a galeria (o seletor de arquivos). */
export type OrigemDaFoto = 'galeria' | 'camera';

/** Resultado de escolher uma foto: a foto pronta, `cancelado` ou `negado` (sem permissão). */
export type FotoEscolhida =
  | { readonly tipo: 'foto'; readonly foto: ProfilePhoto }
  | { readonly tipo: 'cancelado' }
  | { readonly tipo: 'negado' };

/** Lado da foto de perfil depois de reduzida, em pixels. Basta para um avatar e pesa cerca de 30 KB. */
export const LADO_DA_FOTO = 256;

/** Diz se o aparelho pode tirar uma foto na hora (celular; na web não). */
export const podeTirarFoto = Platform.OS !== 'web';

/**
 * Pede uma foto à pessoa, recorta num quadrado e a reduz para `LADO_DA_FOTO` px em JPEG antes de
 * qualquer envio: a API só recebe a imagem pequena, e o arquivo original nunca sai do aparelho.
 * A permissão é pedida só no momento do toque, com o motivo explicado no `app.json`.
 *
 * @param origem - Galeria ou câmera.
 */
export async function escolherFotoDePerfil(origem: OrigemDaFoto): Promise<FotoEscolhida> {
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) return { tipo: 'negado' };
  } else if (Platform.OS !== 'web') {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return { tipo: 'negado' };
  }

  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const escolha =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
  const original = escolha.assets?.[0];
  if (escolha.canceled || !original) return { tipo: 'cancelado' };

  const reduzida = await ImageManipulator.manipulateAsync(
    original.uri,
    [{ resize: { width: LADO_DA_FOTO, height: LADO_DA_FOTO } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!reduzida.base64) return { tipo: 'cancelado' };
  return { tipo: 'foto', foto: { contentType: 'image/jpeg', data: reduzida.base64 } };
}

/**
 * Endereço de dados (`data:`) para mostrar a foto num `Image`.
 *
 * @param foto - Foto devolvida pela API.
 */
export function enderecoDaFoto(foto: ProfilePhoto): string {
  return `data:${foto.contentType};base64,${foto.data}`;
}
