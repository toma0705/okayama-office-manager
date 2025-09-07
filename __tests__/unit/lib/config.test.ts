describe('src/lib/config', () => {
  const orig = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (orig === undefined) {
      delete (process.env as any).NEXT_PUBLIC_API_URL;
    } else {
      (process.env as any).NEXT_PUBLIC_API_URL = orig;
    }
    jest.resetModules();
  });

  it('API_BASE_URL: env 未設定なら空文字', () => {
    delete (process.env as any).NEXT_PUBLIC_API_URL;
    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('');
    });
  });

  it('API_BASE_URL: env 設定時はその値', () => {
    (process.env as any).NEXT_PUBLIC_API_URL = 'https://api.example.com';
    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('https://api.example.com');
    });
  });
});
