import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { AccountScreen } from '../account/account-screen';
import {
  ACCEPTED,
  STORED_SESSION,
  createFakeFetch,
  memorySessionStore,
  renderScreen,
} from '../../test-utils';
import { LoginScreen } from './login-screen';
import { RegisterScreen } from './register-screen';
import { WelcomeScreen } from './welcome-screen';

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

const SESSION_BODY = {
  accessToken: 'acesso-1',
  refreshToken: 'renovacao-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  account: { id: 'conta-1', email: 'mariana@exemplo.com.br' },
};
const PASSWORD = 'uma frase longa é melhor';

beforeEach(() => jest.clearAllMocks());

async function fill(label: string, value: string) {
  await fireEvent.changeText(screen.getByLabelText(label), value);
}

async function aceitarTermos() {
  await fireEvent.press(
    screen.getByRole('checkbox', {
      name: 'Li e aceito os termos de uso e a política de privacidade',
    }),
  );
}

describe('tela de apresentação', () => {
  test('CT-APP-L01: mostra a promessa, as vantagens, o aviso e leva a "Criar conta" e "Entrar"', async () => {
    await renderScreen(<WelcomeScreen />, createFakeFetch({}).fetchFn);
    expect(
      screen.getByRole('header', { name: 'Suas vacinas e as da sua família, em dia.' }),
    ).toBeOnTheScreen();
    for (const titulo of ['Fácil de ler', 'Para toda a família', 'Com fonte oficial']) {
      expect(screen.getByText(titulo)).toBeOnTheScreen();
    }
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();

    expect(screen.getByText('Exemplo com dados inventados.')).toBeOnTheScreen();
    expect(screen.getByText('Comece a acompanhar suas doses.')).toBeOnTheScreen();

    const criar = screen.getAllByRole('button', { name: 'Criar conta' });
    expect(criar).toHaveLength(2);
    for (const botao of criar) {
      mockPush.mockClear();
      await fireEvent.press(botao);
      expect(mockPush).toHaveBeenCalledWith('/criar-conta');
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockPush).toHaveBeenCalledWith('/entrar');
  });

  test('CT-APP-L02: no computador, as vantagens ficam lado a lado (layout expandido)', async () => {
    const spy = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
    try {
      await renderScreen(<WelcomeScreen />, createFakeFetch({}).fetchFn);
      expect(screen.getByText('Fácil de ler')).toBeOnTheScreen();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('tela "Entrar"', () => {
  test('CT-APP-L10: entra com e-mail e senha corretos e vai ao app', async () => {
    const { store, box } = memorySessionStore();
    const fake = createFakeFetch({ 'POST /auth/login': { status: 200, body: SESSION_BODY } });
    await renderScreen(<LoginScreen />, fake.fetchFn, { store });
    await act(async () => {});
    await fill('E-mail', '  mariana@exemplo.com.br ');
    await fill('Senha', PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /auth/login',
      body: { email: 'mariana@exemplo.com.br', password: PASSWORD },
    });
    expect(box.saved?.accessToken).toBe('acesso-1');
  });

  test('CT-APP-L11: campos vazios ou inválidos mostram o que corrigir e não chamam a API', async () => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({});
    await renderScreen(<LoginScreen />, fake.fetchFn, { store });
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Informe um e-mail válido/)).toBeOnTheScreen();
    expect(screen.getByText('Informe a sua senha.')).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-APP-L12: e-mail ou senha incorretos mostra a mensagem da API e mantém a tela', async () => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({
      'POST /auth/login': {
        status: 401,
        body: {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos. Confira e tente de novo.',
        },
      },
    });
    await renderScreen(<LoginScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', 'errada-errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/E-mail ou senha incorretos/)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  test('CT-APP-L13: bloqueio por tentativas (429) mostra a mensagem em linguagem simples', async () => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({
      'POST /auth/login': {
        status: 429,
        body: {
          code: 'RATE_LIMITED',
          message: 'Muitas tentativas de entrar. Aguarde um pouco e tente de novo.',
        },
      },
    });
    await renderScreen(<LoginScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', 'qualquer');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Muitas tentativas de entrar/)).toBeOnTheScreen();
  });

  test('CT-APP-L14: falha inesperada mostra mensagem genérica, sem detalhe técnico', async () => {
    const { store } = memorySessionStore();
    const fetchFn = jest.fn().mockRejectedValue(new Error('detalhe interno'));
    await renderScreen(<LoginScreen />, fetchFn as unknown as typeof fetch, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', 'qualquer');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeOnTheScreen();
    expect(screen.queryByText(/detalhe interno/)).not.toBeOnTheScreen();
  });

  test('CT-APP-L15: a senha começa escondida e o botão a mostra e esconde', async () => {
    const { store } = memorySessionStore();
    await renderScreen(<LoginScreen />, createFakeFetch({}).fetchFn, { store });
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar a senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Esconder a senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  test('CT-APP-L16: "Esqueci minha senha" leva à tela de recuperação', async () => {
    const { store } = memorySessionStore();
    await renderScreen(<LoginScreen />, createFakeFetch({}).fetchFn, { store });
    await fireEvent.press(screen.getByRole('link', { name: 'Esqueci minha senha' }));
    expect(mockPush).toHaveBeenCalledWith('/esqueci-senha');
  });

  test('CT-APP-L17: "Criar conta" leva à tela de cadastro', async () => {
    const { store } = memorySessionStore();
    await renderScreen(<LoginScreen />, createFakeFetch({}).fetchFn, { store });
    await fireEvent.press(screen.getByRole('link', { name: 'Criar conta' }));
    expect(mockReplace).toHaveBeenCalledWith('/criar-conta');
  });

  test('CT-APP-L18: o título é um cabeçalho e o layout de computador mostra a marca ao lado', async () => {
    const spy = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
    try {
      const { store } = memorySessionStore();
      await renderScreen(<LoginScreen />, createFakeFetch({}).fetchFn, { store });
      expect(screen.getByRole('header', { name: 'Entrar' })).toBeOnTheScreen();
      expect(screen.getByText('Suas vacinas e as da sua família, em dia.')).toBeOnTheScreen();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('tela "Criar conta"', () => {
  test('CT-APP-L20: cria a conta e vai ao app (onde o consentimento é pedido)', async () => {
    const { store, box } = memorySessionStore();
    const fake = createFakeFetch({ 'POST /auth/register': { status: 201, body: SESSION_BODY } });
    await renderScreen(<RegisterScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', PASSWORD);
    await aceitarTermos();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fake.calls[0]?.body).toEqual({ email: 'mariana@exemplo.com.br', password: PASSWORD });
    expect(box.saved?.account.email).toBe('mariana@exemplo.com.br');
  });

  test('CT-APP-L21: senha curta e e-mail inválido mostram o que corrigir; nada é enviado', async () => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({});
    await renderScreen(<RegisterScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'sem-arroba');
    await fill('Senha', 'curta');
    await aceitarTermos();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText(/Informe um e-mail válido/)).toBeOnTheScreen();
    expect(screen.getByText(/Use pelo menos 8 caracteres\. Uma frase longa/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test.each([
    [
      409,
      'EMAIL_ALREADY_REGISTERED',
      'Já existe uma conta com este e-mail. Entre ou use outro e-mail.',
    ],
    [422, 'WEAK_PASSWORD', 'Essa senha é fácil de adivinhar. Use uma frase longa ou outra senha.'],
  ])('CT-APP-L22: erro %i (%s) mostra a mensagem da API', async (status, code, message) => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({ 'POST /auth/register': { status, body: { code, message } } });
    await renderScreen(<RegisterScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', PASSWORD);
    await aceitarTermos();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('CT-APP-L24: sem aceitar os termos e a política, a conta não é criada', async () => {
    const { store } = memorySessionStore();
    const fake = createFakeFetch({});
    await renderScreen(<RegisterScreen />, fake.fetchFn, { store });
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText(/leia e aceite os termos de uso/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-APP-L25: os links abrem os termos de uso e a política de privacidade', async () => {
    const { store } = memorySessionStore();
    await renderScreen(<RegisterScreen />, createFakeFetch({}).fetchFn, { store });
    await fireEvent.press(screen.getByRole('link', { name: 'Ler os termos de uso' }));
    expect(mockPush).toHaveBeenCalledWith('/termos');
    await fireEvent.press(screen.getByRole('link', { name: 'Ler a política de privacidade' }));
    expect(mockPush).toHaveBeenCalledWith('/privacidade');
  });

  test('CT-APP-L23: avisa que o consentimento vem a seguir e que não se pede CPF', async () => {
    const { store } = memorySessionStore();
    await renderScreen(<RegisterScreen />, createFakeFetch({}).fetchFn, { store });
    expect(screen.getByText(/termo de consentimento/)).toBeOnTheScreen();
    expect(screen.getByText(/não pede CPF/)).toBeOnTheScreen();
  });

  test('CT-APP-L24: "Já tenho conta" leva a "Entrar"; falha de rede mostra a mensagem simples', async () => {
    const { store } = memorySessionStore();
    const fetchFn = jest.fn().mockRejectedValue(new Error('x'));
    await renderScreen(<RegisterScreen />, fetchFn as unknown as typeof fetch, { store });
    await fireEvent.press(screen.getByRole('link', { name: 'Já tenho conta. Entrar' }));
    expect(mockReplace).toHaveBeenCalledWith('/entrar');
    await fill('E-mail', 'mariana@exemplo.com.br');
    await fill('Senha', PASSWORD);
    await aceitarTermos();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeOnTheScreen();
  });
});

describe('conta com login', () => {
  const logged = { ...STORED_SESSION, expiresAt: Date.now() + 3_600_000 };

  test('CT-APP-L30: mostra o e-mail da conta e "Sair" encerra a sessão', async () => {
    const { store, box } = memorySessionStore(logged);
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'POST /auth/logout': { status: 204 },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn, { store });
    expect(await screen.findByText('mariana@exemplo.com.br')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'POST /auth/logout')).toBe(true));
    await waitFor(() => expect(box.saved).toBeNull());
  });

  test('CT-APP-L31: excluir a conta apaga os dados no servidor e a sessão local', async () => {
    const { store, box } = memorySessionStore(logged);
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'DELETE /account': { status: 204 },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn, { store });
    await screen.findByText('mariana@exemplo.com.br');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, excluir tudo' }));
    await waitFor(() => expect(box.saved).toBeNull());
    expect(fake.calls.some((c) => c.key === 'POST /auth/logout')).toBe(false);
  });
});
