import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { HouseholdResponse } from '@vacina/shared';
import * as Clipboard from 'expo-clipboard';
import type * as Dates from '../../lib/dates';
import { ACCEPTED, createFakeFetch, renderScreen } from '../../test-utils';
import { AccountScreen } from '../account/account-screen';
import { EntrarNaFamiliaScreen } from './entrar-na-familia-screen';
import { ResponsaveisDaFamilia } from './responsaveis-da-familia';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('../../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../../lib/dates'),
  todayCivil: (now?: Date) => (now ? '2026-11-17' : '2026-11-10'),
}));

const copiar = jest.mocked(Clipboard.setStringAsync);

beforeEach(() => jest.clearAllMocks());

const guardian = (patch: Partial<HouseholdResponse['guardians'][number]> = {}) => ({
  id: 'v-1',
  role: 'OWNER' as const,
  emailHint: 'm***@e***.com.br',
  joinedAt: '2026-11-01T12:00:00.000Z',
  isYou: true,
  ...patch,
});
const SOZINHA: HouseholdResponse = {
  role: 'OWNER',
  guardians: [guardian()],
  memberCount: 2,
  activeInvites: 0,
};
const JOSE = guardian({ id: 'v-2', role: 'GUARDIAN', emailHint: 'j***@e***.com.br', isYou: false });
const DONO_COM_OUTRO: HouseholdResponse = {
  role: 'OWNER',
  guardians: [guardian(), JOSE],
  memberCount: 2,
  activeInvites: 1,
};
const RESPONSAVEL: HouseholdResponse = {
  role: 'GUARDIAN',
  guardians: [guardian({ isYou: false }), { ...JOSE, isYou: true }],
  memberCount: 2,
  activeInvites: 0,
};

const abrir = async (
  familia: HouseholdResponse,
  extra: Parameters<typeof createFakeFetch>[0] = {},
) => {
  const fake = createFakeFetch({ 'GET /family': { status: 200, body: familia }, ...extra });
  await renderScreen(<ResponsaveisDaFamilia />, fake.fetchFn);
  return fake;
};
const botao = (name: string) => screen.getByRole('button', { name });
const corpoDe = (fake: ReturnType<typeof createFakeFetch>, chave: string) =>
  fake.calls.find((c) => c.key === chave)?.body;
const enviou = (fake: ReturnType<typeof createFakeFetch>, metodo: string) =>
  fake.calls.some((c) => c.key.startsWith(metodo));

describe('responsáveis da família (B15)', () => {
  test('CT-FAMR-200: lista os responsáveis com o e-mail oculto, quem é você e o papel', async () => {
    await abrir(DONO_COM_OUTRO);
    expect(await screen.findByLabelText('m***@e***.com.br, você, Dono')).toBeOnTheScreen();
    expect(screen.getByLabelText('j***@e***.com.br, Responsável')).toBeOnTheScreen();
    expect(screen.getByText('m***@e***.com.br (você)')).toBeOnTheScreen();
    expect(screen.getByText(/veem e editam as vacinas de todas as pessoas/)).toBeOnTheScreen();
  });

  test('CT-FAMR-201: quem está só vê o convite e a entrada por código, sem remover nem sair', async () => {
    await abrir(SOZINHA);
    expect(await screen.findByText(/Hoje só você cuida desta família/)).toBeOnTheScreen();
    expect(botao('Convidar outro responsável')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sair da família' })).not.toBeOnTheScreen();
    await fireEvent.press(botao('Entrar na família de outra pessoa'));
    expect(mockPush).toHaveBeenCalledWith('/responsaveis/entrar');
  });

  test('CT-FAMR-202: convidar avisa o que quem entrar vai ver e mostra o código uma vez, com validade', async () => {
    const fake = await abrir(SOZINHA, {
      'POST /family/invites': {
        status: 201,
        body: { code: 'ABCDE-FGHJK', expiresAt: '2026-11-17T12:00:00.000Z' },
      },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Convidar outro responsável' }),
    );
    expect(
      screen.getByText(/ver e poder editar os dados de saúde de todas as pessoas/),
    ).toBeOnTheScreen();
    expect(enviou(fake, 'POST')).toBe(false);
    await fireEvent.press(botao('Gerar código'));
    expect(await screen.findByText('ABCDE-FGHJK')).toBeOnTheScreen();
    expect(screen.getByText(/Vale uma vez e até 17\/11\/2026/)).toBeOnTheScreen();
    await fireEvent.press(botao('Copiar código'));
    await waitFor(() => expect(copiar).toHaveBeenCalledWith('ABCDE-FGHJK'));
    expect(await screen.findByText('Código copiado.')).toBeOnTheScreen();
    await fireEvent.press(botao('Fechar'));
    expect(screen.queryByText('ABCDE-FGHJK')).not.toBeOnTheScreen();
  });

  test('CT-FAMR-203: o código tem leitura por caracteres para o leitor de tela', async () => {
    await abrir(SOZINHA, {
      'POST /family/invites': {
        status: 201,
        body: { code: 'ABCDE-FGHJK', expiresAt: '2026-11-17T12:00:00.000Z' },
      },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Convidar outro responsável' }),
    );
    await fireEvent.press(botao('Gerar código'));
    expect(
      await screen.findByLabelText('Código de convite: A B C D E   F G H J K'),
    ).toBeOnTheScreen();
  });

  test('CT-FAMR-204: erro ao gerar o convite mostra a mensagem da API', async () => {
    await abrir(SOZINHA, {
      'POST /family/invites': {
        status: 422,
        body: { code: 'LIMIT_REACHED', message: 'Você já tem convites demais abertos.' },
      },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Convidar outro responsável' }),
    );
    await fireEvent.press(botao('Gerar código'));
    expect(await screen.findByText('Você já tem convites demais abertos.')).toBeOnTheScreen();
  });

  test('CT-FAMR-205: remover pede confirmação e só envia depois dela', async () => {
    const fake = await abrir(DONO_COM_OUTRO, { 'DELETE /family/guardians/v-2': { status: 204 } });
    await fireEvent.press(await screen.findByRole('button', { name: 'Remover j***@e***.com.br' }));
    expect(screen.getByText(/perde o acesso agora/)).toBeOnTheScreen();
    expect(enviou(fake, 'DELETE')).toBe(false);
    await fireEvent.press(botao('Não, voltar'));
    expect(enviou(fake, 'DELETE')).toBe(false);
    await fireEvent.press(botao('Remover j***@e***.com.br'));
    await fireEvent.press(botao('Sim, remover'));
    await waitFor(() =>
      expect(fake.calls.some((c) => c.key === 'DELETE /family/guardians/v-2')).toBe(true),
    );
  });

  test('CT-FAMR-206: passar a propriedade pede confirmação e envia o vínculo escolhido', async () => {
    const fake = await abrir(DONO_COM_OUTRO, {
      'POST /family/transfer': { status: 200, body: { ...DONO_COM_OUTRO, role: 'GUARDIAN' } },
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Passar a propriedade para j***@e***.com.br' }),
    );
    expect(
      screen.getByText(/vira a dona da família e você passa a ser responsável/),
    ).toBeOnTheScreen();
    await fireEvent.press(botao('Sim, passar a propriedade'));
    await waitFor(() =>
      expect(corpoDe(fake, 'POST /family/transfer')).toEqual({ guardianId: 'v-2' }),
    );
  });

  test('CT-FAMR-207: o dono vê os convites abertos e pode cancelá-los', async () => {
    const fake = await abrir(DONO_COM_OUTRO, { 'DELETE /family/invites': { status: 204 } });
    expect(await screen.findByText('Há 1 convite aberto.')).toBeOnTheScreen();
    await fireEvent.press(botao('Cancelar os convites abertos'));
    await waitFor(() =>
      expect(fake.calls.some((c) => c.key === 'DELETE /family/invites')).toBe(true),
    );
  });

  test('CT-FAMR-208: o dono com outros responsáveis não vê "Sair": precisa passar a propriedade', async () => {
    await abrir(DONO_COM_OUTRO);
    expect(
      await screen.findByText(/passe a propriedade a outro responsável antes/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sair da família' })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Entrar na família de outra pessoa' }),
    ).not.toBeOnTheScreen();
  });

  test('CT-FAMR-209: o responsável só pode sair, e só depois de confirmar', async () => {
    const fake = await abrir(RESPONSAVEL, { 'POST /family/leave': { status: 204 } });
    await screen.findByRole('button', { name: 'Sair da família' });
    for (const nome of [/Convidar/, /Remover/, /Passar a propriedade/, /Cancelar os convites/]) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeOnTheScreen();
    }
    await fireEvent.press(botao('Sair da família'));
    expect(screen.getByText(/passa a ter uma família só sua, vazia/)).toBeOnTheScreen();
    expect(enviou(fake, 'POST')).toBe(false);
    await fireEvent.press(botao('Sim, sair da família'));
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'POST /family/leave')).toBe(true));
  });

  test('CT-FAMR-210: erro ao carregar a família permite tentar de novo', async () => {
    const fake = createFakeFetch({ 'GET /family': { status: 503, body: undefined } });
    await renderScreen(<ResponsaveisDaFamilia />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});

describe('entrar na família com um código (B15)', () => {
  const entrou = (moved: number) => ({
    status: 200,
    body: { household: DONO_COM_OUTRO, moved },
  });

  test('CT-FAMR-211: sem código, mostra o erro e não envia', async () => {
    const fake = createFakeFetch({});
    await renderScreen(<EntrarNaFamiliaScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Entrar na família' }));
    expect(screen.getByText('Digite o código que você recebeu.')).toBeOnTheScreen();
    expect(enviou(fake, 'POST')).toBe(false);
  });

  test('CT-FAMR-212: entra com o código e leva para a aba Conta', async () => {
    const fake = createFakeFetch({ 'POST /family/join': entrou(0) });
    await renderScreen(<EntrarNaFamiliaScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Código de convite'), ' ABCDE-FGHJK ');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar na família' }));
    expect(await screen.findByText(/Agora você é responsável por esta família/)).toBeOnTheScreen();
    expect(screen.getByText(/Você já vê as pessoas e as doses da família/)).toBeOnTheScreen();
    expect(corpoDe(fake, 'POST /family/join')).toEqual({ code: 'ABCDE-FGHJK' });
    await fireEvent.press(screen.getByRole('button', { name: 'Ver a família' }));
    expect(mockReplace).toHaveBeenCalledWith('/conta');
  });

  test('CT-FAMR-213: código que não vale mostra a mensagem da API, sem pedir confirmação', async () => {
    const fake = createFakeFetch({
      'POST /family/join': {
        status: 400,
        body: { code: 'INVALID_INVITE', message: 'Este código não vale. Confira o código.' },
      },
    });
    await renderScreen(<EntrarNaFamiliaScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Código de convite'), 'AAAAA-AAAAA');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar na família' }));
    expect(await screen.findByText('Este código não vale. Confira o código.')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Levar minhas pessoas e entrar' }),
    ).not.toBeOnTheScreen();
  });

  test('CT-FAMR-214: quem já tem pessoas confirma levá-las e o envio leva a confirmação', async () => {
    let chamadas = 0;
    const fake = createFakeFetch({
      'POST /family/join': () => {
        chamadas += 1;
        return chamadas === 1
          ? {
              status: 409,
              body: {
                code: 'HOUSEHOLD_HAS_MEMBERS',
                message: 'Você já tem pessoas cadastradas.',
                memberCount: 2,
              },
            }
          : entrou(2);
      },
    });
    await renderScreen(<EntrarNaFamiliaScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Código de convite'), 'ABCDE-FGHJK');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar na família' }));
    expect(await screen.findByText('Você já tem 2 pessoas cadastradas.')).toBeOnTheScreen();
    expect(
      screen.getByText(/todos os responsáveis poderão ver e editar os dados delas/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Levar minhas pessoas e entrar' }));
    expect(await screen.findByText(/2 pessoas suas passaram para a família/)).toBeOnTheScreen();
    const corpos = fake.calls.filter((c) => c.key === 'POST /family/join').map((c) => c.body);
    expect(corpos).toEqual([{ code: 'ABCDE-FGHJK' }, { code: 'ABCDE-FGHJK', moveMembers: true }]);
  });

  test('CT-FAMR-215: "Voltar" na confirmação desiste sem enviar de novo', async () => {
    const fake = createFakeFetch({
      'POST /family/join': {
        status: 409,
        body: { code: 'HOUSEHOLD_HAS_MEMBERS', message: 'x', memberCount: 1 },
      },
    });
    await renderScreen(<EntrarNaFamiliaScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Código de convite'), 'ABCDE-FGHJK');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar na família' }));
    expect(await screen.findByText('Você já tem 1 pessoa cadastrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await waitFor(() =>
      expect(screen.queryByText('Você já tem 1 pessoa cadastrada.')).not.toBeOnTheScreen(),
    );
    expect(fake.calls.filter((c) => c.key === 'POST /family/join')).toHaveLength(1);
  });

  test('CT-FAMR-216: a tela avisa que as duas partes passam a ver os dados uma da outra', async () => {
    await renderScreen(<EntrarNaFamiliaScreen />, createFakeFetch({}).fetchFn);
    expect(
      await screen.findByText(/passa a ver os dados de saúde das pessoas da família/),
    ).toBeOnTheScreen();
  });
});

describe('excluir a conta com família (B15)', () => {
  const abrirConta = async (familia: HouseholdResponse) => {
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'GET /family': { status: 200, body: familia },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir minha conta' }));
  };

  test('CT-FAMR-220: quem está só apaga tudo, como antes', async () => {
    await abrirConta(SOZINHA);
    expect(
      await screen.findByText(/apagar as pessoas cadastradas, as doses, o histórico/),
    ).toBeOnTheScreen();
  });

  test('CT-FAMR-221: o responsável só sai: as pessoas ficam com os outros', async () => {
    await abrirConta(RESPONSAVEL);
    const texto = await screen.findByText(/continuam com os outros responsáveis da família/);
    expect(texto).toBeOnTheScreen();
    expect(screen.queryByText(/passa para/)).not.toBeOnTheScreen();
  });

  test('CT-FAMR-222: o dono é avisado de quem herda a propriedade', async () => {
    await abrirConta(DONO_COM_OUTRO);
    expect(
      await screen.findByText(/A propriedade da família passa para j\*\*\*@e\*\*\*\.com\.br/),
    ).toBeOnTheScreen();
  });
});
