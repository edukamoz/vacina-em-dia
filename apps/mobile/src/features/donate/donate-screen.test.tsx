import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { crc16 } from '../../lib/pix';
import { desenharQr } from './qr-pix';
import { DonateScreen, lerValor, somenteNumeros } from './donate-screen';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../../lib/config-pix', () => ({
  PIX_DA_DOACAO: {
    chave: '36b97898-6ba6-4940-9fe6-29a347ec818a',
    nome: 'Eduardo Kamo Iguei',
    cidade: 'Votorantim',
  },
}));

const copiar = jest.mocked(Clipboard.setStringAsync);

beforeEach(() => {
  copiar.mockReset();
  copiar.mockResolvedValue(true);
});

const abrir = () => renderScreen(<DonateScreen />, createFakeFetch({}).fetchFn);

/** Texto do código Pix mostrado na tela. */
const codigoNaTela = () =>
  screen.getByLabelText('Código Pix copia e cola').props.children as string;

describe('somenteNumeros', () => {
  test.each([
    ['abc', ''],
    ['R$ 15', '15'],
    ['12,5', '12,5'],
    ['12,567', '12,56'],
    ['1,2,3', '1,23'],
    ['1.234,50', '1234,50'],
    ['12.5', '12,5'],
    ['1e5', '15'],
    ['-10', '10'],
  ])('CT-APP-PIX30: "%s" fica "%s"', (entrada, esperado) => {
    expect(somenteNumeros(entrada)).toBe(esperado);
  });

  test('CT-APP-PIX31: letras digitadas no campo não aparecem', async () => {
    await abrir();
    const campo = await screen.findByLabelText('Outro valor (opcional)');
    await fireEvent.changeText(campo, '1a5');
    expect(campo.props.value).toBe('15');
  });
});

describe('lerValor', () => {
  test.each([
    ['10', 10],
    ['12,5', 12.5],
    ['15,00', 15],
    ['1.234,50', 1234.5],
    ['R$ 20', 20],
    ['0,01', 0.01],
  ])('CT-APP-PIX12: "%s" vira %p', (texto, esperado) => {
    expect(lerValor(texto)).toBe(esperado);
  });

  test.each(['', 'abc', '0', '0,00', '-5', '10,999', '1.23', '1e5', '9999999'])(
    'CT-APP-PIX13: "%s" é rejeitado',
    (texto) => {
      expect(lerValor(texto)).toBeNull();
    },
  );
});

describe('desenharQr', () => {
  test('CT-APP-PIX14: gera uma grade quadrada com margem e módulos escuros', () => {
    const { caminho, lado } = desenharQr('00020101021126');
    expect(lado).toBeGreaterThanOrEqual(21 + 8);
    expect(caminho.startsWith('M')).toBe(true);
    expect(caminho).toContain('h1v1h-1z');
  });
});

describe('tela Apoie o projeto', () => {
  test('CT-APP-PIX15: mostra o QR, o código sem valor e o aviso de doação voluntária', async () => {
    await abrir();
    expect(await screen.findByText('Pix com valor em aberto')).toBeOnTheScreen();
    expect(screen.getByLabelText('QR Code do Pix')).toBeOnTheScreen();
    const codigo = codigoNaTela();
    expect(codigo).toContain('br.gov.bcb.pix0136' + '36b97898-6ba6-4940-9fe6-29a347ec818a');
    expect(codigo).toContain('5918EDUARDO KAMO IGUEI');
    expect(codigo).toContain('6010VOTORANTIM');
    expect(screen.getByText(/voluntária e não libera nada/)).toBeOnTheScreen();
  });

  test('CT-APP-PIX16: escolher um valor sugerido coloca o valor no código, com CRC válido', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'R$ 10' }));
    expect(await screen.findByText('Pix de R$ 10,00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'R$ 10' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'R$ 5' })).not.toBeSelected();
    const codigo = codigoNaTela();
    expect(codigo).toContain('540510.00');
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  test('CT-APP-PIX17: tocar de novo no mesmo valor volta ao valor em aberto', async () => {
    await abrir();
    const botao = await screen.findByRole('button', { name: 'R$ 20' });
    await fireEvent.press(botao);
    await fireEvent.press(screen.getByRole('button', { name: 'R$ 20' }));
    expect(await screen.findByText('Pix com valor em aberto')).toBeOnTheScreen();
  });

  test('CT-APP-PIX18: outro valor digitado vale no lugar do sugerido', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'R$ 5' }));
    await fireEvent.changeText(screen.getByLabelText('Outro valor (opcional)'), '12,5');
    expect(await screen.findByText('Pix de R$ 12,50')).toBeOnTheScreen();
    expect(codigoNaTela()).toContain('540512.50');
  });

  test('CT-APP-PIX19: valor inválido mostra o erro e esconde o código', async () => {
    await abrir();
    await fireEvent.changeText(await screen.findByLabelText('Outro valor (opcional)'), '0');
    expect(await screen.findByText('Digite um valor, por exemplo 15,00.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Código Pix copia e cola')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('QR Code do Pix')).not.toBeOnTheScreen();
  });

  test('CT-APP-PIX20: copiar manda o código inteiro para a área de transferência', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'R$ 50' }));
    const codigo = codigoNaTela();
    await fireEvent.press(screen.getByRole('button', { name: 'Copiar código Pix' }));
    expect(await screen.findByRole('button', { name: 'Código copiado!' })).toBeOnTheScreen();
    expect(copiar).toHaveBeenCalledWith(codigo);
  });

  test('CT-APP-PIX21: se copiar falhar, avisa e mantém o código na tela', async () => {
    copiar.mockRejectedValue(new Error('sem acesso'));
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'Copiar código Pix' }));
    expect(await screen.findByText(/Não foi possível copiar/)).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('Código Pix copia e cola')).toBeOnTheScreen());
  });
});
