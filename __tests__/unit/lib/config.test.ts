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

  const origNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: origNodeEnv });
    jest.resetModules();
  });

  it('API_BASE_URL: developmentはlocalhost', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development' });
    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('http://localhost:3000/api');
    });
  });

  it('API_BASE_URL: productionは/api', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production' });
    jest.isolateModules(() => {
      const mod = require('@/lib/config');
      expect(mod.API_BASE_URL).toBe('/api');
    });
  });
});
