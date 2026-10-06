import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../../api/config';
import { fetchDoses } from '../../api/doses-client';

/** Busca as doses na API e guarda o resultado em cache (TanStack Query, ADR-006). */
export function useDoses() {
  return useQuery({
    queryKey: ['doses'],
    queryFn: ({ signal }) => fetchDoses({ baseUrl: API_BASE_URL, signal }),
  });
}
