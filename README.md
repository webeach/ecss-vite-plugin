<div align="center">
  <h1>@ecss/vite-plugin</h1>
  <br>
  <img alt="@ecss/vite-plugin" src="./assets/logo.svg" height="240">
  <br>
  <br>
  <p style="text-decoration: none">
    <a href="https://www.npmjs.com/package/@ecss/vite-plugin">
       <img src="https://img.shields.io/npm/v/@ecss/vite-plugin.svg?color=646fe1&labelColor=9B7AEF" alt="npm package" />
    </a>
    <a href="https://github.com/webeach/ecss-vite-plugin/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/webeach/ecss-vite-plugin/ci.yml?color=646fe1&labelColor=9B7AEF" alt="build" />
    </a>
    <a href="https://www.npmjs.com/package/@ecss/vite-plugin">
      <img src="https://img.shields.io/npm/dm/@ecss/vite-plugin.svg?color=646fe1&labelColor=9B7AEF" alt="npm downloads" />
    </a>
  </p>
  <p><a href="./README.md">🇺🇸 English version</a> | <a href="./README.ru.md">🇷🇺 Русская версия</a></p>
  <p>Vite plugin for ECSS — transforms .ecss files into CSS + JS with HMR support.</p>
  <br>
  <p>
    <a href="https://ecss.webea.ch" style="font-size: 1.5em">📖 Documentation</a> | <a href="https://ecss.webea.ch/reference/spec.html" style="font-size: 1.5em">📋 Specification</a>
  </p>
</div>

---

## 💎 Features

- ⚡ **Native Vite integration** — uses Vite Plugin API directly
- 🔥 **HMR** — hot module replacement for `.ecss` files without full page reload
- 🎨 **Virtual CSS** — generated CSS is injected via Vite's native CSS pipeline
- 🏃 **Runtime** — automatically resolves `virtual:ecss/runtime` to the real helpers from `@ecss/transformer`
- 🧩 **Framework-agnostic** — supports React (`className`), Vue / Svelte / Solid (`class`) and both at once
- 📝 **TypeScript** — typed API, generic types for `.ecss` imports via `./client`
- ⚙️ **Config** — reads `ecss.config.json` from the project root; explicit options take precedence

---

## 📦 Installation

```bash
npm install @ecss/vite-plugin
```

or

```bash
pnpm add @ecss/vite-plugin
```

or

```bash
yarn add @ecss/vite-plugin
```

---

## 🚀 Quick start

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import ecss from '@ecss/vite-plugin';

export default defineConfig({
  plugins: [
    ecss({
      classAttribute: 'className', // 'className' | 'class' | 'both'
    }),
  ],
});
```

### Usage in code

```ts
import styles from './button.ecss';

// Positional call
const props = styles.Button('dark', true);
// → { className: 'Button-a1b2c3', 'data-e-a1b2c3-theme': 'dark', 'data-e-a1b2c3-disabled': '' }

// Named-object call
const props2 = styles.Button({ theme: 'dark' });

// Merge multiple styles
const merged = styles.merge(styles.Button('dark'), styles.Icon({ size: 'sm' }));
```

---

## 🛠 API

### `ecss(options?): Plugin`

Creates a Vite plugin instance. Import as default export:

```ts
import ecss from '@ecss/vite-plugin';

const plugin = ecss({ classAttribute: 'class' });
```

---

## ⚙️ Options

```ts
interface EcssPluginOptions {
  classAttribute?: 'className' | 'class' | 'both'; // default: 'className'
  classTemplate?: string; // default: '[name]-[hash:6]'
  extensions?: string[]; // default: ['.ecss']
  generateDeclarations?: boolean; // default: false
}
```

| Option                 | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `classAttribute`       | Which field(s) (`class`, `className` or both) to include in the state function result |
| `classTemplate`        | Class name template; supports `[name]` and `[hash:N]` tokens                          |
| `extensions`           | File extensions the plugin should process                                             |
| `generateDeclarations` | When `true`, writes `.ecss.d.ts` next to each `.ecss` file at build start             |

### `ecss.config.json`

Options can also be set in `ecss.config.json` in the project root — explicit plugin options take precedence:

```json
{
  "classAttribute": "class",
  "classTemplate": "[name]-[hash:8]",
  "generateDeclarations": true
}
```

### Class name template

The `classTemplate` string supports two tokens:

| Token      | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `[name]`   | The `@state-def` identifier (e.g. `Button`)                   |
| `[hash]`   | First 6 characters of the SHA-256 digest of `filePath + name` |
| `[hash:N]` | First `N` characters of the hash                              |

Example: `"[name]-[hash:8]"` for `Button` produces something like `Button-a1b2c3d4`.

---

## 📐 How it works

The plugin hooks into Vite's build pipeline:

1. **`transform`** — when Vite encounters a `.ecss` file, the plugin parses it via `@ecss/parser`, transforms the AST into CSS + JS via `@ecss/transformer`, and returns the JS with a virtual CSS import
2. **`resolveId` + `load`** — the virtual CSS import (`?ecss&lang.css`) is resolved and served from an in-memory cache; Vite treats it as native CSS thanks to the `lang.css` suffix
3. **`handleHotUpdate`** — when a `.ecss` file changes, the plugin re-processes it and invalidates the virtual CSS module so Vite can apply HMR

The `virtual:ecss/runtime` module is resolved to the real `@ecss/transformer/runtime` package so the generated JS can call `_h()` and `merge()` at runtime.

---

## 📐 TypeScript types for `.ecss` imports

### Via language service plugin (`@ecss/typescript-plugin`)

For accurate per-file types, add `@ecss/typescript-plugin` to `tsconfig.json` — it generates types directly in the IDE without extra files.

### Via generic types (`./client`)

If the language service plugin is unavailable, add a reference to `@ecss/vite-plugin/client` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@ecss/vite-plugin/client"]
  }
}
```

This provides a generic type for all `.ecss` imports:

```ts
declare module '*.ecss' {
  const styles: Record<
    string,
    (...args: any[]) => Record<string, string | undefined>
  > & {
    merge: (
      ...objects: Record<string, string | undefined>[]
    ) => Record<string, string | undefined>;
  };
  export default styles;
}
```

### Via `generateDeclarations`

With `generateDeclarations: true` the plugin writes an accurate `.ecss.d.ts` sidecar next to each `.ecss` source. Suitable for Svelte and other tools that do not load tsserver plugins.

---

## 🔧 Development

**Build:**

```bash
pnpm build    # production
pnpm dev      # watch mode
```

**Tests:**

```bash
pnpm test
pnpm test:watch
```

**Type check:**

```bash
pnpm typecheck
```

**Lint and format:**

```bash
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm fmt          # oxfmt
pnpm fmt:check    # oxfmt --check
```

---

## 👨‍💻 Author

Developed and maintained by [Ruslan Martynov](https://github.com/ruslan-mart).

Found a bug or have a suggestion? Open an issue or submit a pull request.

---

## 📄 License

Distributed under the [MIT License](./LICENSE).
