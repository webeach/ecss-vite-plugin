export type { ClassAttribute } from '@ecss/transformer';

/** Options accepted by the ECSS Vite plugin. */
export interface EcssPluginOptions {
  /**
   * Which class attribute(s) the state function result should include.
   * - `'className'` — React (default)
   * - `'class'`     — Vue templates, Svelte, Solid
   * - `'both'`      — both `class` and `className` in the same result object
   * @default "className"
   */
  classAttribute?: 'className' | 'class' | 'both';
  /**
   * Template for generated CSS class names.
   * Supports `[name]` and `[hash:N]` tokens.
   * @default "[name]-[hash:6]"
   */
  classTemplate?: string;
  /**
   * File extensions the plugin should process.
   * @default [".ecss"]
   */
  extensions?: string[];
  /**
   * When `true`, the plugin writes a `.ecss.d.ts` declaration file alongside
   * each processed `.ecss` source at build start.
   * Required for IDEs that do not load tsserver language-service plugins
   * (e.g. Svelte language tools, vue-tsc).
   */
  generateDeclarations?: boolean;
}
