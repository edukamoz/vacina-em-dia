import { QueryClient } from '@tanstack/react-query';

/**
 * Cria o cliente de dados do servidor (TanStack Query, ADR-006). Tenta de novo uma vez antes de
 * mostrar o erro e não busca de novo só porque a janela voltou ao foco, para poupar a bateria e a
 * franquia de dados de quem usa o celular.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}
