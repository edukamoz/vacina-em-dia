import { screen } from '@testing-library/react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { POLITICA_DE_PRIVACIDADE, PRIVACY_CONTACT, TERMOS_DE_USO } from './legal-content';
import { LegalScreen } from './legal-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));

describe('textos legais', () => {
  test.each([
    ['CT-APP-LG01', TERMOS_DE_USO],
    ['CT-APP-LG02', POLITICA_DE_PRIVACIDADE],
  ])('%s: mostra título, versão e todas as seções de "%#"', async (_id, documento) => {
    await renderScreen(<LegalScreen documento={documento} />, createFakeFetch({}).fetchFn);
    expect(screen.getByRole('header', { name: documento.titulo })).toBeOnTheScreen();
    expect(screen.getByText(documento.subtitulo)).toBeOnTheScreen();
    for (const secao of documento.secoes) {
      expect(screen.getByRole('header', { name: secao.titulo })).toBeOnTheScreen();
    }
  });

  test('CT-APP-LG03: a política diz o que não é coletado, com quem divide e como falar com o autor', () => {
    const texto = POLITICA_DE_PRIVACIDADE.secoes.flatMap((s) => s.paragrafos).join(' ');
    expect(texto).toContain('CPF nem Cartão Nacional de Saúde');
    expect(texto).toContain('Brevo');
    expect(texto).toContain('Azure');
    expect(texto).toContain(PRIVACY_CONTACT);
  });

  test('CT-APP-LG04: os termos dizem que o app não substitui a caderneta nem o profissional de saúde', () => {
    const texto = TERMOS_DE_USO.secoes.flatMap((s) => s.paragrafos).join(' ');
    expect(texto).toMatch(/não substitui a caderneta de vacinação oficial/);
  });
});
