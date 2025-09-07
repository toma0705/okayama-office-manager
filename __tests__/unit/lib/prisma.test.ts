jest.mock('@/generated/prisma/client', () => {
  class MockPrismaClient {
    $queryRaw = jest.fn(async () => 1);
  }
  return { PrismaClient: MockPrismaClient };
});

describe('src/lib/prisma', () => {
  const origNodeEnv = (process.env as any).NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    (global as any).prisma = undefined;
    (global as any).warmedUp = undefined;
  });

  afterAll(() => {
    (process.env as any).NODE_ENV = origNodeEnv;
  });

  it('prisma は singleton をエクスポート', () => {
    const m1 = require('@/lib/prisma');
    const m2 = require('@/lib/prisma');
    expect(m1.prisma).toBe(m2.prisma);
  });

  it('NODE_ENV!=production では globalThis にキャッシュされる', () => {
    (process.env as any).NODE_ENV = 'development';
    const mod = require('@/lib/prisma');
    expect((global as any).prisma).toBe(mod.prisma);
  });

  it('warmupPrisma: 初回は$queryRaw実行し、2回目はスキップ', async () => {
    const mod = require('@/lib/prisma');
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    await mod.warmupPrisma();
    await mod.warmupPrisma();
    const calledTimes = mod.prisma.$queryRaw.mock.calls.length;
    expect(calledTimes).toBe(1);
    spyLog.mockRestore();
  });

  it('warmupPrisma: 失敗しても例外を投げず warn を出す', async () => {
  const mod = require('@/lib/prisma');
  const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  // 次の1回だけ失敗させる
  mod.prisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
  await mod.warmupPrisma();
  expect(spyWarn).toHaveBeenCalled();
  spyWarn.mockRestore();
  spyLog.mockRestore();
  });
});
