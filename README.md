<div align="center">
  <h1>🎒 UniGear</h1>
  <p><strong>基于 React Native 和 Supabase 的智能校园资产借用系统</strong></p>

  <p>
    <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" /></a>
    <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  </p>
</div>

---

## ✨ 项目简介 (Introduction)

**UniGear** 是一款专为校园场景打造的智能资产借用移动应用。本项目旨在提供一套高效、透明且现代化的数字化借用体验，帮助师生轻松预约、管理校园公共资产。通过现代化的移动端技术，取代传统低效的借用流程，为校园资产数字化流转提供全周期的解决方案。

## 🚀 核心功能亮点 (Features)

- **📅 实时状态日历（防冲突预约逻辑）**：可视化的日历组件展示资产在不同日期的可借状态，配合后端强大的防冲突验证，确保多人借用互不干扰。
- **📷 摄像头扫码无缝跳转**：支持快速调用手机摄像头扫描资产二维码，一键直达详情页进行借用，免去繁琐的搜索步骤。
- **💅 优雅的 UI 交互与体验**：
  - 采用流线型的骨架屏（Skeleton）与全局 Loading 状态，告别突兀的白条与白屏。
  - 核心操作（如提交表单、预约等）具备防连点（Debounce）保护，保障系统数据稳定。
  - 支持下拉刷新等原生交互，列表数据随时保持最新，体验丝滑流畅。
- **🔄 完整的订单状态流转（借用记录）**：从发起预约到最终归还，用户拥有全链路的状态跟踪与详细的历史借用记录展示。

## 📸 精彩截图 (Screenshots)

*在这里一览 UniGear 的设计与功能：*

<div align="center">
  <img src="./docs/home.png" alt="首页演示" width="250" style="margin: 0 10px;" />
  <img src="./docs/detail.png" alt="资产详情与日历" width="250" style="margin: 0 10px;" />
  <img src="./docs/profile.png" alt="借用记录" width="250" style="margin: 0 10px;" />
</div>

> **💡 Note:** 克隆项目后，请将对应的真实 UI 截图放到项目根目录下的 `docs/` 文件夹中并命名为 `home.png` / `detail.png` / `profile.png`。

## 🛠️ 技术栈展示 (Tech Stack)

本项目采用了当前业内主流的移动端与 BaaS 技术组合，确保高效开发与长效维护：

- **Frontend & App Engine:** [React Native (Expo)](https://expo.dev/)
- **Programming Language:** [TypeScript](https://www.typescriptlang.org/) — 提供极佳的类型安全机制
- **Backend Services:** [Supabase](https://supabase.com/) (PostgreSQL + RLS Auth)
- **Routing & Navigation:** [React Navigation](https://reactnavigation.org/)
- **Date Utilities:** [date-fns](https://date-fns.org/)

## 🏃‍♂️ 本地运行指南 (Getting Started)

跟随以下步骤在本地启动与运行该项目。

### 1. 克隆代码

```bash
git clone <本项目的 Git 仓库地址>
cd Capstone_Project_Group5
```

### 2. 安装依赖并进入子目录

移动端代码位于 `app-mobile` 文件夹下，请进入该目录并安装必要的包与依赖：

```bash
cd app-mobile
npm install
```

### 3. 配置环境变量

在 `app-mobile` 目录下创建环境配置文档：

```bash
# 如果有 .env.example 可以先复制一份
cp .env.example .env
```

请在 `.env` 中填写您的 Supabase 项目配置：

```env
# app-mobile/.env
EXPO_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
```

> **🛑 极度重要 (CAUTION):**
> 任何情况下，**绝对不要**把真实的 API Key 直接写在 README 或提交至公开的 Git 记录中！确保你的 `.env` 文件被包含在了 `.gitignore` 规则里。

### 4. 启动应用

启动 Expo 本地开发服务器：

```bash
npx expo start
```

启动后，您可以使用装有 **Expo Go App** 的真机扫描终端中显示的二维码进行预览，或按下 `i` / `a` 使用 iOS / Android 模拟机运行。

## 👥 团队成员分工 (Team)

感谢我们精诚合作的团队，为大家带来了这样一款出色的应用：

| 分工模块 | 团队成员 | 核心产出内容 |
| :--- | :--- | :--- |
| **前端开发 (Frontend)** | **[你的名字/我]** | 全局 UI/UX 落地、应用路由搭建、扫码交互集成、防冲突日历对接、状态流转页面编写及前端优化逻辑 |
| **后端开发 (Backend)** | **Bosheng** | Supabase 数据库底座、表结构设计、API 封装、高并发下的预约防冲突逻辑及 RLS 数据安全策略 |
| **其他模块 (Others)** | **Cunjun** | 数据流收集测试、其他模块系统支撑及测试保障 |

---

<div align="center">
  <sub>Built with ❤️ by Capstone Project Group 5</sub>
</div>
