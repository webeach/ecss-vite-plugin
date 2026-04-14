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
  <p>Vite-плагин для ECSS — трансформирует .ecss-файлы в CSS + JS с поддержкой HMR.</p>
  <br>
  <p>
    <a href="https://ecss.webea.ch/ru" style="font-size: 1.5em">📖 Документация</a> | <a href="https://ecss.webea.ch/ru/reference/spec.html" style="font-size: 1.5em">📋 Спецификация</a>
  </p>
</div>

---

## 💎 Особенности

- ⚡ **Нативная интеграция с Vite** — использует Vite Plugin API напрямую
- 🔥 **HMR** — горячая перезагрузка `.ecss`-файлов без полного обновления страницы
- 🎨 **Виртуальный CSS** — генерированный CSS инжектируется через нативный CSS-пайплайн Vite
- 🏃 **Runtime** — автоматически резолвит `virtual:ecss/runtime` до реальных хелперов из `@ecss/transformer`
- 🧩 **Фреймворк-независим** — поддерживает React (`className`), Vue / Svelte / Solid (`class`) и оба варианта одновременно
- 📝 **TypeScript** — типизированный API, generic-типы для `.ecss`-импортов через `./client`
- ⚙️ **Конфиг** — читает `ecss.config.json` из корня проекта, явные опции имеют приоритет

---

## 📦 Установка

```bash
npm install @ecss/vite-plugin
```

или

```bash
pnpm add @ecss/vite-plugin
```

или

```bash
yarn add @ecss/vite-plugin
```

---

## 🚀 Быстрый старт

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

### Использование в коде

```ts
import styles from './button.ecss';

// Позиционный вызов
const props = styles.Button('dark', true);
// → { className: 'Button-a1b2c3', 'data-e-a1b2c3-theme': 'dark', 'data-e-a1b2c3-disabled': '' }

// Именованный вызов
const props2 = styles.Button({ theme: 'dark' });

// Объединение нескольких стилей
const merged = styles.merge(styles.Button('dark'), styles.Icon({ size: 'sm' }));
```

---

## 🛠 API

### `ecss(options?): Plugin`

Создаёт экземпляр Vite-плагина. Импортируется как default export:

```ts
import ecss from '@ecss/vite-plugin';

const plugin = ecss({ classAttribute: 'class' });
```

---

## ⚙️ Опции

```ts
interface EcssPluginOptions {
  classAttribute?: 'className' | 'class' | 'both'; // по умолчанию 'className'
  classTemplate?: string; // по умолчанию '[name]-[hash:6]'
  extensions?: string[]; // по умолчанию ['.ecss']
  generateDeclarations?: boolean; // по умолчанию false
}
```

| Опция                  | Описание                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `classAttribute`       | Какие поля (`class`, `className` или оба) включить в результат state-функции       |
| `classTemplate`        | Шаблон имени класса; поддерживает токены `[name]` и `[hash:N]`                     |
| `extensions`           | Расширения файлов, которые плагин обрабатывает                                     |
| `generateDeclarations` | При `true` записывает `.ecss.d.ts` рядом с каждым `.ecss`-файлом при старте сборки |

### `ecss.config.json`

Опции можно задать в `ecss.config.json` в корне проекта — явные опции плагина имеют приоритет:

```json
{
  "classAttribute": "class",
  "classTemplate": "[name]-[hash:8]",
  "generateDeclarations": true
}
```

### Шаблон имени класса

Строка `classTemplate` поддерживает два токена:

| Токен      | Описание                                        |
| ---------- | ----------------------------------------------- |
| `[name]`   | Идентификатор `@state-def` (например, `Button`) |
| `[hash]`   | Первые 6 символов SHA-256 от `filePath + name`  |
| `[hash:N]` | Первые `N` символов хеша                        |

Пример: `"[name]-[hash:8]"` для `Button` даст что-то вроде `Button-a1b2c3d4`.

---

## 📐 Как это работает

Плагин встраивается в pipeline Vite:

1. **`transform`** — когда Vite встречает `.ecss`-файл, плагин парсит его через `@ecss/parser`, трансформирует AST в CSS + JS через `@ecss/transformer` и возвращает JS с виртуальным CSS-импортом
2. **`resolveId` + `load`** — виртуальный CSS-импорт (`?ecss&lang.css`) резолвится и отдаётся из кеша в памяти; Vite воспринимает его как нативный CSS благодаря суффиксу `lang.css`
3. **`handleHotUpdate`** — при изменении `.ecss`-файла плагин пере-обрабатывает его и инвалидирует виртуальный CSS-модуль, чтобы Vite применил HMR

Модуль `virtual:ecss/runtime` резолвится до реального пакета `@ecss/transformer/runtime`, чтобы сгенерированный JS мог вызывать `_h()` и `merge()` в рантайме.

---

## 📐 TypeScript-типы для `.ecss`-импортов

### Через language service plugin (`@ecss/typescript-plugin`)

Для точных per-file типов подключи `@ecss/typescript-plugin` в `tsconfig.json` — он генерирует типы прямо в IDE без дополнительных файлов.

### Через generic-типы (`./client`)

Если language service plugin недоступен, добавь reference на `@ecss/vite-plugin/client` в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@ecss/vite-plugin/client"]
  }
}
```

Это даёт общий тип для всех `.ecss`-импортов:

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

### Через `generateDeclarations`

При `generateDeclarations: true` плагин записывает точный `.ecss.d.ts` рядом с каждым `.ecss`-файлом. Подходит для Svelte и других инструментов, которые не загружают tsserver-плагины.

---

## 🔧 Разработка

**Сборка:**

```bash
pnpm build    # production
pnpm dev      # watch mode
```

**Тесты:**

```bash
pnpm test
pnpm test:watch
```

**Проверка типов:**

```bash
pnpm typecheck
```

**Линтинг и форматирование:**

```bash
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm fmt          # oxfmt
pnpm fmt:check    # oxfmt --check
```

---

## 👨‍💻 Автор

Разработка и поддержка: [Руслан Мартынов](https://github.com/ruslan-mart)

Если нашёл баг или есть предложение — открывай issue или отправляй pull request.

---

## 📄 Лицензия

Распространяется под [лицензией MIT](./LICENSE).
