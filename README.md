<div align="center">
  <h1>🎒 UniGear</h1>
  <p><strong>Smart Campus Asset Borrowing System | 智能校园资产借用系统</strong></p>
  <p><em>Dual-track monorepo: Expo 50 Mobile App + Next.js 14 Admin Panel + Supabase Backend</em></p>
  <p><em>双轨一体化仓库：Expo 50 移动端 + Next.js 14 管理后台 + Supabase 后端</em></p>

  <p>
    <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" /></a>
    <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo_50-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  </p>
</div>

---

## ✨ Introduction | 项目简介

**UniGear** is a smart campus asset borrowing platform built for university environments. It provides a complete digital borrowing experience — students can browse, reserve, scan, and return equipment entirely through their phones, while administrators manage the full approval workflow from a web dashboard.

**UniGear** 是一款专为高校场景打造的智能资产借用平台。学生可通过手机 App 完成设备浏览、预约、扫码取货与归还全流程；管理员则通过 Web 后台完成审批、资产管理与操作留痕，实现校园资产数字化全周期管理。

---

## 🚀 Features | 核心功能

### 📱 Mobile App (Student Side) | 移动端（学生端）

- **📅 Conflict-proof Booking Calendar | 防冲突预约日历** — Visual calendar shows real-time availability; the backend uses a `FOR UPDATE` row lock to guarantee atomic booking creation, eliminating ghost double-bookings under concurrent load. / 可视化日历展示资产可用状态；后端采用 `FOR UPDATE` 行锁保证原子化预约，从根本上消除高并发下的"幽灵超卖"。
- **📷 QR Code Scan-to-Borrow | 扫码一键取货** — Instantly scan an asset's QR code to jump to its detail page or activate a pickup. / 扫描资产二维码，一键跳转详情页或直接激活取货。
- **🔔 Real-time In-app Notifications | 实时应用内通知** — Supabase Realtime subscription pushes approval/rejection toasts the moment an admin acts; a red dot badge appears on the profile tab. / Supabase Realtime 订阅，管理员审批后即时弹出 Toast 提醒，个人页 Tab 显示红点角标。
- **🔄 Full Booking Lifecycle | 完整借用状态流转** — Tracks every stage: pending → approved → active → returned / overdue, with history records and review submission. / 覆盖全生命周期：待审批 → 已批准 → 使用中 → 已归还 / 逾期，支持历史记录与评价提交。
- **💅 Polished UX | 精致交互体验** — Skeleton screens, pull-to-refresh, debounced form submissions, and graceful error states throughout. / 骨架屏、下拉刷新、防抖提交、优雅错误处理，全程丝滑。

### 🖥️ Web Admin Panel (Staff Side) | Web 管理后台（管理员端）

- **✅ Booking Approval Workflow | 借用审批工作流** — Review, approve, or reject student requests in one click; push notifications fire automatically. / 一键审批或拒绝借用申请，自动触发通知推送。
- **🗄️ Asset Management | 资产管理** — Full CRUD for equipment with category, condition, location, QR code, and purchase date tracking. / 设备全生命周期管理，支持分类、状况、位置、二维码与购买日期。
- **📊 Excel Export | 数据导出** — Export asset lists and damage reports to `.xlsx` files for offline analysis. / 一键导出资产清单与损坏报告为 Excel 文件。
- **🔍 Audit Logs | 审计日志** — Every admin action (create / update / approve / reject) is recorded immutably for accountability. / 所有管理操作不可篡改地留痕，实现全流程可追溯。
- **🔧 Damage Report Handling | 损坏报告处理** — Admins review damage reports, set severity, deduct student credit scores, and mark assets for maintenance. / 管理员处理损坏报告，设置严重等级、扣减信用分、将资产标记为维修状态。

---

## 📸 Screenshots | 精彩截图

*A glimpse of UniGear's design and functionality. | 一览 UniGear 的设计与功能：*

<div align="center">
  <img src="./docs/home.png" alt="Home Screen | 首页" width="250" style="margin: 0 10px;" />
  <img src="./docs/detail.png" alt="Asset Detail & Calendar | 资产详情与日历" width="250" style="margin: 0 10px;" />
  <img src="./docs/profile.png" alt="Booking History | 借用记录" width="250" style="margin: 0 10px;" />
</div>

> **💡 Note:** After cloning, place real UI screenshots in the `docs/` folder named `home.png` / `detail.png` / `profile.png`.
> **💡 注意：** 克隆项目后，将真实截图放至 `docs/` 目录并命名为上述文件名。

---

## 🛠️ Tech Stack | 技术栈

| Layer | Technology | Purpose / 用途 |
| :--- | :--- | :--- |
| **Mobile App** | React Native (Expo 50) | Cross-platform iOS/Android app / 跨平台移动应用 |
| **Web Admin** | Next.js 14 (App Router) | Server-rendered admin dashboard / 服务端渲染管理后台 |
| **Language** | TypeScript | Type safety across all layers / 全端类型安全 |
| **Backend / DB** | Supabase (PostgreSQL) | Auth, RLS, Realtime, Storage / 认证、行级安全、实时订阅、文件存储 |
| **Styling (Web)** | Tailwind CSS | Utility-first CSS / 原子化样式 |
| **Navigation** | React Navigation 6 | Stack + Tab navigators / 栈式与标签导航 |
| **Data Export** | xlsx (SheetJS) | Excel file generation / Excel 文件生成 |
| **DB Functions** | PL/pgSQL (RPC) | Atomic booking, overdue detection, credit score / 原子预约、逾期检测、信用分 |

---

## 🏃‍♂️ Getting Started | 本地运行指南

### Prerequisites | 环境要求

- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for mobile preview) / 手机安装 Expo Go（移动端预览）

### 1. Clone the repo | 克隆代码

```bash
git clone https://github.com/boshengsu5-alt/Capstone_Project_Group5.git
cd Capstone_Project_Group5
```

### 2. Mobile App | 移动端

```bash
cd app-mobile
npm install
```

Create `app-mobile/.env`: | 创建环境变量文件：

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npx expo start
```

Scan the QR code in the terminal with Expo Go, or press `a` for Android / `i` for iOS simulator.
扫描终端二维码用 Expo Go 预览，或按 `a` / `i` 启动模拟器。

### 3. Web Admin Panel | Web 管理后台

```bash
cd app-web
npm install
```

Create `app-web/.env.local`: | 创建环境变量文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. | 浏览器打开 http://localhost:3000。

### 4. Database Migrations | 数据库迁移

Run the SQL files in `database/migrations/` in order (001 → 007) in the Supabase SQL Editor.
在 Supabase SQL Editor 中按顺序执行 `database/migrations/` 下的 SQL 文件（001 → 007）。

> **🛑 Important | 重要：** Never commit real API keys to Git. Keep `.env` and `.env.local` in `.gitignore`. / 切勿将真实密钥提交至 Git，确保 `.env` 文件在 `.gitignore` 中。

---

## 👥 Team | 团队成员分工

| Squad | Members | Responsibilities | 负责内容 |
| :--- | :--- | :--- | :--- |
| **Mobile — Auth & Booking** | **Bosheng** | Login/Register screens, auth service, booking service (mobile), navigation architecture, database schema design, all RPC functions (atomic booking, overdue detection, credit score), RLS security policies, notification backend | 登录注册页、认证服务、移动端借用服务、导航架构、数据库结构设计、所有 RPC 函数（原子预约、逾期检测、信用分）、RLS 安全策略、通知后端 |
| **Mobile — Assets & UI** | **Yuxuan** | Home screen, category browsing, asset card components, asset detail screen, image optimization (expo-image) | 首页、分类浏览、资产卡片组件、资产详情页、图片性能优化 |
| **Mobile — Scan & Reports** | **Cunjun** | QR code scanner, damage report screen, notification screen, booking history screen, review modal, real-time toast notifications, camera permission graceful degradation | 二维码扫码、损坏报修页、通知页、借用历史页、评价弹窗、实时 Toast 通知、相机权限容灾 |
| **Web Admin — Assets & Audit** | **Letao** | Assets management page, audit logs page, Excel export utility, admin login page | 资产管理页、审计日志页、Excel 导出工具、管理员登录页 |
| **Web Admin — Bookings & Damage** | **Linpeng** | Bookings approval page, damage reports management page, web dashboard overview | 借用审批页、损坏报告处理页、Web 仪表盘总览 |

---

## 🗂️ Project Structure | 项目结构

```
Capstone_Project/
├── app-mobile/          # 📱 Expo Mobile App (Bosheng / Yuxuan / Cunjun)
│   └── src/
│       ├── screens/     # One file per screen
│       ├── services/    # All Supabase API calls
│       ├── navigation/  # Navigator configuration
│       └── context/     # Auth, Notification, Toast providers
├── app-web/             # 🖥️ Next.js Admin Panel (Letao / Linpeng)
│   ├── app/             # App Router pages & API routes
│   ├── components/      # Reusable UI components
│   └── lib/             # Services & utilities
└── database/
    ├── migrations/      # 001–007 sequential SQL migration files
    ├── seed/            # Seed data scripts
    └── types/
        └── supabase.ts  # Single source of truth for all types
```

---

<div align="center">
  <sub>Built with ❤️ by Capstone Project Group 5 · Centria University of Applied Sciences</sub>
</div>
