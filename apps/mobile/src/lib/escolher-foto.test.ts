import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { enderecoDaFoto, escolherFotoDePerfil, LADO_DA_FOTO } from './escolher-foto';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

const picker = jest.mocked(ImagePicker);
const manipulator = jest.mocked(ImageManipulator);
const ESCOLHIDA = { canceled: false, assets: [{ uri: 'file:///foto.jpg' }] };

beforeEach(() => {
  jest.resetAllMocks();
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchImageLibraryAsync.mockResolvedValue(ESCOLHIDA as never);
  picker.launchCameraAsync.mockResolvedValue(ESCOLHIDA as never);
  manipulator.manipulateAsync.mockResolvedValue({ base64: 'QUJD' } as never);
});

describe('escolherFotoDePerfil', () => {
  test.each([
    ['galeria', 'launchImageLibraryAsync'],
    ['camera', 'launchCameraAsync'],
  ] as const)('CT-APP-ARQ10: da %s devolve um JPEG reduzido a %i px', async (origem, funcao) => {
    const resultado = await escolherFotoDePerfil(origem);
    expect(resultado).toEqual({ tipo: 'foto', foto: { contentType: 'image/jpeg', data: 'QUJD' } });
    expect(picker[funcao]).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }),
    );
    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///foto.jpg',
      [{ resize: { width: LADO_DA_FOTO, height: LADO_DA_FOTO } }],
      { compress: 0.8, format: 'jpeg', base64: true },
    );
  });

  test.each([
    ['camera', 'requestCameraPermissionsAsync'],
    ['galeria', 'requestMediaLibraryPermissionsAsync'],
  ] as const)(
    'CT-APP-ARQ11: sem permissão na %s devolve "negado" sem abrir o seletor',
    async (origem, pedido) => {
      picker[pedido].mockResolvedValue({ granted: false } as never);
      expect(await escolherFotoDePerfil(origem)).toEqual({ tipo: 'negado' });
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    },
  );

  test('CT-APP-ARQ12: cancelar (ou resultado sem imagem) devolve "cancelado"', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    expect(await escolherFotoDePerfil('galeria')).toEqual({ tipo: 'cancelado' });
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [] } as never);
    expect(await escolherFotoDePerfil('galeria')).toEqual({ tipo: 'cancelado' });
  });

  test('CT-APP-ARQ13: se a redução não devolver a imagem, trata como cancelado', async () => {
    manipulator.manipulateAsync.mockResolvedValue({} as never);
    expect(await escolherFotoDePerfil('galeria')).toEqual({ tipo: 'cancelado' });
  });

  test('CT-APP-ARQ14: na web a galeria não pede permissão (é o seletor de arquivos do navegador)', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      await escolherFotoDePerfil('galeria');
      expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
      expect(picker.launchImageLibraryAsync).toHaveBeenCalled();
    } finally {
      os.restore();
    }
  });
});

test('CT-APP-ARQ15: enderecoDaFoto monta o endereço data: da imagem', () => {
  expect(enderecoDaFoto({ contentType: 'image/png', data: 'QUJD' })).toBe(
    'data:image/png;base64,QUJD',
  );
});
