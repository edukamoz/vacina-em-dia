import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createFakeFetch, memorySessionStore, renderScreen } from '../../test-utils';
import { ForgotPasswordScreen } from './forgot-password-screen';
import { ResetPasswordScreen } from './reset-password-screen';
import { clearResetTokenFromUrl, readResetToken } from './reset-token';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
const g = globalThis as unknown as { window?: unknown };
const originalWindow = g.window;

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  g.window = originalWindow;
});

function fakeWindow(hash: string) {
  const replaceState = jest.fn();
  g.window = {
    location: { hash, pathname: '/redefinir-senha', search: '' },
    history: { replaceState },
  };
  return replaceState;
}

describe('token do link', () => {
  test.each([
    [`#token=${TOKEN}`, TOKEN],
    ['', null],
    ['#token=', null],
    ['#token=curto', null],
    [`#outro=${TOKEN}`, null],
    [`?token=${TOKEN}`, null],
    [`#token=${TOKEN}&x=1`, null],
    [`#token=${'a'.repeat(201)}`, null],
  ])('CT-RST-W01: fragmento %p dá %p', (hash, expected) => {
    expect(readResetToken(hash)).toBe(expected);
  });

  test('CT-RST-W02: sem navegador, não há token e limpar o endereço não faz nada', () => {
    g.window = undefined;
    expect(readResetToken()).toBeNull();
    expect(() => clearResetTokenFromUrl()).not.toThrow();
  });

  test('CT-RST-W03: lê o fragmento da página atual e o apaga do endereço', () => {
    const replaceState = fakeWindow(`#token=${TOKEN}`);
    expect(readResetToken()).toBe(TOKEN);
    clearResetTokenFromUrl();
    expect(replaceState).toHaveBeenCalledWith(null, '', '/redefinir-senha');
  });
});

describe('tela "Esqueci minha senha"', () => {
  test('CT-RST-W10: envia o pedido e mostra a mesma confirmação sem dizer se a conta existe', async () => {
    const fake = createFakeFetch({ 'POST /auth/forgot-password': { status: 202 } });
    await renderScreen(<ForgotPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), ' mariana@exemplo.com.br ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar o link' }));
    expect(await screen.findByText(/Se existir uma conta com este e-mail/)).toBeOnTheScreen();
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /auth/forgot-password',
      body: { email: 'mariana@exemplo.com.br' },
    });
    expect(fake.calls[0]?.headers['Authorization']).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para Entrar' }));
    expect(mockReplace).toHaveBeenCalledWith('/entrar');
  });

  test('CT-RST-W11: e-mail inválido mostra o que corrigir e não chama a API', async () => {
    const fake = createFakeFetch({});
    await renderScreen(<ForgotPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'sem-arroba');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar o link' }));
    expect(await screen.findByText(/Informe um e-mail válido/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-RST-W12: limite de pedidos (429) e falha de rede mostram mensagem simples', async () => {
    const limited = createFakeFetch({
      'POST /auth/forgot-password': {
        status: 429,
        body: {
          code: 'RATE_LIMITED',
          message: 'Muitos pedidos de nova senha. Tente de novo mais tarde.',
        },
      },
    });
    await renderScreen(<ForgotPasswordScreen />, limited.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'mariana@exemplo.com.br');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar o link' }));
    expect(await screen.findByText(/Muitos pedidos de nova senha/)).toBeOnTheScreen();
  });

  test('CT-RST-W13: falha inesperada não mostra detalhe técnico', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('detalhe interno'));
    await renderScreen(<ForgotPasswordScreen />, fetchFn as unknown as typeof fetch, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'mariana@exemplo.com.br');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar o link' }));
    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeOnTheScreen();
    expect(screen.queryByText(/detalhe interno/)).not.toBeOnTheScreen();
  });
});

describe('tela "Criar nova senha"', () => {
  test('CT-RST-W20: com o link, troca a senha, apaga o token do endereço e leva a Entrar', async () => {
    const replaceState = fakeWindow(`#token=${TOKEN}`);
    const fake = createFakeFetch({ 'POST /auth/reset-password': { status: 204 } });
    await renderScreen(<ResetPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/redefinir-senha');
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'outra frase longa e boa');
    await fireEvent.changeText(
      screen.getByLabelText('Repita a nova senha'),
      'outra frase longa e boa',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar a nova senha' }));
    expect(await screen.findByText(/Agora entre com a sua nova senha/)).toBeOnTheScreen();
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /auth/reset-password',
      body: { token: TOKEN, password: 'outra frase longa e boa' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockReplace).toHaveBeenCalledWith('/entrar');
  });

  test('CT-RST-W21: senha curta mostra o que corrigir e não chama a API', async () => {
    fakeWindow(`#token=${TOKEN}`);
    const fake = createFakeFetch({});
    await renderScreen(<ResetPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'curta');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar a nova senha' }));
    expect(
      await screen.findByText(/Use pelo menos 8 caracteres\. Uma frase longa/),
    ).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-RST-W22: link vencido ou já usado mostra a mensagem e oferece pedir outro', async () => {
    fakeWindow(`#token=${TOKEN}`);
    const fake = createFakeFetch({
      'POST /auth/reset-password': {
        status: 400,
        body: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Este link não vale mais. Peça uma nova senha para receber outro.',
        },
      },
    });
    await renderScreen(<ResetPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'outra frase longa e boa');
    await fireEvent.changeText(
      screen.getByLabelText('Repita a nova senha'),
      'outra frase longa e boa',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar a nova senha' }));
    expect(await screen.findByText(/Este link não vale mais/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pedir um novo link' }));
    expect(mockReplace).toHaveBeenCalledWith('/esqueci-senha');
  });

  test('CT-RST-W23: sem token no endereço, avisa que o link está incompleto', async () => {
    fakeWindow('');
    const fake = createFakeFetch({});
    await renderScreen(<ResetPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    expect(screen.getByText(/Este link não está completo/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pedir nova senha' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/esqueci-senha'));
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-RST-W24: falha inesperada ao salvar mostra mensagem simples', async () => {
    fakeWindow(`#token=${TOKEN}`);
    const fetchFn = jest.fn().mockRejectedValue(new Error('x'));
    await renderScreen(<ResetPasswordScreen />, fetchFn as unknown as typeof fetch, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'outra frase longa e boa');
    await fireEvent.changeText(
      screen.getByLabelText('Repita a nova senha'),
      'outra frase longa e boa',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar a nova senha' }));
    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeOnTheScreen();
  });

  test('CT-RST-W26: senha repetida diferente mostra o erro; nada é enviado', async () => {
    fakeWindow(`#token=${TOKEN}`);
    const fake = createFakeFetch({});
    await renderScreen(<ResetPasswordScreen />, fake.fetchFn, {
      store: memorySessionStore().store,
    });
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'outra frase longa e boa');
    await fireEvent.changeText(screen.getByLabelText('Repita a nova senha'), 'outra frase');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar a nova senha' }));
    expect(await screen.findByText(/As senhas não são iguais/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });
});
