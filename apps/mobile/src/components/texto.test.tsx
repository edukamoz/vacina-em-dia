import { render, screen } from '@testing-library/react-native';
import { Texto, textColorClass } from './texto';

describe('textColorClass', () => {
  test('CT-UI-12: sem cor própria, usa a cor padrão do texto', () => {
    expect(textColorClass('')).toBe('text-texto');
    expect(textColorClass('mt-lg')).toBe('text-texto');
  });

  test.each([
    'text-erro',
    'text-sobrePrimaria',
    'mt-lg text-textoSecundario',
    'text-aplicada font-negrito',
  ])(
    'CT-UI-13: com cor própria (%s), não adiciona a cor padrão (evita conflito de CSS)',
    (className) => {
      expect(textColorClass(className)).toBe('');
    },
  );

  test('CT-UI-14: classes de tamanho (text-corpo) não contam como cor', () => {
    expect(textColorClass('text-corpo')).toBe('text-texto');
  });
});

describe('Texto', () => {
  test('CT-UI-15: renderiza o conteúdo', async () => {
    await render(<Texto variante="titulo1">Olá</Texto>);
    expect(screen.getByText('Olá')).toBeOnTheScreen();
  });
});
