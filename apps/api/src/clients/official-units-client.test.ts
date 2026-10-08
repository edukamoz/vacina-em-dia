import {
  cleanPhone,
  createOfficialUnitsClient,
  describeShift,
  unavailableOfficialUnitsClient,
} from './official-units-client';

const registro = (n: number, extra: Record<string, unknown> = {}) => ({
  codigo_cnes: n,
  numero_telefone_estabelecimento: '(15) 3243-1513',
  descricao_turno_atendimento: 'ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE',
  numero_estabelecimento: '120',
  data_atualizacao: '2025-09-03',
  ...extra,
});

function resposta(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('cliente da API oficial de unidades (CNES)', () => {
  test('CT-UNI-20: consulta por município e tipo, pagina de 20 em 20 e normaliza os campos', async () => {
    const pagina1 = Array.from({ length: 20 }, (_v, i) => registro(i + 1));
    const fetchFn = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockResolvedValueOnce(resposta({ estabelecimentos: pagina1 }))
      .mockResolvedValueOnce(resposta({ estabelecimentos: [registro(21)] }))
      .mockResolvedValueOnce(resposta({ estabelecimentos: [] }));
    const client = createOfficialUnitsClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://api.exemplo.gov.br/',
    });
    const infos = await client.fetchMunicipality('355700');

    expect(infos).toHaveLength(21);
    expect(infos[0]).toEqual({
      cnes: '0000001',
      phone: '(15) 3243-1513',
      shift: 'Manhã e tarde',
      number: '120',
      updatedAt: '2025-09-03',
    });
    const urls = fetchFn.mock.calls.map((c) => c[0]);
    expect(urls[0]).toBe(
      'https://api.exemplo.gov.br/cnes/estabelecimentos?codigo_municipio=355700&codigo_tipo_unidade=2&limit=20&offset=0',
    );
    expect(urls[1]).toContain('offset=20');
    expect(urls[2]).toContain('codigo_tipo_unidade=1');
  });

  test('CT-UNI-21: resposta com erro ou formato inesperado vira falha', async () => {
    const erro = createOfficialUnitsClient({
      fetchFn: jest.fn().mockResolvedValue(resposta({}, 503)),
    });
    await expect(erro.fetchMunicipality('355700')).rejects.toThrow('503');
    const formato = createOfficialUnitsClient({
      fetchFn: jest.fn().mockResolvedValue(resposta({ outra: 1 })),
    });
    await expect(formato.fetchMunicipality('355700')).rejects.toThrow('formato');
  });

  test('CT-UNI-22: ignora registros sem código e dados que não parecem telefone, turno ou número', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        resposta({
          estabelecimentos: [
            { nome: 'sem codigo' },
            registro(5, {
              numero_telefone_estabelecimento: '123',
              descricao_turno_atendimento: 'TEXTO ESTRANHO',
              numero_estabelecimento: '<script>',
              data_atualizacao: 'ontem',
            }),
          ],
        }),
      )
      .mockResolvedValue(resposta({ estabelecimentos: [] }));
    const infos = await createOfficialUnitsClient({ fetchFn }).fetchMunicipality('355700');
    expect(infos).toEqual([
      { cnes: '0000005', phone: null, shift: null, number: null, updatedAt: null },
    ]);
  });

  test('CT-UNI-23: o cliente "indisponível" sempre falha', async () => {
    await expect(unavailableOfficialUnitsClient.fetchMunicipality('1')).rejects.toThrow();
  });

  test.each([
    ['ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE', 'Manhã e tarde'],
    ['ATENDIMENTO SOMENTE PELA MANHA', 'Somente pela manhã'],
    ['ATENDIMENTO SOMENTE A TARDE', 'Somente à tarde'],
    ['ATENDIMENTO 24H', '24 horas'],
    ['ATENDIMENTO NA NOITE', 'Com atendimento à noite'],
    ['outra coisa', null],
  ])('CT-UNI-24: turno "%s" vira %s', (texto, esperado) => {
    expect(describeShift(texto)).toBe(esperado);
  });

  test.each([
    ['(15) 3243-1513', '(15) 3243-1513'],
    ['15 32432990', '15 32432990'],
    ['abc', null],
    ['12345', null],
  ])('CT-UNI-25: telefone "%s" vira %s', (texto, esperado) => {
    expect(cleanPhone(texto)).toBe(esperado);
    expect(cleanPhone(123)).toBeNull();
  });
});
