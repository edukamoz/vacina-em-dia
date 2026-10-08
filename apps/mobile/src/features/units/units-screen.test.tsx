import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { LocationError } from './location';
import { RESPONSE } from './test-fixtures';
import { UnitsScreen } from './units-screen';

const mockGetPosition = jest.fn();
jest.mock('./location', () => ({
  LocationError: jest.requireActual('./location').LocationError,
  getCurrentPosition: () => mockGetPosition(),
}));
jest.mock('./unit-map', () => ({ UnitMap: () => null }));

const KEY = 'vacina-em-dia:postos:v1';
const URL_BUSCA = 'GET /units/nearby?lat=-23.547&lon=-47.438&radiusKm=10&limit=20';
const SEGUNDA = {
  ...RESPONSE.items[0]!,
  cnes: '0000002',
  name: 'Unidade Básica de Saúde Itapeva',
  address: 'Rua João Santiago Figueira',
  neighborhood: 'Itapeva',
  distanceMeters: 1200,
  phone: null,
  shift: null,
};
const DUAS = { ...RESPONSE, items: [RESPONSE.items[0]!, SEGUNDA] };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockGetPosition.mockResolvedValue({ latitude: -23.5466, longitude: -47.4378 });
});

describe('tela de postos de saúde (RF10)', () => {
  test('CT-UNI-APP-40: no começo explica o que fazer, avisa que não guarda a posição e que é preciso ligar', async () => {
    await renderScreen(<UnitsScreen />, createFakeFetch({}).fetchFn);
    expect(screen.getByRole('header', { name: 'Postos de saúde' })).toBeOnTheScreen();
    expect(screen.getByText('Vamos achar os postos perto de você')).toBeOnTheScreen();
    expect(screen.getByText(/não guarda a sua posição/)).toBeOnTheScreen();
    expect(screen.getByText(/Nem todas têm sala de vacina/)).toBeOnTheScreen();
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  test('CT-UNI-APP-41: ao tocar em localizar, mostra os postos com distância, fonte e guarda a lista', async () => {
    const fake = createFakeFetch({ [URL_BUSCA]: { status: 200, body: DUAS } });
    await renderScreen(<UnitsScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));

    expect(await screen.findByText(/Unidade Básica de Saúde Rio Acima/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Itapeva, a \d/)).toBeOnTheScreen();
    expect(
      screen.getByText(/Telefone e turno atualizados agora pela API oficial/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Ministério da Saúde, arquivo de/)).toBeOnTheScreen();
    expect(screen.getByText(/colaboradores do OpenStreetMap/)).toBeOnTheScreen();
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).not.toBeNull());
    // A posição vai para a API arredondada (cerca de 110 m).
    expect(fake.calls[0]?.key).toBe(URL_BUSCA);
  });

  test('CT-UNI-APP-42: escolher uma unidade mostra "Ver rota" e "Ligar", e tocar de novo recolhe', async () => {
    const fake = createFakeFetch({ [URL_BUSCA]: { status: 200, body: RESPONSE } });
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen(<UnitsScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    const cartao = await screen.findByRole('button', { name: /Rio Acima, a \d/ });

    expect(screen.queryByRole('button', { name: 'Ver rota' })).not.toBeOnTheScreen();
    await fireEvent.press(cartao);
    expect(cartao).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver rota' }));
    expect(abrir).toHaveBeenCalledWith(expect.stringContaining('destination=-23.53511,-47.4359'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar: (15) 3243-1513' }));
    expect(abrir).toHaveBeenCalledWith('tel:1532431513');

    await fireEvent.press(cartao);
    expect(screen.queryByRole('button', { name: 'Ver rota' })).not.toBeOnTheScreen();
  });

  test('CT-UNI-APP-43: a busca filtra por nome ou rua, sem depender de acento', async () => {
    const fake = createFakeFetch({ [URL_BUSCA]: { status: 200, body: DUAS } });
    await renderScreen(<UnitsScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    await screen.findByLabelText('Buscar por nome ou rua');

    await fireEvent.changeText(screen.getByLabelText('Buscar por nome ou rua'), 'joao santiago');
    expect(screen.queryByRole('button', { name: /Rio Acima/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Itapeva/ })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Buscar por nome ou rua'), 'zzz');
    expect(screen.getByText('Nenhum posto encontrado. Tente outro nome.')).toBeOnTheScreen();
  });

  test('CT-UNI-APP-44: localização negada mostra a explicação e não busca nada', async () => {
    mockGetPosition.mockRejectedValue(new LocationError('DENIED'));
    const fake = createFakeFetch({});
    await renderScreen(<UnitsScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem a permissão de localização/);
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-UNI-APP-45: erro inesperado da localização vira mensagem simples', async () => {
    mockGetPosition.mockRejectedValue(new Error('boom'));
    await renderScreen(<UnitsScreen />, createFakeFetch({}).fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Não foi possível saber onde você está/,
    );
  });

  test('CT-UNI-APP-46: ao abrir, mostra na hora a lista guardada, com a data', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ savedAt: '2026-10-05T12:00:00.000Z', response: RESPONSE }),
    );
    await renderScreen(<UnitsScreen />, createFakeFetch({}).fetchFn);
    expect(await screen.findByRole('button', { name: /Rio Acima/ })).toBeOnTheScreen();
    expect(screen.getByText(/Lista salva em 05\/10\/2026/)).toBeOnTheScreen();
  });

  test('CT-UNI-APP-47: sem internet, mantém a lista guardada, avisa e reordena pela posição', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        savedAt: '2026-10-05T12:00:00.000Z',
        response: { ...DUAS, items: [{ ...SEGUNDA, distanceMeters: 5 }, RESPONSE.items[0]!] },
      }),
    );
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    await renderScreen(<UnitsScreen />, fetchFn);
    await screen.findByRole('button', { name: /Itapeva/ });
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));

    expect(
      await screen.findByText(/Sem internet agora\. Mostrando a lista salva/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/em 05\/10\/2026/)).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /, a \d/ })).toHaveLength(2);
  });

  test('CT-UNI-APP-48: sem internet e sem lista guardada, explica e deixa tentar de novo', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    await renderScreen(<UnitsScreen />, fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText(/Sem internet e nenhuma lista salva/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeEnabled();
  });

  test('CT-UNI-APP-49: erro do servidor (por exemplo, limite de buscas) mostra a mensagem da API', async () => {
    const fake = createFakeFetch({
      [URL_BUSCA]: {
        status: 429,
        body: { code: 'RATE_LIMITED', message: 'Muitas buscas de postos em pouco tempo.' },
      },
    });
    await renderScreen(<UnitsScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText('Muitas buscas de postos em pouco tempo.')).toBeOnTheScreen();
  });
});
