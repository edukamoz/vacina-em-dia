// Variante da web: o recurso "Ler caderneta por foto" só existe no aplicativo instalado. Existe para
// o pacote web não carregar `expo-text-extractor`, `expo-image-picker` nem `expo-file-system`; a
// versão do celular é `ler-documento.ts`. Os dois precisam exportar o mesmo (`plataforma.test.ts`).
import type { DocumentoLido, OrigemDoDocumento } from './ler-documento-tipos';

export type { DocumentoLido, OrigemDoDocumento };

/** Na web o recurso não aparece. */
export const podeLerDocumento = false;

/** Na web a leitura não está disponível. */
export async function lerDocumento(): Promise<DocumentoLido> {
  return { tipo: 'indisponivel' };
}
