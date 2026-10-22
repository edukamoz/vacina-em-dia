import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Dimensions, Linking } from 'react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { LIMITE_NOVIDADES, NovidadesCard, partesDaData } from './novidades-card';

const URL_BASE = 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro';
const noticia = (n: number, extra = {}) => ({
  title: `Notícia ${n}`,
  url: `${URL_BASE}/n${n}`,
  publishedAt: '2026-10-19',
  vaccineRelated: false,
  ...extra,
});
const resposta = (items: unknown[], updatedAt: string | null = '2026-10-21T14:00:00.000Z') => ({
  status: 200,
  body: {
    items,
    source: {
      name: 'Notícias do Ministério da Saúde',
      publisher: 'Ministério da Saúde',
      url: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms',
    },
    updatedAt,
    notice: 'O app só repassa o título e o link. Não é orientação médica.',
  },
});

beforeEach(() => jest.restoreAllMocks());

describe('cartão Novidades de saúde', () => {
  test('CT-APP-NEW01: mostra título, data, etiqueta de vacinação, fonte e aviso', async () => {
    const fake = createFakeFetch({
      'GET /news': resposta([
        noticia(1, { title: 'Campanha de vacinação', vaccineRelated: true }),
        noticia(2),
      ]),
    });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    expect(await screen.findByRole('header', { name: 'Novidades de saúde' })).toBeOnTheScreen();
    expect(screen.getByText('Campanha de vacinação')).toBeOnTheScreen();
    // A data aparece como selo (dia e mês) e completa no rótulo de acessibilidade.
    expect(screen.getAllByText('OUT', { includeHiddenElements: true })).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /Campanha de vacinação, 19\/10\/2026, sobre vacinação/ }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Vacinação')).toHaveLength(1);
    expect(screen.getAllByText('Ler no site')).toHaveLength(2);
    expect(
      screen.getByText(
        /Fonte: Notícias do Ministério da Saúde, Ministério da Saúde\. Lido em 21\/10\/2026/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Não é orientação médica/)).toBeOnTheScreen();
  });

  test('CT-APP-NEW02: tocar numa notícia abre a página original no site do Ministério', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const fake = createFakeFetch({ 'GET /news': resposta([noticia(7)]) });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('link', { name: /Notícia 7, 19\/10\/2026/ }));
    expect(abrir).toHaveBeenCalledWith(`${URL_BASE}/n7`);
  });

  test('CT-APP-NEW03: mostra no máximo seis notícias', async () => {
    const fake = createFakeFetch({
      'GET /news': resposta(Array.from({ length: 9 }, (_, i) => noticia(i + 1))),
    });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    await screen.findByText('Notícia 1');
    expect(screen.getAllByRole('link')).toHaveLength(LIMITE_NOVIDADES);
    expect(LIMITE_NOVIDADES).toBe(6);
  });

  test.each([
    ['2026-10-19', '19', 'OUT'],
    ['2026-01-05', '5', 'JAN'],
    ['2026-12-31', '31', 'DEZ'],
  ])('CT-APP-NEW06: a data %s vira o selo "%s %s"', (civil, dia, mes) => {
    expect(partesDaData(civil)).toEqual({ dia, mes });
  });

  test('CT-APP-NEW07: no computador os botões Anterior e Próxima percorrem o carrossel', async () => {
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 1280, height: 800, scale: 1, fontScale: 1 });
    const fake = createFakeFetch({
      'GET /news': resposta(Array.from({ length: 3 }, (_, i) => noticia(i + 1))),
    });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    const proxima = await screen.findByRole('button', { name: 'Próxima' });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await fireEvent.press(proxima);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    await fireEvent.press(proxima);
    expect(proxima).toBeDisabled();
  });

  test('CT-APP-NEW04: sem notícias o cartão some', async () => {
    const fake = createFakeFetch({ 'GET /news': resposta([], null) });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'GET /news')).toBe(true));
    expect(screen.queryByText('Novidades de saúde')).not.toBeOnTheScreen();
  });

  test('CT-APP-NEW05: se a consulta falha o cartão some, sem mensagem de erro', async () => {
    const fake = createFakeFetch({
      'GET /news': { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Erro.' } },
    });
    await renderScreen(<NovidadesCard />, fake.fetchFn);
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'GET /news')).toBe(true));
    expect(screen.queryByText('Novidades de saúde')).not.toBeOnTheScreen();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });
});
