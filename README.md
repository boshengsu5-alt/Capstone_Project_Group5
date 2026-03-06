# UniGear — Campus Asset Management System (校园资产管理系统)

> **Dual-Track Monorepo**: Web Admin + Mobile App, powered by Supabase.
> (双轨 Monorepo 架构：Web 管理面板 + 移动端应用，后端使用 Supabase)

## 项目结构 / Project Structure

```
Capstone_Project/
├── app-web/          # Next.js 14 Admin Panel (Web 管理面板)
├── app-mobile/       # Expo SDK 50 Mobile App (移动端应用)
├── database/         # Supabase migrations, seeds & types (数据库)
│   ├── migrations/   # SQL migration files
│   ├── seed/         # Seed data scripts
│   └── types/        # Auto-generated TypeScript types
├── docs/             # Documentation (项目文档)
│   ├── requirements/ # Requirement specs
│   ├── design/       # Figma & design docs
│   └── qa/           # QA reports
└── .agents/          # AI agent rules & workflows
```

## 技术栈 / Tech Stack

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Web      | Next.js 14 (App Router) + Tailwind |
| Mobile   | React Native (Expo SDK 50)         |
| Backend  | Supabase (PostgreSQL + RLS)        |
| Language | Strict TypeScript (no `any`)       |

## 团队 / Team

| Squad          | Members                    | Directory      |
| -------------- | -------------------------- | -------------- |
| Mobile + DB    | Bosheng, Yuxuan, Cunjun    | `/app-mobile/` & `/database/` |
| Web            | Letao, Linpeng             | `/app-web/`    |

## 快速开始 / Quick Start

```bash
# Web Admin Panel
cd app-web && npm install && npm run dev

# Mobile App
cd app-mobile && npm install && npx expo start
```

## 开发规范 / Development Rules

- **Contract-Driven**: All frontend types imported from `database/types/supabase.ts`
- **Bilingual Comments**: English first, Chinese second
- **Strict TypeScript**: No `any` type allowed
- **Component Limit**: Max 150 lines per component

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
