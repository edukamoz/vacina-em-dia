import { createCalendarFileFetcher, WATCH_USER_AGENT } from './official-calendar-client';

const URL_OK =
  'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-idoso';
const pdf = (corpo = '%PDF-1.7 conteudo', init: ResponseInit = {}) =>
  new Response(corpo, {
    status: 200,
    headers: { 'content-type': 'application/pdf' },
    ...init,
  });

describe('download dos PDFs do calendário oficial (CT-VIG-C)', () => {
  test('CT-VIG-C01: baixa os bytes e se identifica no User-Agent', async () => {
    const fetchFn = jest.fn(async () => pdf());
    const bytes = await createCalendarFileFetcher({ fetchFn })(URL_OK);
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7 conteudo');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_OK);
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(WATCH_USER_AGENT);
  });

  test('CT-VIG-C02: recusa endereço fora do portal sem sequer chamar a rede', async () => {
    const fetchFn = jest.fn(async () => pdf());
    await expect(
      createCalendarFileFetcher({ fetchFn })('https://exemplo.test/calendario.pdf'),
    ).rejects.toThrow(/endereço não permitido/);
    await expect(
      createCalendarFileFetcher({ fetchFn })('http://www.gov.br/saude/arquivo'),
    ).rejects.toThrow(/endereço não permitido/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test.each([
    ['status diferente de 200', () => new Response('x', { status: 503 }), /HTTP 503/],
    [
      'conteúdo que não é PDF',
      () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      /não é PDF/,
    ],
    ['arquivo vazio', () => pdf(''), /vazio/],
  ])('CT-VIG-C03: %s vira falha', async (_nome, resposta, erro) => {
    await expect(
      createCalendarFileFetcher({ fetchFn: async () => resposta() })(URL_OK),
    ).rejects.toThrow(erro);
  });

  test('CT-VIG-C04: arquivo acima do teto é recusado, pelo cabeçalho ou pelo tamanho real', async () => {
    const porCabecalho = async () =>
      pdf('x', { headers: { 'content-type': 'application/pdf', 'content-length': '99' } });
    await expect(
      createCalendarFileFetcher({ fetchFn: porCabecalho, maxBytes: 10 })(URL_OK),
    ).rejects.toThrow(/grande demais/);
    await expect(
      createCalendarFileFetcher({ fetchFn: async () => pdf('x'.repeat(50)), maxBytes: 10 })(URL_OK),
    ).rejects.toThrow(/grande demais/);
  });

  test('CT-VIG-C05: falha de rede vira erro sem expor o endereço nem a causa', async () => {
    const falha = async () => {
      throw new Error('ECONNRESET 20.206.176.0 detalhe interno');
    };
    const erro = await createCalendarFileFetcher({ fetchFn: falha })(URL_OK).catch((e: Error) => e);
    expect(erro).toMatchObject({ name: 'CalendarDownloadError' });
    expect((erro as Error).message).not.toMatch(/ECONNRESET|20\.206|detalhe/);
  });
});
