import { fireEvent, screen } from '@testing-library/react-native';
import {
  OTHER_MEMBER,
  MEMBER,
  createFakeFetch,
  dose,
  memberDoses,
  renderScreen,
} from '../../test-utils';
import { PainelScreen } from './painel-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const HOJE = '2026-10-21';
const MARIA = [
  dose({ id: 'a', status: 'APPLIED', appliedDate: '2026-10-02' }),
  dose({ id: 'b', status: 'APPLIED', appliedDate: '2026-09-02' }),
  dose({ id: 'c', status: 'SCHEDULED', scheduledDate: '2026-11-10' }),
  dose({ id: 'd', status: 'OVERDUE', dueDate: '2026-08-01' }),
];
const JOAO = [
  dose({ id: 'e', memberId: 'm-2', status: 'APPLIED', appliedDate: '2026-10-05' }),
  dose({ id: 'f', memberId: 'm-2', status: 'PENDING', dueDate: '2026-12-15' }),
];

function abrir(duas = true) {
  const fake = createFakeFetch({
    'GET /members': {
      status: 200,
      body: { items: duas ? [MEMBER, OTHER_MEMBER] : [MEMBER] },
    },
    'GET /members/m-1/doses': { status: 200, body: memberDoses(MARIA) },
    'GET /members/m-2/doses': { status: 200, body: memberDoses(JOAO, OTHER_MEMBER) },
  });
  return renderScreen(<PainelScreen hoje={HOJE} />, fake.fetchFn);
}

describe('painel de gráficos (B60)', () => {
  test('CT-APP-GRA01: mostra a cobertura, os indicadores e os rótulos de cada gráfico', async () => {
    await abrir();
    expect(await screen.findByRole('header', { name: 'Painel de gráficos' })).toBeOnTheScreen();
    // 3 de 6 doses aplicadas = 50%; 1 atrasada; 1 prevista neste mês? (nenhuma em outubro)
    expect(await screen.findByLabelText('das doses já aplicadas: 50%')).toBeOnTheScreen();
    expect(screen.getByLabelText('dose atrasada: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('previstas neste mês: 0')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        /Gráfico de rosca\. 6 doses: 3 aplicadas, 1 agendadas, 1 pendentes, 1 atrasadas\. Cobertura de 50%/,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/Maria: 4 doses \(2 aplicadas, 1 agendadas, 1 atrasadas\)/),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        /doses aplicadas por mês, nos últimos 12 meses\. Total de 3 doses\. setembro de 2026: 1; outubro de 2026: 2/,
      ),
    ).toBeOnTheScreen();
  });

  test('CT-APP-GRA02: escolher uma pessoa recalcula os gráficos e esconde o "Por pessoa"', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'João' }));
    expect(screen.getByLabelText('das doses já aplicadas: 50%')).toBeOnTheScreen();
    expect(screen.getByLabelText('doses atrasadas: 0')).toBeOnTheScreen();
    expect(screen.getByText('A situação das vacinas de João, em gráficos.')).toBeOnTheScreen();
    expect(screen.queryByText('Por pessoa')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Toda a família' }));
    expect(screen.getByText('Por pessoa')).toBeOnTheScreen();
  });

  test('CT-APP-GRA03: tocar num estado da legenda o destaca (o centro mostra o número dele)', async () => {
    await abrir();
    const atrasadas = await screen.findByRole('button', { name: /Atrasadas: 1 doses, 17%/ });
    expect(atrasadas).not.toBeSelected();
    await fireEvent.press(atrasadas);
    expect(screen.getByRole('button', { name: /Atrasadas: 1 doses/ })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: /Atrasadas: 1 doses/ }));
    expect(screen.getByRole('button', { name: /Atrasadas: 1 doses/ })).not.toBeSelected();
  });

  test('CT-APP-GRA04: a tabela mostra os mesmos números por pessoa', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver os números em tabela' }));
    expect(screen.getByRole('button', { name: 'Esconder a tabela' })).toBeOnTheScreen();
    expect(screen.getAllByText('Maria').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aplicadas').length).toBeGreaterThan(0);
  });

  test('CT-APP-GRA05: avisa das doses atrasadas e das previstas fora do período', async () => {
    await abrir();
    expect(
      await screen.findByText('1 dose está atrasada e não entram nas barras.'),
    ).toBeOnTheScreen();
  });

  test('CT-APP-GRA06: sem pessoas cadastradas oferece adicionar alguém', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<PainelScreen hoje={HOJE} />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Adicionar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/membro/novo');
  });

  test('CT-APP-GRA07: pessoa sem doses mostra o aviso em vez dos gráficos', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses([]) },
    });
    await renderScreen(<PainelScreen hoje={HOJE} />, fake.fetchFn);
    expect(await screen.findByText('Ainda não há doses para mostrar')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Gráfico de rosca/)).not.toBeOnTheScreen();
  });

  test('CT-APP-GRA08: com uma só pessoa não há seletor nem "Por pessoa"', async () => {
    await abrir(false);
    expect(await screen.findByLabelText(/Gráfico de rosca/)).toBeOnTheScreen();
    expect(screen.queryByText('Toda a família')).not.toBeOnTheScreen();
    expect(screen.queryByText('Por pessoa')).not.toBeOnTheScreen();
  });
});
