import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/theme-provider';
import { DosesScreen } from './doses-screen';

const source = {
  name: 'conjunto de exemplo do projeto (FICTITIOUS)',
  version: '0.0-exemplo',
  isFictitious: true,
  notice: 'O aplicativo não substitui a caderneta oficial.',
};
const items = [
  {
    id: 'ex-2',
    vaccine: 'Vacina de exemplo B',
    doseLabel: '2ª dose',
    status: 'OVERDUE',
    dueDate: '2026-09-15',
    scheduledDate: null,
    appliedDate: null,
  },
  {
    id: 'ex-1',
    vaccine: 'Vacina de exemplo A',
    doseLabel: '1ª dose',
    status: 'APPLIED',
    dueDate: '2026-03-10',
    scheduledDate: null,
    appliedDate: '2026-03-10',
  },
];

function renderScreen() {
  const client = new QueryClient({
    // gcTime infinito evita o temporizador de limpeza de cache, que deixaria o Jest aberto.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <DosesScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('DosesScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  test('CT-APP-T01: mostra "Carregando" enquanto busca e depois as doses e o aviso da fonte', async () => {
    // A resposta só chega quando o teste libera; assim o estado "Carregando" não depende de sorte.
    let release: (response: Response) => void = () => undefined;
    jest.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    await renderScreen();
    expect(screen.getByLabelText('Carregando as doses')).toBeOnTheScreen();

    release({ ok: true, status: 200, json: async () => ({ source, items }) } as Response);
    expect(await screen.findByText('Vacina de exemplo B, 2ª dose')).toBeOnTheScreen();
    expect(screen.getByText('Era para 15/09/2026')).toBeOnTheScreen();
    expect(screen.getByText(/Calendário de exemplo/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando as doses')).not.toBeOnTheScreen();
  });

  test('CT-APP-T02: com a API fora do ar mostra erro em linguagem simples e permite tentar de novo', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Network request failed'));
    await renderScreen();
    expect(await screen.findByText(/não foi possível carregar as doses/i)).toBeOnTheScreen();
    expect(screen.queryByText(/Network request failed/)).not.toBeOnTheScreen();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ source, items }),
    } as Response);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Vacina de exemplo A, 1ª dose')).toBeOnTheScreen();
  });

  test('CT-APP-T03: lista vazia mostra o estado vazio', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ source, items: [] }),
    } as Response);
    await renderScreen();
    await waitFor(() => expect(screen.getByText(/nenhuma dose/i)).toBeOnTheScreen());
  });
});
