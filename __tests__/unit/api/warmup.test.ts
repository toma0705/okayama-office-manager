import { GET as warmupGet, HEAD as warmupHead } from '@/app/api/warmup/route';

jest.mock('@/lib/prisma', () => ({ warmupPrisma: jest.fn() }));

const { warmupPrisma } = jest.requireMock('@/lib/prisma') as any;

describe('GET/HEAD /api/warmup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET: 200 warmed up', async () => {
    warmupPrisma.mockResolvedValue(undefined);
    const res = await warmupGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('warmed up');
    expect(json.timestamp).toBeDefined();
  });

  it('HEAD: 200', async () => {
    const res = await warmupHead();
    expect(res.status).toBe(200);
  });
});
