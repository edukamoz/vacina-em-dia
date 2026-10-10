import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Entrega um arquivo à pessoa no celular: grava na pasta temporária do app e abre a folha de
 * compartilhar do sistema, de onde ela salva em Arquivos, abre no leitor de PDF ou manda por
 * mensagem. A versão da web é `salvar-arquivo.web.ts`.
 *
 * @param bytes - Conteúdo do arquivo.
 * @param nome - Nome do arquivo, como aparece para a pessoa.
 * @param tipo - Tipo do arquivo (por exemplo, `application/pdf`).
 * @returns `true` se a folha de compartilhar abriu; `false` se o aparelho não oferece isso.
 */
export async function salvarArquivo(
  bytes: Uint8Array,
  nome: string,
  tipo: string,
): Promise<boolean> {
  const arquivo = new File(Paths.cache, nome);
  arquivo.create({ overwrite: true });
  arquivo.write(bytes);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(arquivo.uri, {
    mimeType: tipo,
    UTI: 'com.adobe.pdf',
    dialogTitle: nome,
  });
  return true;
}
