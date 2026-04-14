import { generateDts, transform } from '@ecss/transformer';
import type { EcssStylesheet } from '@ecss/transformer';

import type { EcssPluginOptions } from './types.js';

import { writeFileSync } from 'node:fs';

/** In-memory cache mapping each `.ecss` file path to its generated CSS string. */
export const cssCache = new Map<string, string>();

/** Return value of {@link processEcssFile}. */
interface ProcessResult {
  css: string;
  js: string;
}

/**
 * Generates a `.ecss.d.ts` sidecar file next to the given `.ecss` source.
 *
 * The file contains TypeScript declarations for the default-exported styles
 * object so that IDEs without a language-service plugin can provide types.
 *
 * @param filePath Absolute path to the `.ecss` source file.
 * @param ast      Parsed ECSS AST.
 * @param options  Plugin options forwarded to {@link generateDts}.
 */
export function writeDtsFile(
  filePath: string,
  ast: EcssStylesheet,
  options: EcssPluginOptions,
): void {
  const dts = generateDts(ast, {
    filePath,
    classTemplate: options.classTemplate,
    classAttribute: options.classAttribute,
  });
  writeFileSync(filePath + '.d.ts', dts, 'utf-8');
}

/**
 * Transforms an ECSS AST into CSS + JS and updates the in-memory CSS cache.
 *
 * If `options.generateDeclarations` is `true`, also writes a `.ecss.d.ts`
 * sidecar file via {@link writeDtsFile}.
 *
 * @param filePath Absolute path to the `.ecss` source file.
 * @param ast      Parsed ECSS AST.
 * @param options  Plugin options forwarded to the transformer.
 */
export function processEcssFile(
  filePath: string,
  ast: EcssStylesheet,
  options: EcssPluginOptions,
): ProcessResult {
  const result = transform(ast, {
    filePath,
    classTemplate: options.classTemplate,
    runtimeImport: 'virtual:ecss/runtime',
    classAttribute: options.classAttribute,
  });

  cssCache.set(filePath, result.css);

  if (options.generateDeclarations) {
    writeDtsFile(filePath, ast, options);
  }

  return {
    css: result.css,
    js: result.js,
  };
}
