import { File } from 'expo-file-system';
import type * as LeitorDeTexto from 'expo-text-extractor';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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

/** A leitura de documento só existe no app instalado (Android e iOS); na web o recurso não aparece. */
export const podeLerDocumento = Platform.OS !== 'web';

/**
 * Carrega o leitor de texto do aparelho (ML Kit no Android, Vision no iOS). O `require` fica aqui
 * dentro, e não no topo do arquivo, porque o módulo nativo não existe no Expo Go nem na web: assim
 * o app abre mesmo sem ele e a tela explica que o recurso não está disponível.
 */
function carregarLeitor(): typeof LeitorDeTexto | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga tardia e opcional
    const leitor = require('expo-text-extractor') as typeof LeitorDeTexto;
    return leitor.isSupported ? leitor : null;
  } catch {
    return null;
  }
}

/** Apaga a cópia da foto que o seletor deixou no cache; se não der, o sistema limpa depois. */
function apagarFoto(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // Melhor esforço: a foto está na pasta temporária do app e nunca sai do aparelho.
  }
}

/**
 * Pede uma foto de um documento (caderneta de vacinação ou comprovante) e lê o texto dela **no
 * aparelho**: a imagem nunca é enviada a servidor nenhum e a cópia temporária é apagada depois da
 * leitura. A permissão é pedida no toque, com o motivo escrito no `app.json`.
 *
 * @param origem - Câmera ou galeria.
 */
export async function lerDocumento(origem: OrigemDoDocumento): Promise<DocumentoLido> {
  const leitor = carregarLeitor();
  if (!leitor) return { tipo: 'indisponivel' };

  const permissao =
    origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return { tipo: 'negado' };

  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const escolha =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
  const foto = escolha.assets?.[0];
  if (escolha.canceled || !foto) return { tipo: 'cancelado' };

  try {
    const linhas = await leitor.extractTextFromImage(foto.uri);
    return { tipo: 'texto', linhas: linhas.map((linha) => linha.trim()).filter(Boolean) };
  } finally {
    if (origem === 'camera') apagarFoto(foto.uri);
  }
}
