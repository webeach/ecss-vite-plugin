import { loadConfig, mergeConfig } from '@ecss/transformer';
import type { Plugin, HmrContext, ModuleNode } from 'vite';

import { cssCache, processEcssFile, writeDtsFile } from './core.js';
import type { EcssPluginOptions } from './types.js';

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type { EcssPluginOptions } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const RUNTIME_MODULE_ID = 'virtual:ecss/runtime';
const RESOLVED_RUNTIME_ID = '\0virtual:ecss/runtime';

/**
 * Query suffix appended to virtual CSS module IDs.
 * The `&lang.css` part makes Vite's `isCSSRequest()` treat the virtual module
 * as CSS so it gets injected into the page correctly.
 */
const CSS_QUERY = '?ecss&lang.css';

/**
 * Path to this plugin file, used as the `importer` argument when resolving
 * `@ecss/transformer/runtime` so that Vite searches inside
 * `@ecss/vite-plugin`'s own `node_modules`.
 */
const PLUGIN_FILE = fileURLToPath(import.meta.url);

// ─── Parser lazy-load ─────────────────────────────────────────────────────────

/**
 * Cached parser function — loaded on first use to avoid a heavy synchronous
 * `require('@ecss/parser')` at plugin startup.
 */
let parseEcss: ((source: string) => any) | null = null;

async function getParser(): Promise<(source: string) => any> {
  if (parseEcss) {
    return parseEcss;
  }
  const mod = await import('@ecss/parser');
  parseEcss = mod.parseEcss;
  return parseEcss!;
}

// ─── Declaration scan ─────────────────────────────────────────────────────────

/**
 * Recursively scans `dir` for files matching `exts` and writes a `.d.ts`
 * sidecar for each one. Used during `buildStart` when `generateDeclarations`
 * is enabled, so IDEs have up-to-date types before the first build transform.
 *
 * Skips `node_modules`, `dist`, and hidden directories automatically.
 */
function scanAndWriteDts(
  dir: string,
  exts: string[],
  parse: (source: string) => any,
  options: EcssPluginOptions,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) {
      continue;
    }

    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }

    if (st.isDirectory()) {
      scanAndWriteDts(full, exts, parse, options);
    } else if (exts.some((ext) => full.endsWith(ext))) {
      try {
        const source = readFileSync(full, 'utf-8');
        const ast = parse(source);
        writeDtsFile(full, ast, options);
      } catch {
        // Skip unreadable or unparseable files silently.
      }
    }
  }
}

// ─── resolveId logic ──────────────────────────────────────────────────────────

/**
 * Vite's `this.resolve()` function signature, available inside `resolveId`.
 */
export type ViteResolve = (
  id: string,
  importer: string,
  options?: { skipSelf?: boolean },
) => Promise<{ id: string } | null | undefined>;

/**
 * Pure implementation of the `resolveId` hook logic, extracted so it can be
 * unit-tested without constructing a full Vite plugin context.
 *
 * @param id - The module specifier being resolved.
 * @param resolve - Vite's `this.resolve()`; may be `undefined` in tests.
 */
export async function resolveIdImpl(
  id: string,
  resolve: ViteResolve | undefined,
): Promise<string | undefined> {
  if (id === RUNTIME_MODULE_ID) {
    const result = await resolve?.('@ecss/transformer/runtime', PLUGIN_FILE, {
      skipSelf: true,
    });
    if (result?.id) {
      return result.id;
    }

    try {
      return fileURLToPath(import.meta.resolve('@ecss/transformer/runtime'));
    } catch {
      return RESOLVED_RUNTIME_ID;
    }
  }

  if (id.endsWith(CSS_QUERY)) {
    return '\0' + id;
  }
}

// ─── Plugin factory ───────────────────────────────────────────────────────────

/**
 * Creates a Vite plugin for ECSS.
 *
 * Reads `ecss.config.json` from the project root and merges it with the
 * explicit `options` argument (explicit values take precedence).
 */
export default function ecss(options: EcssPluginOptions = {}): Plugin {
  const fileConfig = loadConfig(process.cwd());
  const merged = mergeConfig(fileConfig, options);
  const resolvedOptions: EcssPluginOptions = { ...options, ...merged };

  return {
    name: 'ecss',
    enforce: 'pre',

    async buildStart() {
      if (!resolvedOptions.generateDeclarations) {
        return;
      }
      const exts = resolvedOptions.extensions ?? ['.ecss'];
      const parse = await getParser();
      scanAndWriteDts(process.cwd(), exts, parse, resolvedOptions);
    },

    async resolveId(id) {
      return resolveIdImpl(id, this.resolve.bind(this));
    },

    load(id) {
      if (id.startsWith('\0') && id.endsWith(CSS_QUERY)) {
        const filePath = id.slice(1, -CSS_QUERY.length);
        return cssCache.get(filePath);
      }

      if (id === RESOLVED_RUNTIME_ID) {
        return `export { _h, merge } from '@ecss/transformer/runtime';`;
      }
    },

    async transform(code, id) {
      const exts = resolvedOptions.extensions ?? ['.ecss'];
      if (!exts.some((ext) => id.endsWith(ext))) {
        return;
      }

      const parse = await getParser();
      const ast = parse(code);
      const result = processEcssFile(id, ast, resolvedOptions);

      const cssImport = `import '${id}${CSS_QUERY}';\n`;
      return { code: cssImport + result.js };
    },

    async handleHotUpdate({
      file,
      server,
      modules,
      read,
    }: HmrContext): Promise<ModuleNode[] | void> {
      const exts = resolvedOptions.extensions ?? ['.ecss'];
      if (!exts.some((ext) => file.endsWith(ext))) {
        return;
      }

      const parse = await getParser();
      const source = await read();
      const ast = parse(source);
      processEcssFile(file, ast, resolvedOptions);

      const cssModuleId = `\0${file}${CSS_QUERY}`;
      const cssModule = server.moduleGraph.getModuleById(cssModuleId);
      if (cssModule) {
        server.moduleGraph.invalidateModule(cssModule);
        return [...modules, cssModule];
      }

      return modules;
    },
  };
}
