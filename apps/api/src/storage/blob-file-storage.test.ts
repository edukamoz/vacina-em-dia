import { createBlobFileStorage } from './blob-file-storage';

const mockCreateIfNotExists = jest.fn();
const mockUploadData = jest.fn();
const mockDownloadToBuffer = jest.fn();
const mockGetProperties = jest.fn();
const mockDeleteIfExists = jest.fn();
const mockGetBlockBlobClient = jest.fn();

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: () => ({
      getContainerClient: () => ({
        createIfNotExists: mockCreateIfNotExists,
        getBlockBlobClient: mockGetBlockBlobClient,
      }),
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateIfNotExists.mockResolvedValue({});
  mockGetBlockBlobClient.mockReturnValue({
    uploadData: mockUploadData,
    downloadToBuffer: mockDownloadToBuffer,
    getProperties: mockGetProperties,
    deleteIfExists: mockDeleteIfExists,
  });
});

const storage = () => createBlobFileStorage({ connectionString: 'x', container: 'fotos' });

describe('createBlobFileStorage', () => {
  test('CT-FOTO-B01: cria o contêiner uma vez e grava com tipo e sem cache', async () => {
    const s = storage();
    await s.put('perfil/a', { bytes: new Uint8Array([1, 2]), contentType: 'image/png' });
    await s.put('perfil/b', { bytes: new Uint8Array([3]), contentType: 'image/png' });
    expect(mockCreateIfNotExists).toHaveBeenCalledTimes(1);
    expect(mockGetBlockBlobClient).toHaveBeenCalledWith('perfil/a');
    expect(mockUploadData).toHaveBeenCalledWith(new Uint8Array([1, 2]), {
      blobHTTPHeaders: { blobContentType: 'image/png', blobCacheControl: 'private, no-store' },
    });
  });

  test('CT-FOTO-B02: se criar o contêiner falhar, tenta de novo na próxima escrita', async () => {
    mockCreateIfNotExists.mockRejectedValueOnce(new Error('rede'));
    const s = storage();
    const file = { bytes: new Uint8Array([1]), contentType: 'image/png' };
    await expect(s.put('k', file)).rejects.toThrow('rede');
    await s.put('k', file);
    expect(mockCreateIfNotExists).toHaveBeenCalledTimes(2);
  });

  test('CT-FOTO-B03: lê os bytes e o tipo; 404 vira null', async () => {
    mockDownloadToBuffer.mockResolvedValueOnce(Buffer.from([9, 8]));
    mockGetProperties.mockResolvedValueOnce({ contentType: 'image/webp' });
    expect(await storage().get('k')).toEqual({
      bytes: new Uint8Array([9, 8]),
      contentType: 'image/webp',
    });
    mockDownloadToBuffer.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 404 }));
    expect(await storage().get('k')).toBeNull();
  });

  test('CT-FOTO-B04: sem tipo gravado usa application/octet-stream; outros erros sobem', async () => {
    mockDownloadToBuffer.mockResolvedValueOnce(Buffer.from([1]));
    mockGetProperties.mockResolvedValueOnce({});
    expect((await storage().get('k'))?.contentType).toBe('application/octet-stream');
    mockDownloadToBuffer.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 }));
    await expect(storage().get('k')).rejects.toThrow('x');
  });

  test('CT-FOTO-B05: remove usa deleteIfExists', async () => {
    await storage().remove('perfil/a');
    expect(mockDeleteIfExists).toHaveBeenCalledTimes(1);
  });
});
