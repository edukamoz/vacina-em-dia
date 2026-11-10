import type * as Dates from '../lib/dates';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SeletorDeData } from './seletor-de-data';

jest.mock('../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../lib/dates'),
  todayCivil: () => '2026-10-06',
}));

describe('seletor de data', () => {
  test('CT-CAL-06: mostra o mês da data escolhida e devolve o dia tocado', async () => {
    const aoEscolher = jest.fn();
    await render(<SeletorDeData rotulo="Data" valor="2026-10-06" aoEscolher={aoEscolher} />);
    expect(screen.getByText('outubro de 2026')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '6 de outubro de 2026' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: '20 de outubro de 2026' }));
    expect(aoEscolher).toHaveBeenCalledWith('2026-10-20');
  });

  test('CT-CAL-07: navega entre os meses', async () => {
    await render(<SeletorDeData rotulo="Data" valor="2026-10-06" aoEscolher={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('novembro de 2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('setembro de 2026')).toBeOnTheScreen();
  });

  test('CT-CAL-08: com data mínima, dias anteriores ficam desativados e não escolhem nada', async () => {
    const aoEscolher = jest.fn();
    await render(
      <SeletorDeData
        rotulo="Data"
        valor="2026-10-06"
        aoEscolher={aoEscolher}
        minimo="2026-10-06"
      />,
    );
    const ontem = screen.getByRole('button', { name: '5 de outubro de 2026' });
    expect(ontem).toBeDisabled();
    await fireEvent.press(ontem);
    expect(aoEscolher).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '7 de outubro de 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
  });

  test('CT-CAL-09: com data máxima, dias futuros ficam desativados e não há mês seguinte', async () => {
    await render(
      <SeletorDeData rotulo="Data" valor="2026-10-06" aoEscolher={jest.fn()} maximo="2026-10-06" />,
    );
    expect(screen.getByRole('button', { name: '7 de outubro de 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '6 de outubro de 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });

  test('CT-CAL-10: sem data escolhida abre no mês de hoje', async () => {
    await render(<SeletorDeData rotulo="Data" valor={null} aoEscolher={jest.fn()} />);
    expect(screen.getByText('outubro de 2026')).toBeOnTheScreen();
  });

  test('CT-CAL-11: chega a setembro de 2002 em poucos toques, sem andar mês a mês', async () => {
    const aoEscolher = jest.fn();
    await render(<SeletorDeData rotulo="Data" valor="2026-10-06" aoEscolher={aoEscolher} />);
    await fireEvent.press(screen.getByRole('button', { name: /outubro de 2026\. Tocar/ }));
    // Grade de anos: 2016 a 2027; duas páginas para trás chegam a 1992-2003.
    expect(screen.getByText('2016 a 2027')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Anos anteriores' }));
    expect(screen.getByText('2004 a 2015')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Anos anteriores' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ano 2002' }));
    await fireEvent.press(screen.getByRole('button', { name: 'setembro de 2002' }));
    expect(screen.getByRole('button', { name: /setembro de 2002\. Tocar/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '14 de setembro de 2002' }));
    expect(aoEscolher).toHaveBeenCalledWith('2002-09-14');
  });

  test('CT-CAL-12: na grade de meses dá para trocar de ano e voltar à grade de anos', async () => {
    await render(<SeletorDeData rotulo="Data" valor="2026-10-06" aoEscolher={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: /outubro de 2026\. Tocar/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ano 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ano anterior' }));
    expect(screen.getByRole('button', { name: /Ano 2025\. Tocar/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Ano 2025\. Tocar/ }));
    expect(screen.getByRole('button', { name: 'Ano 2025' })).toBeOnTheScreen();
  });

  test('CT-CAL-13: anos e meses fora do mínimo e do máximo ficam desativados', async () => {
    await render(
      <SeletorDeData
        rotulo="Data"
        valor="2026-10-06"
        aoEscolher={jest.fn()}
        minimo="2024-03-10"
        maximo="2026-10-06"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /outubro de 2026\. Tocar/ }));
    expect(screen.getByRole('button', { name: 'Ano 2027' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ano 2023' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ano 2024' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próximos anos' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ano 2024' }));
    expect(screen.getByRole('button', { name: 'fevereiro de 2024' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'março de 2024' })).toBeEnabled();
  });
});
