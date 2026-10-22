import type * as Dates from '../../lib/dates';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { lerDocumento } from '../../lib/ler-documento';
import { MEMBER, createFakeFetch, dose, memberDoses, renderScreen } from '../../test-utils';
import { FotoDocumentoScreen } from './foto-documento-screen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('../../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../../lib/dates'),
  todayCivil: () => '2026-10-20',
}));
jest.mock('../../lib/ler-documento', () => ({
  lerDocumento: jest.fn(),
  podeLerDocumento: true,
}));

const ler = lerDocumento as jest.MockedFunction<typeof lerDocumento>;

const PENTA = dose({ id: 'd-penta', vaccine: 'penta (DTP+Hib+HB)', doseLabel: '1ª dose' });
const ROTA = dose({ id: 'd-rota', vaccine: 'rotavírus humano', doseLabel: '1ª dose' });
const rotas = (extra: Parameters<typeof createFakeFetch>[0] = {}) => ({
  'GET /members': { status: 200, body: { items: [MEMBER] } },
  [`GET /members/${MEMBER.id}/doses`]: {
    status: 200,
    body: memberDoses([PENTA, ROTA]),
  },
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  ler.mockReset();
});

const abrir = async (extra?: Parameters<typeof createFakeFetch>[0]) => {
  const fake = createFakeFetch(rotas(extra));
  await renderScreen(<FotoDocumentoScreen />, fake.fetchFn);
  return fake;
};

const fotografar = async (botao: string) => {
  await fireEvent.press(await screen.findByRole('button', { name: botao }));
};

describe('Ler caderneta por foto', () => {
  test('CT-APP-OCR30: mostra o aviso de que a foto é lida no aparelho e as duas formas de fotografar', async () => {
    await abrir();
    expect(await screen.findByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Escolher da galeria' })).toBeOnTheScreen();
    expect(screen.getByText(/lida aqui no aparelho e não é enviada/)).toBeOnTheScreen();
  });

  test('CT-APP-OCR31: mostra as doses encontradas, ligadas, com a data e o trecho lido, sem salvar nada ainda', async () => {
    ler.mockResolvedValue({
      tipo: 'texto',
      linhas: ['Penta 1ª dose 15/03/2026 Lote A1', 'Rotavírus 1ª dose 16/03/2026'],
    });
    const fake = await abrir();
    await fotografar('Tirar foto');
    expect(ler).toHaveBeenCalledWith('camera');
    expect(
      await screen.findByRole('switch', { name: 'penta (DTP+Hib+HB), 1ª dose' }),
    ).toBeChecked();
    expect(screen.getByRole('switch', { name: 'rotavírus humano, 1ª dose' })).toBeChecked();
    expect(screen.getByText('Aplicada em 15/03/2026')).toBeOnTheScreen();
    expect(screen.getByText(/Lido na foto: Penta 1ª dose 15\/03\/2026 Lote A1/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Registrar 2 doses' })).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST '))).toBe(false);
  });

  test('CT-APP-OCR32: só salva as doses que a pessoa deixou ligadas, com a data lida', async () => {
    ler.mockResolvedValue({
      tipo: 'texto',
      linhas: ['Penta 1ª dose 15/03/2026', 'Rotavírus 1ª dose 16/03/2026'],
    });
    const fake = await abrir({
      'POST /doses/d-penta/events': { status: 200, body: { ...PENTA, status: 'APPLIED' } },
    });
    await fotografar('Escolher da galeria');
    expect(ler).toHaveBeenCalledWith('galeria');
    await fireEvent.press(await screen.findByRole('switch', { name: 'rotavírus humano, 1ª dose' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar 1 dose' }));
    expect(await screen.findByText('1 dose foi marcada como aplicada.')).toBeOnTheScreen();
    const envios = fake.calls.filter((c) => c.key.startsWith('POST '));
    expect(envios.map((c) => [c.key, c.body])).toEqual([
      ['POST /doses/d-penta/events', { type: 'APPLY', date: '2026-03-15' }],
    ]);
  });

  test('CT-APP-OCR33: com tudo desligado o botão de registrar fica desativado', async () => {
    ler.mockResolvedValue({ tipo: 'texto', linhas: ['Rotavírus 1ª dose 16/03/2026'] });
    await abrir();
    await fotografar('Tirar foto');
    await fireEvent.press(await screen.findByRole('switch', { name: 'rotavírus humano, 1ª dose' }));
    expect(screen.getByRole('button', { name: 'Registrar 0 doses' })).toBeDisabled();
  });

  test('CT-APP-OCR34: se uma dose falhar ao salvar, as outras valem e a falha é avisada', async () => {
    ler.mockResolvedValue({
      tipo: 'texto',
      linhas: ['Penta 1ª dose 15/03/2026', 'Rotavírus 1ª dose 16/03/2026'],
    });
    await abrir({
      'POST /doses/d-penta/events': { status: 200, body: { ...PENTA, status: 'APPLIED' } },
      'POST /doses/d-rota/events': {
        status: 422,
        body: { code: 'INVALID_DOSE_DATE', message: 'Data inválida.' },
      },
    });
    await fotografar('Tirar foto');
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar 2 doses' }));
    expect(await screen.findByText('1 dose foi marcada como aplicada.')).toBeOnTheScreen();
    expect(screen.getByText(/Uma dose não pôde ser registrada/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver as doses' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  test('CT-APP-OCR35: foto sem nenhuma dose reconhecida explica e mostra as linhas com data', async () => {
    ler.mockResolvedValue({ tipo: 'texto', linhas: ['Raiva 1ª dose 01/02/2026'] });
    await abrir();
    await fotografar('Tirar foto');
    expect(await screen.findByText('Não encontramos doses nessa foto')).toBeOnTheScreen();
    expect(screen.getByText('Raiva 1ª dose 01/02/2026')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeOnTheScreen();
  });

  test.each([
    ['negado', /Sem permissão para usar a câmera ou as fotos/],
    ['indisponivel', /não consegue ler texto de fotos/],
  ] as const)('CT-APP-OCR36: resultado "%s" mostra o aviso certo', async (tipo, texto) => {
    ler.mockResolvedValue({ tipo });
    await abrir();
    await fotografar('Tirar foto');
    expect(await screen.findByText(texto, {}, { timeout: 4000 })).toBeOnTheScreen();
  });

  test('CT-APP-OCR37: cancelar a foto não mostra aviso nem resultado', async () => {
    ler.mockResolvedValue({ tipo: 'cancelado' });
    await abrir();
    await fotografar('Tirar foto');
    await waitFor(() => expect(ler).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.queryByText('Doses encontradas')).not.toBeOnTheScreen();
  });

  test('CT-APP-OCR38: falha inesperada na leitura mostra uma mensagem simples', async () => {
    ler.mockRejectedValue(new Error('erro do ML Kit'));
    await abrir();
    await fotografar('Tirar foto');
    expect(await screen.findByText(/Não foi possível ler essa foto/)).toBeOnTheScreen();
  });
});
