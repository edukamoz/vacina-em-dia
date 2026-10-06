import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  test('CT-APP-A10: tenta de novo uma vez e não busca ao voltar o foco', () => {
    const options = createQueryClient().getDefaultOptions().queries;
    expect(options?.retry).toBe(1);
    expect(options?.refetchOnWindowFocus).toBe(false);
  });

  test('CT-APP-A11: cada chamada devolve um cliente independente', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
