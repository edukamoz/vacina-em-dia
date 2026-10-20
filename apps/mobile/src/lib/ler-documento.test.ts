import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { lerDocumento } from './ler-documento';

const mockExtrair = jest.fn();
let mockSuportado = true;
jest.mock('expo-text-extractor', () => ({
  get isSupported() {
    return mockSuportado;
  },
  extractTextFromImage: (uri: string) => mockExtrair(uri),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const ARQUIVO = jest.mocked(File);
const ESCOLHIDA = { canceled: false, assets: [{ uri: 'file:///cache/doc.jpg' }] };
const apagar = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  mockSuportado = true;
  ARQUIVO.mockImplementation((() => ({ delete: apagar })) as never);
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchCameraAsync.mockResolvedValue(ESCOLHIDA as never);
  picker.launchImageLibraryAsync.mockResolvedValue(ESCOLHIDA as never);
  mockExtrair.mockResolvedValue(['  Penta 1ª dose 02/02/2026 ', '', 'Lote 1']);
});

describe('lerDocumento', () => {
  test.each([
    ['camera', 'launchCameraAsync'],
    ['galeria', 'launchImageLibraryAsync'],
  ] as const)(
    'CT-APP-OCR20: da %s devolve as linhas limpas lidas no aparelho',
    async (origem, funcao) => {
      const r = await lerDocumento(origem);
      expect(r).toEqual({ tipo: 'texto', linhas: ['Penta 1ª dose 02/02/2026', 'Lote 1'] });
      expect(picker[funcao]).toHaveBeenCalledWith(
        expect.objectContaining({ mediaTypes: ['images'], quality: 1 }),
      );
      expect(mockExtrair).toHaveBeenCalledWith('file:///cache/doc.jpg');
    },
  );

  test('CT-APP-OCR21: a cópia da foto tirada pela câmera é apagada depois da leitura', async () => {
    await lerDocumento('camera');
    expect(ARQUIVO).toHaveBeenCalledWith('file:///cache/doc.jpg');
    expect(apagar).toHaveBeenCalled();
  });

  test('CT-APP-OCR22: o arquivo da galeria do usuário nunca é apagado', async () => {
    await lerDocumento('galeria');
    expect(apagar).not.toHaveBeenCalled();
  });

  test('CT-APP-OCR23: a cópia também é apagada se a leitura do texto falhar', async () => {
    mockExtrair.mockRejectedValue(new Error('falha do ML Kit'));
    await expect(lerDocumento('camera')).rejects.toThrow('falha do ML Kit');
    expect(apagar).toHaveBeenCalled();
  });

  test.each([
    ['camera', 'requestCameraPermissionsAsync'],
    ['galeria', 'requestMediaLibraryPermissionsAsync'],
  ] as const)(
    'CT-APP-OCR24: sem permissão na %s devolve "negado" sem abrir o seletor',
    async (origem, pedido) => {
      picker[pedido].mockResolvedValue({ granted: false } as never);
      expect(await lerDocumento(origem)).toEqual({ tipo: 'negado' });
      expect(picker.launchCameraAsync).not.toHaveBeenCalled();
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    },
  );

  test('CT-APP-OCR25: cancelar, ou resultado sem imagem, devolve "cancelado"', async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    expect(await lerDocumento('camera')).toEqual({ tipo: 'cancelado' });
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [] } as never);
    expect(await lerDocumento('camera')).toEqual({ tipo: 'cancelado' });
    expect(mockExtrair).not.toHaveBeenCalled();
  });

  test('CT-APP-OCR26: sem leitor de texto neste aparelho devolve "indisponivel" sem pedir permissão', async () => {
    mockSuportado = false;
    expect(await lerDocumento('camera')).toEqual({ tipo: 'indisponivel' });
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  test('CT-APP-OCR27: se apagar a cópia falhar, a leitura continua valendo', async () => {
    apagar.mockImplementation(() => {
      throw new Error('sem acesso');
    });
    const r = await lerDocumento('camera');
    expect(r.tipo).toBe('texto');
  });
});
