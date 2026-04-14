import type { EcssStylesheet } from '@ecss/transformer';

import { processEcssFile, cssCache } from '../src/core.js';

const span = { line: 1, column: 1, endLine: 1, endColumn: 1 };

function makeSimpleAst(): EcssStylesheet {
  return {
    rules: [
      {
        kind: 'state-def',
        stateDef: {
          name: 'Button',
          params: [
            {
              name: '--is-active',
              paramType: 'boolean',
            },
          ],
          body: [
            {
              kind: 'declaration',
              declaration: {
                property: 'background',
                value: 'blue',
                important: false,
                span,
              },
            },
            {
              kind: 'if-chain',
              ifChain: {
                ifClause: {
                  condition: { kind: 'var', var: '--is-active' },
                  body: [
                    {
                      kind: 'declaration',
                      declaration: {
                        property: 'background',
                        value: 'green',
                        important: false,
                        span,
                      },
                    },
                  ],
                  span,
                },
                elseIfClauses: [],
                span,
              },
            },
          ],
          span,
        },
      },
    ],
  };
}

describe('processEcssFile', () => {
  beforeEach(() => {
    cssCache.clear();
  });

  it('returns CSS and JS for a simple state-def', () => {
    const ast = makeSimpleAst();
    const result = processEcssFile('/app/Button.ecss', ast, {});

    expect(result.css).toContain('background: blue;');
    expect(result.css).toContain('background: green;');
    expect(result.js).toContain('virtual:ecss/runtime');
    expect(result.js).toContain('Button');
  });

  it('caches CSS by file path', () => {
    const ast = makeSimpleAst();
    processEcssFile('/app/Button.ecss', ast, {});

    expect(cssCache.has('/app/Button.ecss')).toBe(true);
    expect(cssCache.get('/app/Button.ecss')).toContain('background: blue;');
  });

  it('updates cache on re-process', () => {
    const ast1 = makeSimpleAst();
    processEcssFile('/app/Button.ecss', ast1, {});
    const firstCss = cssCache.get('/app/Button.ecss');

    const ast2: EcssStylesheet = {
      rules: [
        {
          kind: 'state-def',
          stateDef: {
            name: 'Button',
            params: [],
            body: [
              {
                kind: 'declaration',
                declaration: {
                  property: 'color',
                  value: 'red',
                  important: false,
                  span,
                },
              },
            ],
            span,
          },
        },
      ],
    };

    processEcssFile('/app/Button.ecss', ast2, {});
    const secondCss = cssCache.get('/app/Button.ecss');

    expect(secondCss).not.toBe(firstCss);
    expect(secondCss).toContain('color: red;');
  });

  it('respects classTemplate option', () => {
    const ast = makeSimpleAst();
    const result = processEcssFile('/app/Button.ecss', ast, {
      classTemplate: 'ecss-[name]-[hash:8]',
    });

    expect(result.css).toMatch(/\.ecss-Button-[a-zA-Z0-9_-]{8}/);
  });
});
