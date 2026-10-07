import type * as Dates from '../lib/dates';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccountScreen } from './account/account-screen';
import { ConsentScreen } from './consent/consent-screen';
import { FamilyScreen, resumoDaPessoa } from './family/family-screen';
import { EditMemberScreen, NewMemberScreen } from './family/member-form-screen';
import {
  ACCEPTED,
  MEMBER,
  OTHER_MEMBER,
  createFakeFetch,
  dose,
  memberDoses,
  renderScreen,
  type FakeRoutes,
} from '../test-utils';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
}));
jest.mock('../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../lib/dates'),
  todayCivil: () => '2026-10-06',
}));

const NOT_ACCEPTED = {
  accepted: false,
  termVersion: null,
  acceptedAt: null,
  guardianDeclaration: false,
};

beforeEach(() => jest.clearAllMocks());

describe('consentimento (RF09)', () => {
  test('CT-APP-C01: só libera o botão depois de aceitar o termo e envia o aceite', async () => {
    const fake = createFakeFetch({ 'PUT /consent': { status: 200, body: ACCEPTED } });
    await renderScreen(<ConsentScreen />, fake.fetchFn);
    const botao = screen.getByRole('button', { name: 'Aceitar e continuar' });
    expect(botao).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).not.toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar e continuar' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fake.calls[0]).toMatchObject({
      key: 'PUT /consent',
      body: { acceptedTerms: true, termVersion: '2026-10-06', guardianDeclaration: false },
    });
  });

  test('CT-APP-C02: a declaração de responsável legal segue junto com o aceite', async () => {
    const fake = createFakeFetch({ 'PUT /consent': { status: 200, body: ACCEPTED } });
    await renderScreen(<ConsentScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /responsável legal/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    await waitFor(() => expect(fake.calls[0]?.body).toMatchObject({ guardianDeclaration: true }));
  });

  test('CT-APP-C03: mostra o termo em linguagem simples e a falha do servidor', async () => {
    const fake = createFakeFetch({
      'PUT /consent': {
        status: 500,
        body: { code: 'INTERNAL_ERROR', message: 'Algo deu errado.' },
      },
    });
    await renderScreen(<ConsentScreen />, fake.fetchFn);
    expect(screen.getByText(/Não pedimos CPF nem o Cartão Nacional de Saúde/)).toBeOnTheScreen();
    expect(screen.getByText(/Versão do termo: 2026-10-06/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByText('Algo deu errado.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('família (RF02)', () => {
  test('CT-APP-F01: sem ninguém cadastrado, convida a adicionar a primeira pessoa', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<FamilyScreen />, fake.fetchFn);
    expect(await screen.findByText('Ninguém cadastrado ainda')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/membro/novo');
  });

  test('CT-APP-F02: lista as pessoas com idade e faixa, e abre calendário e edição', async () => {
    const fake = createFakeFetch({
      'GET /members': {
        status: 200,
        body: { items: [MEMBER, { ...OTHER_MEMBER, isPregnant: true }] },
      },
    });
    await renderScreen(<FamilyScreen />, fake.fetchFn);
    expect(await screen.findByText('16 meses · Criança')).toBeOnTheScreen();
    expect(screen.getByText('36 anos · Adulto · gestante')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver vacinas de Maria' }));
    expect(mockPush).toHaveBeenCalledWith('/');
    await fireEvent.press(screen.getByRole('link', { name: 'Editar João' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/membro/[id]', params: { id: 'm-2' } });
  });

  test('CT-APP-F04: cada cartão mostra o resumo das doses da pessoa', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER, OTHER_MEMBER] } },
      'GET /members/m-1/doses': {
        status: 200,
        body: memberDoses([
          dose({ id: 'a', status: 'OVERDUE' }),
          dose({ id: 'b', status: 'OVERDUE' }),
        ]),
      },
      'GET /members/m-2/doses': {
        status: 200,
        body: memberDoses(
          [dose({ id: 'c', status: 'SCHEDULED', scheduledDate: '2026-11-04' })],
          OTHER_MEMBER,
        ),
      },
    });
    await renderScreen(<FamilyScreen />, fake.fetchFn);
    expect(await screen.findByLabelText('2 doses atrasadas')).toBeOnTheScreen();
    expect(await screen.findByLabelText('1 dose agendada')).toBeOnTheScreen();
  });

  test('CT-APP-F05: resumoDaPessoa dá preferência às atrasadas e depois às agendadas', () => {
    expect(resumoDaPessoa([{ status: 'OVERDUE' }, { status: 'SCHEDULED' }])).toEqual({
      status: 'OVERDUE',
      rotulo: '1 dose atrasada',
    });
    expect(resumoDaPessoa([{ status: 'SCHEDULED' }, { status: 'SCHEDULED' }]).rotulo).toBe(
      '2 doses agendadas',
    );
    expect(resumoDaPessoa([{ status: 'PENDING' }, { status: 'APPLIED' }])).toEqual({
      status: 'APPLIED',
      rotulo: 'Nenhuma dose atrasada',
    });
  });

  test('CT-APP-F03: com a API fora do ar mostra erro simples e permite tentar de novo', async () => {
    const routes: FakeRoutes = { 'GET /members': { status: 503, body: undefined } };
    const fake = createFakeFetch(routes);
    await renderScreen(<FamilyScreen />, fake.fetchFn);
    expect(await screen.findByText(/O servidor não conseguiu responder/)).toBeOnTheScreen();

    routes['GET /members'] = { status: 200, body: { items: [MEMBER] } };
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Maria')).toBeOnTheScreen();
  });
});

describe('formulário de pessoa (RF02)', () => {
  test('CT-APP-M01: confere os campos antes de enviar', async () => {
    const fake = createFakeFetch({});
    await renderScreen(<NewMemberScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar e ver as vacinas' }));
    expect(screen.getByText('Informe o nome ou um apelido.')).toBeOnTheScreen();
    expect(screen.getByText(/Digite a data completa/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('Nome ou apelido'), 'Maria');
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '01012030');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar e ver as vacinas' }));
    expect(screen.getByText('A data de nascimento não pode ser no futuro.')).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-APP-M02: cadastra a pessoa com máscara na data e abre o calendário dela', async () => {
    const fake = createFakeFetch({ 'POST /members': { status: 201, body: MEMBER } });
    await renderScreen(<NewMemberScreen />, fake.fetchFn);
    await fireEvent.changeText(screen.getByLabelText('Nome ou apelido'), '  Maria ');
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '20052025');
    expect(screen.getByLabelText('Data de nascimento').props.value).toBe('20/05/2025');
    await fireEvent.press(screen.getByRole('checkbox', { name: /está grávida/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar e ver as vacinas' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /members',
      body: { name: 'Maria', birthDate: '2025-05-20', isPregnant: true },
    });
  });

  test('CT-APP-M03: mostra a mensagem do servidor, por exemplo a falta da declaração de responsável', async () => {
    const fake = createFakeFetch({
      'POST /members': {
        status: 422,
        body: {
          code: 'GUARDIAN_DECLARATION_REQUIRED',
          message:
            'Para cadastrar uma criança ou adolescente, confirme que você é o responsável legal.',
        },
      },
    });
    await renderScreen(<NewMemberScreen />, fake.fetchFn);
    await fireEvent.changeText(screen.getByLabelText('Nome ou apelido'), 'Maria');
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '20052025');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar e ver as vacinas' }));
    expect(await screen.findByText(/confirme que você é o responsável legal/)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('CT-APP-M04: edita uma pessoa já preenchida e volta', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'PUT /members/m-1': { status: 200, body: { ...MEMBER, name: 'Maria Clara' } },
      'GET /members/m-1/doses': { status: 200, body: { items: [] } },
    });
    await renderScreen(<EditMemberScreen id="m-1" />, fake.fetchFn);
    const nome = await screen.findByDisplayValue('Maria');
    expect(screen.getByDisplayValue('20/05/2025')).toBeOnTheScreen();
    await fireEvent.changeText(nome, 'Maria Clara');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(fake.calls.find((c) => c.key === 'PUT /members/m-1')?.body).toMatchObject({
      name: 'Maria Clara',
      birthDate: '2025-05-20',
    });
  });

  test('CT-APP-M05: excluir pede confirmação e só então apaga', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'DELETE /members/m-1': { status: 204 },
    });
    await renderScreen(<EditMemberScreen id="m-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir Maria' }));
    expect(fake.calls.some((c) => c.key.startsWith('DELETE'))).toBe(false);
    expect(screen.getByText(/Não dá para desfazer/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Não, voltar' }));
    expect(screen.queryByText(/Não dá para desfazer/)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Excluir Maria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, excluir' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fake.calls.some((c) => c.key === 'DELETE /members/m-1')).toBe(true);
  });

  test('CT-APP-M06: erro ao excluir é exibido na confirmação', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'DELETE /members/m-1': { status: 500, body: undefined },
    });
    await renderScreen(<EditMemberScreen id="m-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir Maria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, excluir' }));
    expect(await screen.findByText(/O servidor não conseguiu responder/)).toBeOnTheScreen();
  });

  test('CT-APP-M07: pessoa inexistente ou erro de carga têm mensagens próprias', async () => {
    const vazio = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<EditMemberScreen id="x" />, vazio.fetchFn);
    expect(await screen.findByText('Pessoa não encontrada')).toBeOnTheScreen();
  });

  test('CT-APP-M08: erro ao carregar a pessoa permite tentar de novo', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 503, body: undefined } });
    await renderScreen(<EditMemberScreen id="m-1" />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});

describe('conta (RF09)', () => {
  test('CT-APP-X01: mostra o termo aceito e a troca de aparência', async () => {
    const fake = createFakeFetch({ 'GET /consent': { status: 200, body: ACCEPTED } });
    await renderScreen(<AccountScreen />, fake.fetchFn);
    expect(await screen.findByText(/versão 2026-10-06/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Escuro' })).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();
  });

  test('CT-APP-X02: sem consentimento, informa que o termo ainda não foi aceito', async () => {
    const fake = createFakeFetch({ 'GET /consent': { status: 200, body: NOT_ACCEPTED } });
    await renderScreen(<AccountScreen />, fake.fetchFn);
    expect(await screen.findByText(/ainda não aceitou/)).toBeOnTheScreen();
  });

  test('CT-APP-X03: excluir a conta pede confirmação, apaga tudo e encerra a sessão', async () => {
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'DELETE /account': { status: 204 },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Excluir minha conta e todos os dados' }),
    );
    expect(fake.calls.some((c) => c.key === 'DELETE /account')).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Não, voltar' }));
    expect(screen.queryByText('Excluir tudo?')).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Excluir minha conta e todos os dados' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, excluir tudo' }));
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'DELETE /account')).toBe(true));
  });

  test('CT-APP-X04: falha ao excluir a conta é exibida', async () => {
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'DELETE /account': { status: 500, body: undefined },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Excluir minha conta e todos os dados' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, excluir tudo' }));
    expect(await screen.findByText(/O servidor não conseguiu responder/)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
