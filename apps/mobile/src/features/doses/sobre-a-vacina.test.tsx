import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '../../theme/theme-provider';
import { SobreAVacina } from './sobre-a-vacina';

const montar = (vacina: string) =>
  render(
    <ThemeProvider initialReduceMotion>
      <SobreAVacina vacina={vacina} />
    </ThemeProvider>,
  );

describe('sobre esta vacina (B75)', () => {
  test('CT-APP-INF01: começa fechada e abre com a composição e as contraindicações do manual', async () => {
    await montar('febre amarela');
    const botao = screen.getByRole('button', { name: 'Sobre esta vacina', expanded: false });
    expect(screen.queryByText('Composição')).not.toBeOnTheScreen();
    await fireEvent.press(botao);
    expect(screen.getByText('Composição')).toBeOnTheScreen();
    expect(screen.getByText(/vírus vivos atenuados da febre amarela/)).toBeOnTheScreen();
    expect(screen.getByText(/Crianças menores de 6 meses de vida/)).toBeOnTheScreen();
    expect(screen.getByText(/reação anafilática/)).toBeOnTheScreen();
  });

  test('CT-APP-INF02: traz o aviso, a fonte com a seção e onde achar as reações (sem copiar a tabela)', async () => {
    await montar('hepatite B');
    await fireEvent.press(screen.getByRole('button', { name: 'Sobre esta vacina' }));
    expect(screen.getByText(/não diz se você pode ou não tomar/)).toBeOnTheScreen();
    expect(screen.getByText(/Quadro 26, página 171/)).toBeOnTheScreen();
    expect(screen.getByText(/seção 12\.2\.2; lido em 12\/11\/2026/)).toBeOnTheScreen();
  });

  test('CT-APP-INF03: os botões abrem os manuais oficiais', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await montar('BCG');
    await fireEvent.press(screen.getByRole('button', { name: 'Sobre esta vacina' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Abrir o manual de eventos adversos' }),
    );
    expect(abrir).toHaveBeenLastCalledWith(
      expect.stringMatching(/^https:\/\/www\.gov\.br\/saude\/.*eventos.*\.pdf$/),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir o manual de normas' }));
    expect(abrir).toHaveBeenLastCalledWith(
      expect.stringMatching(/^https:\/\/www\.gov\.br\/saude\/.*normas.*\.pdf$/),
    );
  });

  test('CT-APP-INF04: vacina sem ficha (mais nova que os manuais) ou dose avulsa não mostra nada', async () => {
    await montar('pneumocócica 20-valente');
    expect(screen.queryByRole('button', { name: 'Sobre esta vacina' })).not.toBeOnTheScreen();
    await montar('Vacina que eu cadastrei');
    expect(screen.queryByRole('button', { name: 'Sobre esta vacina' })).not.toBeOnTheScreen();
  });
});
