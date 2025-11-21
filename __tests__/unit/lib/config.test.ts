describe('src/lib/config', () => {
  const originalValues = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_BASE_URL: process.env.API_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  } as const;

  const setNodeEnv = (value: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      configurable: true,
      writable: true,
    });
  };

  const resetEnv = () => {
    for (const key of Object.keys(originalValues) as (keyof typeof originalValues)[]) {
      const original = originalValues[key];
      if (key === 'NODE_ENV') {
        setNodeEnv(original ?? 'test');
        continue;
      }

      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  };

  afterEach(() => {
    resetEnv();
    jest.resetModules();
  });

  it('API_BASE_URL: developmentはlocalhost', () => {
    setNodeEnv('development');
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_BASE_URL;

    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('http://localhost:3000/api');
    });
  });

  it('API_BASE_URL: productionは/api', () => {
    setNodeEnv('production');
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_BASE_URL;
    delete process.env.VERCEL_URL;

    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('/api');
    });
  });

  it('API_BASE_URL: NEXT_PUBLIC_API_BASE_URL が優先される', () => {
    setNodeEnv('production');
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.com/custom-api';

    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('https://example.com/custom-api');
    });
  });
});
