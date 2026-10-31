/**
 * プロフィール画像の保存先。R2（S3 互換）の設定があれば R2 に、なければ public/icons に保存する。
 * 設定は読み込み時に決まるので、環境変数を変えてから読み込み直す。
 */
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(input => ({ type: 'put', input })),
  DeleteObjectCommand: jest.fn(input => ({ type: 'delete', input })),
}));
jest.mock('fs/promises', () => ({
  __esModule: true,
  default: { mkdir: jest.fn(), writeFile: jest.fn(), unlink: jest.fn() },
}));

type StorageModule = typeof import('@/lib/storage');
const fs = jest.requireMock('fs/promises').default as Record<string, jest.Mock>;

const R2_ENV = {
  R2_PUBLIC_URL: 'https://cdn.example.com',
  R2_S3_ENDPOINT: 'https://r2.example.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'icons',
};

const originalEnv = process.env;
const loadStorage = (env: Record<string, string | undefined>): StorageModule => {
  process.env = { ...originalEnv, ...env };
  let storage!: StorageModule;
  jest.isolateModules(() => {
    storage = require('@/lib/storage');
  });
  return storage;
};

beforeEach(() => jest.clearAllMocks());
afterAll(() => {
  process.env = originalEnv;
});

describe('保存パスと URL', () => {
  it('保存パスから先頭の / とクエリを除く', () => {
    const { normalizeStoredUserIconPath } = loadStorage({});
    expect(normalizeStoredUserIconPath(' /a/b.png?v=1 ')).toBe('a/b.png');
    expect(normalizeStoredUserIconPath('')).toBeNull();
    expect(normalizeStoredUserIconPath(null)).toBeNull();
  });

  it('R2 の公開 URL があればそれを、なければ /icons を使う', () => {
    expect(loadStorage(R2_ENV).resolveUserIconUrl('a.png')).toBe('https://cdn.example.com/a.png');
    expect(loadStorage({ R2_PUBLIC_URL: '' }).resolveUserIconUrl('a.png')).toBe('/icons/a.png');
    expect(loadStorage({}).resolveUserIconUrl('')).toBeNull();
  });
});

describe('R2 に保存する', () => {
  it('アップロードしてパスを返す', async () => {
    const { uploadUserIcon } = loadStorage(R2_ENV);
    mockSend.mockResolvedValue({});

    const result = await uploadUserIcon({
      buffer: Buffer.from('x'),
      fileName: 'a.webp',
      contentType: 'image/webp',
    });

    expect(result).toEqual({ publicUrl: 'https://cdn.example.com/a.webp', storagePath: 'a.webp' });
    expect(mockSend).toHaveBeenCalledWith({
      type: 'put',
      input: expect.objectContaining({ Bucket: 'icons', Key: 'a.webp', ContentType: 'image/webp' }),
    });
  });

  it('アップロードに失敗したらエラーにする', async () => {
    const { uploadUserIcon } = loadStorage(R2_ENV);
    mockSend.mockRejectedValue(new Error('denied'));
    await expect(uploadUserIcon({ buffer: Buffer.from('x'), fileName: 'a.png' })).rejects.toThrow(
      'R2 upload failed',
    );
  });

  it('削除する。失敗してもエラーは投げずに結果で返す', async () => {
    const { removeUserIconByUrl } = loadStorage(R2_ENV);

    mockSend.mockResolvedValueOnce({});
    await expect(removeUserIconByUrl('a.png')).resolves.toEqual({
      removed: true,
      storagePath: 'a.png',
    });

    mockSend.mockRejectedValueOnce(new Error('denied'));
    const failed = await removeUserIconByUrl('a.png');
    expect(failed.removed).toBe(false);
    expect(failed.error?.message).toBe('denied');
  });
});

describe('R2 の設定がないとき', () => {
  const localEnv = { R2_S3_ENDPOINT: '', R2_PUBLIC_URL: '', VERCEL: '', NODE_ENV: 'development' };

  it('開発中は public/icons に保存する', async () => {
    const { uploadUserIcon } = loadStorage(localEnv);
    const result = await uploadUserIcon({ buffer: Buffer.from('x'), fileName: 'a.png' });

    expect(result).toEqual({ publicUrl: '/icons/a.png', storagePath: 'a.png' });
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/public\/icons\/a\.png$/),
      expect.any(Buffer),
    );
  });

  it('本番（Vercel）では保存せずにエラーにする（画像が消えるため）', async () => {
    const { uploadUserIcon } = loadStorage({ ...localEnv, VERCEL: '1' });
    await expect(uploadUserIcon({ buffer: Buffer.from('x'), fileName: 'a.png' })).rejects.toThrow(
      'R2 is not configured',
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('不正なファイル名は保存しない', async () => {
    const { uploadUserIcon } = loadStorage(localEnv);
    await expect(uploadUserIcon({ buffer: Buffer.from('x'), fileName: '/' })).rejects.toThrow(
      'Invalid icon file name',
    );
  });

  it('保存パスがなければ何もしない', async () => {
    const { removeUserIconByUrl } = loadStorage(localEnv);
    await expect(removeUserIconByUrl('')).resolves.toEqual({ removed: false, storagePath: null });
    expect(fs.unlink).not.toHaveBeenCalled();
  });
});
