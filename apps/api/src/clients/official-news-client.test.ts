import {
  createOfficialNewsClient,
  OFFICIAL_NEWS_FEED_URL,
  parseNewsFeed,
  unavailableOfficialNewsClient,
} from './official-news-client';

const BASE = 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro';

function item(title: string, link: string, date: string): string {
  return `<item rdf:about="${link}"><title>${title}</title><link>${link}</link><dc:date>${date}</dc:date></item>`;
}

const FEED = `<?xml version="1.0"?><rdf:RDF><channel><title>MS</title></channel>
${item('Campanha de vacinação contra a gripe &amp; mais', `${BASE}/campanha-gripe`, '2026-10-19T16:08:00Z')}
${item('Sesai completa 16 anos', `${BASE}/sesai-16-anos`, '2026-10-19T17:00:00Z')}
${item('Foto: Luiz Moreira', `${BASE}/sesai-16-anos/foto.jpg/view`, '2026-10-19T16:07:54Z')}
${item('Retificação', 'https://www.gov.br/saude/pt-br/acesso-a-informacao/edital/retificacao.pdf/view', '2026-10-19T17:52:17Z')}
${item('Carretas de saúde passam por vistoria', `${BASE}/carretas-vistoria`, '2026-10-17T21:15:27Z')}
${item('Duplicada', `${BASE}/carretas-vistoria`, '2026-10-17T21:15:27Z')}
${item('<![CDATA[Atualização do calendário de vacinação]]>', `${BASE}/calendario`, '2026-10-17T10:00:00Z')}
${item('Sem data', `${BASE}/sem-data`, 'ontem')}
</rdf:RDF>`;

describe('feed de notícias do Ministério da Saúde', () => {
  test('CT-NEW-01: guarda só notícias do portal (sem anexo, PDF, duplicata ou item sem data)', () => {
    const itens = parseNewsFeed(FEED);
    expect(itens.map((i) => i.url)).toEqual([
      `${BASE}/campanha-gripe`,
      `${BASE}/sesai-16-anos`,
      `${BASE}/calendario`,
      `${BASE}/carretas-vistoria`,
    ]);
  });

  test('CT-NEW-02: na mesma data, as de vacinação vêm antes; o título é decodificado', () => {
    const [primeira, segunda] = parseNewsFeed(FEED);
    // As duas são de 19/10 (a de vacinação é mais cedo no dia, mas vem antes).
    expect(primeira?.title).toBe('Campanha de vacinação contra a gripe & mais');
    expect(primeira?.vaccineRelated).toBe(true);
    expect(segunda?.title).toBe('Sesai completa 16 anos');
    expect(segunda?.vaccineRelated).toBe(false);
    expect(primeira?.publishedAt).toBe('2026-10-19');
  });

  test('CT-NEW-03: o título com CDATA é lido e o limite de itens é respeitado', () => {
    const itens = parseNewsFeed(FEED, 3);
    expect(itens).toHaveLength(3);
    expect(parseNewsFeed(FEED)[2]?.title).toBe('Atualização do calendário de vacinação');
  });

  test('CT-NEW-04: feed vazio ou fora do formato dá lista vazia, sem erro', () => {
    expect(parseNewsFeed('')).toEqual([]);
    expect(parseNewsFeed('<html>manutenção</html>')).toEqual([]);
  });

  test.each([
    ['https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro/x?a=1'],
    ['https://evil.example/saude/pt-br/assuntos/noticias-ms/2026/outubro/x'],
    ['http://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro/x'],
    ['javascript:alert(1)'],
  ])('CT-NEW-05: link fora do padrão do portal é descartado (%s)', (link) => {
    expect(parseNewsFeed(item('Título', link, '2026-10-19T10:00:00Z'))).toEqual([]);
  });

  test('CT-NEW-06: o cliente lê o endereço fixo do feed e devolve as notícias', async () => {
    const fetchFn = jest.fn(async () => new Response(FEED, { status: 200 }));
    const itens = await createOfficialNewsClient(fetchFn as unknown as typeof fetch).fetchLatest();
    expect(fetchFn).toHaveBeenCalledWith(OFFICIAL_NEWS_FEED_URL, expect.anything());
    expect(itens).toHaveLength(4);
  });

  test('CT-NEW-07: erro HTTP e resposta grande demais viram falha', async () => {
    const erro = jest.fn(async () => new Response('x', { status: 503 }));
    await expect(
      createOfficialNewsClient(erro as unknown as typeof fetch).fetchLatest(),
    ).rejects.toThrow('503');
    const grande = jest.fn(async () => new Response('a'.repeat(1_000_001), { status: 200 }));
    await expect(
      createOfficialNewsClient(grande as unknown as typeof fetch).fetchLatest(),
    ).rejects.toThrow('grande');
    await expect(unavailableOfficialNewsClient.fetchLatest()).rejects.toThrow();
  });
});
