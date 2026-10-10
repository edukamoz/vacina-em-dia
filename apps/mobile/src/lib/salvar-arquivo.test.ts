const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockShare = jest.fn();
const mockDisponivel = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  File: class {
    uri: string;
    constructor(pasta: string, nome: string) {
      this.uri = `${pasta}${nome}`;
    }
    create = mockCreate;
    write = mockWrite;
  },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockDisponivel(),
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));

import { salvarArquivo } from './salvar-arquivo';
import { salvarArquivo as salvarNaWeb } from './salvar-arquivo.web';

const BYTES = new Uint8Array([1, 2, 3]);

beforeEach(() => jest.clearAllMocks());

describe('entrega de arquivos', () => {
  test('CT-APP-ARQ01: no celular grava na pasta temporária e abre a folha de compartilhar', async () => {
    mockDisponivel.mockResolvedValue(true);
    expect(await salvarArquivo(BYTES, 'carteira.pdf', 'application/pdf')).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
    expect(mockWrite).toHaveBeenCalledWith(BYTES);
    expect(mockShare).toHaveBeenCalledWith(
      'file:///cache/carteira.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  test('CT-APP-ARQ02: sem compartilhamento no aparelho, grava mas devolve falso', async () => {
    mockDisponivel.mockResolvedValue(false);
    expect(await salvarArquivo(BYTES, 'carteira.pdf', 'application/pdf')).toBe(false);
    expect(mockShare).not.toHaveBeenCalled();
  });

  test('CT-APP-ARQ03: na web cria o endereço temporário, clica no link de download e o libera', async () => {
    jest.useFakeTimers();
    const clique = jest.fn();
    const remover = jest.fn();
    const ancora: Record<string, unknown> = { click: clique, remove: remover };
    const criarEndereco = jest.fn().mockReturnValue('blob:teste');
    const liberarEndereco = jest.fn();
    const globais = globalThis as unknown as Record<string, unknown>;
    const antes = { document: globais.document, URL: globais.URL };
    globais.document = {
      createElement: () => ancora,
      body: { appendChild: jest.fn() },
    };
    globais.URL = Object.assign(function URLFalsa() {}, {
      createObjectURL: criarEndereco,
      revokeObjectURL: liberarEndereco,
    });
    try {
      expect(await salvarNaWeb(BYTES, 'carteira.pdf', 'application/pdf')).toBe(true);
      expect(ancora).toMatchObject({ href: 'blob:teste', download: 'carteira.pdf' });
      expect(clique).toHaveBeenCalledTimes(1);
      expect(remover).toHaveBeenCalledTimes(1);
      expect(liberarEndereco).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10_000);
      expect(liberarEndereco).toHaveBeenCalledWith('blob:teste');
    } finally {
      globais.document = antes.document;
      globais.URL = antes.URL;
      jest.useRealTimers();
    }
  });
});
