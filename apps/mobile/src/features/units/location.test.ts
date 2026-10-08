import * as Location from 'expo-location';
import { getCurrentPosition, LocationError } from './location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const permissao = Location.requestForegroundPermissionsAsync as jest.Mock;
const posicao = Location.getCurrentPositionAsync as jest.Mock;

describe('localização (CT-UNI-APP-LOC)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CT-UNI-APP-60: com permissão, devolve latitude e longitude pedindo precisão equilibrada', async () => {
    permissao.mockResolvedValue({ granted: true });
    posicao.mockResolvedValue({ coords: { latitude: -23.5, longitude: -47.4, accuracy: 10 } });
    await expect(getCurrentPosition()).resolves.toEqual({ latitude: -23.5, longitude: -47.4 });
    expect(posicao).toHaveBeenCalledWith({ accuracy: 3 });
  });

  test('CT-UNI-APP-61: permissão negada vira erro DENIED e nem tenta ler a posição', async () => {
    permissao.mockResolvedValue({ granted: false });
    await expect(getCurrentPosition()).rejects.toMatchObject({ kind: 'DENIED' });
    expect(posicao).not.toHaveBeenCalled();
  });

  test('CT-UNI-APP-62: falha do aparelho vira erro UNAVAILABLE com mensagem simples', async () => {
    permissao.mockResolvedValue({ granted: true });
    posicao.mockRejectedValue(new Error('gps desligado'));
    const erro = await getCurrentPosition().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(LocationError);
    expect((erro as LocationError).kind).toBe('UNAVAILABLE');
    expect((erro as LocationError).message).toMatch(/localização do aparelho/);
    expect((erro as LocationError).message).not.toMatch(/gps desligado/);
  });
});
