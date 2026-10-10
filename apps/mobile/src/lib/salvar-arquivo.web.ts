/**
 * Entrega um arquivo à pessoa na web: cria um endereço temporário para os bytes e dispara o
 * download pelo navegador. O endereço é liberado logo depois.
 *
 * @param bytes - Conteúdo do arquivo.
 * @param nome - Nome com que o navegador salva o arquivo.
 * @param tipo - Tipo do arquivo (por exemplo, `application/pdf`).
 * @returns Sempre `true`: o navegador salva o arquivo.
 */
export async function salvarArquivo(
  bytes: Uint8Array,
  nome: string,
  tipo: string,
): Promise<boolean> {
  const endereco = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
  const ancora = document.createElement('a');
  ancora.href = endereco;
  ancora.download = nome;
  ancora.rel = 'noopener';
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  setTimeout(() => URL.revokeObjectURL(endereco), 10_000);
  return true;
}
