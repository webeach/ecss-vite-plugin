import type { Plugin } from 'vite';

import { resolveIdImpl } from '../src';
import { cssCache } from '../src/core.js';

const RUNTIME_MODULE_ID = 'virtual:ecss/runtime';

vi.mock('@ecss/parser', () => ({
  parseEcss: (source: string) => {
    if (source.includes('FooBar')) {
      return {
        rules: [
          {
            kind: 'state-def',
            stateDef: {
              name: 'FooBar',
              params: [],
              body: [
                {
                  kind: 'declaration',
                  declaration: {
                    property: 'color',
                    value: 'red',
                    important: false,
                    span: { line: 1, column: 1, endLine: 1, endColumn: 1 },
                  },
                },
              ],
              span: { line: 1, column: 1, endLine: 1, endColumn: 1 },
            },
          },
        ],
      };
    }
    return { rules: [] };
  },
}));

async function createPlugin(options = {}): Promise<Plugin> {
  const mod = await import('../src/index.js');
  return mod.default(options);
}

describe('ecss vite plugin', () => {
  beforeEach(() => {
    cssCache.clear();
  });

  describe('resolveId', () => {
    it('resolves virtual:ecss/runtime to a real path or virtual id', async () => {
      const resolved = await resolveIdImpl(RUNTIME_MODULE_ID, undefined);

      expect(resolved).toBeDefined();
      expect(typeof resolved).toBe('string');
      expect(resolved).toMatch(/runtime/);
    });

    it('uses bundler resolve when available', async () => {
      const mockResolve = vi.fn().mockResolvedValue({
        id: '/node_modules/@ecss/transformer/dist/runtime/index.js',
      });
      const resolved = await resolveIdImpl(RUNTIME_MODULE_ID, mockResolve);

      expect(mockResolve).toHaveBeenCalledWith(
        '@ecss/transformer/runtime',
        expect.any(String),
        { skipSelf: true },
      );
      expect(resolved).toBe(
        '/node_modules/@ecss/transformer/dist/runtime/index.js',
      );
    });

    it('resolves ?ecss&lang.css queries with null byte prefix', async () => {
      const resolved = await resolveIdImpl(
        '/app/Button.ecss?ecss&lang.css',
        undefined,
      );

      expect(resolved).toBe('\0/app/Button.ecss?ecss&lang.css');
    });

    it('returns undefined for unrelated ids', async () => {
      const resolved = await resolveIdImpl('./some-module.ts', undefined);

      expect(resolved).toBeUndefined();
    });
  });

  describe('load', () => {
    it('returns cached CSS for virtual CSS modules', async () => {
      const plugin = await createPlugin();
      const load = plugin.load as (id: string) => string | undefined;
      cssCache.set('/app/Button.ecss', '.Button-abc123 { color: red; }');

      const result = load('\0/app/Button.ecss?ecss&lang.css');

      expect(result).toBe('.Button-abc123 { color: red; }');
    });

    it('returns undefined for uncached virtual CSS modules', async () => {
      const plugin = await createPlugin();
      const load = plugin.load as (id: string) => string | undefined;

      const result = load('\0/app/Unknown.ecss?ecss&lang.css');

      expect(result).toBeUndefined();
    });

    it('returns undefined for non-virtual ids', async () => {
      const plugin = await createPlugin();
      const load = plugin.load as (id: string) => string | undefined;

      const result = load('./some-module.ts');

      expect(result).toBeUndefined();
    });
  });

  describe('transform', () => {
    it('transforms .ecss files into JS with CSS import', async () => {
      const plugin = await createPlugin();
      const transform = plugin.transform as (
        code: string,
        id: string,
      ) => Promise<{ code: string } | undefined>;

      const result = await transform(
        '@state-def FooBar() { color: red; }',
        '/app/FooBar.ecss',
      );

      expect(result).toBeDefined();
      expect(result!.code).toContain(
        "import '/app/FooBar.ecss?ecss&lang.css';",
      );
      expect(result!.code).toContain('FooBar');
    });

    it('ignores non-.ecss files', async () => {
      const plugin = await createPlugin();
      const transform = plugin.transform as (
        code: string,
        id: string,
      ) => Promise<{ code: string } | undefined>;

      const result = await transform('const x = 1;', '/app/module.ts');

      expect(result).toBeUndefined();
    });

    it('respects custom extensions', async () => {
      const plugin = await createPlugin({ extensions: ['.ecss', '.css'] });
      const transform = plugin.transform as (
        code: string,
        id: string,
      ) => Promise<{ code: string } | undefined>;

      const result = await transform(
        '@state-def FooBar() { color: red; }',
        '/app/FooBar.css',
      );

      expect(result).toBeDefined();
      expect(result!.code).toContain("import '/app/FooBar.css?ecss&lang.css';");
    });

    it('populates CSS cache after transform', async () => {
      const plugin = await createPlugin();
      const transform = plugin.transform as (
        code: string,
        id: string,
      ) => Promise<{ code: string } | undefined>;

      await transform(
        '@state-def FooBar() { color: red; }',
        '/app/FooBar.ecss',
      );

      expect(cssCache.has('/app/FooBar.ecss')).toBe(true);
      expect(cssCache.get('/app/FooBar.ecss')).toContain('color: red;');
    });
  });
});
