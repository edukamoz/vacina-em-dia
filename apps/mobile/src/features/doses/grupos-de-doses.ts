/**
 * Se a lista de doses aplicadas aparece aberta na aba Doses. Quando a pessoa ainda tem o que
 * resolver (doses atrasadas ou próximas), as aplicadas ficam recolhidas atrás de um botão, para o
 * que importa subir na tela; quando não há mais nada a resolver, a lista já aparece aberta.
 *
 * @param grupos - Grupos devolvidos por `agruparDoses`.
 * @param escolhaDaPessoa - Se a pessoa tocou no botão para abrir ou fechar a lista.
 */
export function aplicadasVisiveisAoAbrir(
  grupos: { readonly atencao: readonly unknown[]; readonly proximas: readonly unknown[] },
  escolhaDaPessoa: boolean,
): boolean {
  const nadaAResolver = grupos.atencao.length + grupos.proximas.length === 0;
  return nadaAResolver || escolhaDaPessoa;
}
