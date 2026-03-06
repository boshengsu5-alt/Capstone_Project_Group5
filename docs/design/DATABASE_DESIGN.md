# UniGear Database Design

> Campus Asset Management System — 校园资产管理系统
> Author: Bosheng Su | Date: 2026-03-06

---

## 1. System Architecture Overview / 系统架构概览

```mermaid
flowchart TB
    subgraph Users ["👤 Users / 用户"]
        S["📱 Student App\n学生移动端"]
        A["💻 Admin Dashboard\n管理员 Web 端"]
    end

    subgraph API ["☁️ Supabase Backend / 后端"]
        AUTH["🔐 Auth\n认证服务"]
        REST["🔗 REST API\n数据接口"]
        RT["⚡ Realtime\n实时推送"]
        STORE["📦 Storage\n文件存储"]
    end

    subgraph DB ["🗄️ PostgreSQL Database / 数据库"]
        P["👤 profiles\n用户资料"]
        C["📂 categories\n资产分类"]
        AS["📋 assets\n资产/设备"]
        B["📝 bookings\n借用记录"]
        D["⚠️ damage_reports\n损坏报告"]
        N["🔔 notifications\n通知"]
        R["⭐ reviews\n评价"]
    end

    S -->|"scan QR / 扫码借用"| REST
    S -->|"login / 登录"| AUTH
    S -->|"upload photo / 上传照片"| STORE
    A -->|"manage assets / 管理资产"| REST
    A -->|"login / 登录"| AUTH
    A -->|"receive alerts / 接收提醒"| RT

    REST --> P & C & AS & B & D & N & R
    AUTH --> P
    RT --> B & N
```

---

## 2. Entity Relationship Diagram / 实体关系图

```mermaid
erDiagram
    profiles ||--o{ assets : "creates / 创建"
    profiles ||--o{ bookings : "borrows / 借用"
    profiles ||--o{ bookings : "approves / 审批"
    profiles ||--o{ damage_reports : "reports / 报告"
    profiles ||--o{ notifications : "receives / 接收"
    profiles ||--o{ reviews : "writes / 撰写"

    categories ||--o{ assets : "contains / 包含"

    assets ||--o{ bookings : "is booked / 被借用"
    assets ||--o{ damage_reports : "has damage / 有损坏"

    bookings ||--o| reviews : "has review / 有评价"
    bookings ||--o{ damage_reports : "has report / 有报告"

    profiles {
        uuid id PK "FK auth.users"
        text full_name "Full name / 全名"
        text student_id UK "Student ID / 学号"
        text email "Email / 邮箱"
        text phone "Phone / 电话"
        text avatar_url "Avatar / 头像"
        enum role "student | admin | staff"
        int credit_score "Trust score / 信用评分 0-200"
        text department "Department / 学院"
    }

    categories {
        uuid id PK "Auto-generated / 自动生成"
        text name UK "English name / 英文名"
        text name_zh "Chinese name / 中文名"
        text icon "Icon / 图标"
        text description "Description / 描述"
    }

    assets {
        uuid id PK "Auto-generated / 自动生成"
        uuid category_id FK "Category / 所属分类"
        uuid created_by FK "Creator / 创建者"
        text name "Name / 名称"
        text serial_number UK "Serial No. / 序列号"
        text qr_code UK "QR Code / 二维码"
        enum condition "Condition / 物理状况"
        enum status "Status / 可用状态"
        text location "Location / 存放位置"
        enum warranty_status "Warranty / 保修状态"
        decimal purchase_price "Price / 购买价格"
    }

    bookings {
        uuid id PK "Auto-generated / 自动生成"
        uuid asset_id FK "Asset / 借用资产"
        uuid borrower_id FK "Borrower / 借用者"
        uuid approver_id FK "Approver / 审批者"
        enum status "Status / 借用状态"
        timestamp start_date "Start / 开始日期"
        timestamp end_date "End / 结束日期"
        timestamp actual_return "Actual return / 实际归还"
        text return_photo_url "Return photo / 归还照片"
        text rejection_reason "Rejection reason / 拒绝原因"
    }

    damage_reports {
        uuid id PK "Auto-generated / 自动生成"
        uuid booking_id FK "Booking / 借用记录"
        uuid asset_id FK "Asset / 资产"
        uuid reporter_id FK "Reporter / 报告者"
        text description "Description / 损坏描述"
        enum severity "minor | moderate | severe"
        enum status "Report status / 报告状态"
    }

    notifications {
        uuid id PK "Auto-generated / 自动生成"
        uuid user_id FK "Recipient / 接收者"
        enum type "Notification type / 通知类型"
        text title "Title / 标题"
        text message "Content / 内容"
        boolean is_read "Read / 已读"
    }

    reviews {
        uuid id PK "Auto-generated / 自动生成"
        uuid booking_id FK "Booking / 借用记录 (unique)"
        uuid reviewer_id FK "Reviewer / 评价者"
        int rating "1-5 stars / 1-5 星"
        text comment "Comment / 评价内容"
    }
```

---

## 3. Booking Lifecycle / 借用生命周期

```mermaid
stateDiagram-v2
    [*] --> pending : Student submits request\n学生提交申请
    pending --> approved : Admin approves\n管理员批准
    pending --> rejected : Admin rejects\n管理员拒绝
    pending --> cancelled : Student cancels\n学生取消
    approved --> active : Student picks up item\n学生取用设备
    approved --> cancelled : Student cancels\n学生取消
    active --> returned : Student returns item\n学生归还设备
    active --> overdue : Past due date\n超过归还日期
    overdue --> returned : Late return\n迟归还
    returned --> [*]
    rejected --> [*]
    cancelled --> [*]
```

---

## 4. Table Relationships / 表关系

### One-to-Many / 一对多

| Parent / 父表 | Child / 子表 | Relationship / 关系 |
|---|---|---|
| `profiles` | `assets` | Admin creates assets / 管理员创建资产 |
| `profiles` | `bookings` | Student borrows, Admin approves / 学生借用，管理员审批 |
| `profiles` | `damage_reports` | User reports damage / 用户报告损坏 |
| `profiles` | `notifications` | User receives alerts / 用户收到通知 |
| `profiles` | `reviews` | User writes reviews / 用户撰写评价 |
| `categories` | `assets` | Category groups assets / 分类归组资产 |
| `assets` | `bookings` | Asset gets booked / 资产被多次借用 |
| `bookings` | `damage_reports` | Booking may cause damage / 借用可能产生损坏 |

### One-to-One / 一对一

| Table A | Table B | Note / 说明 |
|---|---|---|
| `bookings` | `reviews` | Each booking has at most one review / 每次借用最多一条评价 |

---

## 5. Enum Definitions / 枚举类型

### `user_role` — User Types / 用户类型

| Value | English | 中文 |
|-------|---------|------|
| `student` | Student | 学生 |
| `admin` | Administrator | 管理员 |
| `staff` | Lab Staff | 实验室工作人员 |

### `asset_condition` — Physical Condition / 物理状况

| Value | English | 中文 |
|-------|---------|------|
| `new` | Brand new | 全新 |
| `good` | Good condition | 良好 |
| `fair` | Acceptable | 一般 |
| `poor` | Heavy wear | 较差 |
| `damaged` | Needs repair | 损坏 |

### `asset_status` — Availability / 可用性

| Value | English | 中文 |
|-------|---------|------|
| `available` | Ready to borrow | 可借用 |
| `borrowed` | In use | 使用中 |
| `maintenance` | Under repair | 维修中 |
| `retired` | Decommissioned | 已退役 |

### `damage_severity` — Damage Level / 损坏等级

| Value | English | 中文 |
|-------|---------|------|
| `minor` | Cosmetic issue | 轻微 |
| `moderate` | Affects function | 中等 |
| `severe` | Unusable | 严重 |

---

## 6. RLS Policies / 行级安全策略

| Table / 表 | Read / 读 | Write / 写 | Update / 改 | Delete / 删 |
|-------|------|-------|--------|--------|
| `profiles` | All users / 所有用户 | Auto on signup / 注册自动 | Own only / 仅自己 | ✗ |
| `categories` | All users / 所有用户 | Admin only / 仅管理员 | Admin only / 仅管理员 | Admin only / 仅管理员 |
| `assets` | All users / 所有用户 | Admin only / 仅管理员 | Admin only / 仅管理员 | Admin only / 仅管理员 |
| `bookings` | Own + Admin / 自己+管理员 | Own only / 仅自己 | Own + Admin / 自己+管理员 | ✗ |
| `damage_reports` | Own + Admin / 自己+管理员 | Reporter / 报告者 | Admin only / 仅管理员 | ✗ |
| `notifications` | Own only / 仅自己 | Admin only / 仅管理员 | Own (mark read) / 标记已读 | ✗ |
| `reviews` | All users / 所有用户 | Own only / 仅自己 | Own only / 仅自己 | ✗ |

---

## 7. Design Notes / 设计说明

| Decision / 决策 | Reason / 原因 |
|---|---|
| UUID primary keys / UUID 主键 | Globally unique, safe for mobile offline sync / 全局唯一，适合移动端离线同步 |
| Separate `damage_reports` / 独立损坏表 | Keeps `bookings` clean, one booking can have multiple damage records / 保持借用表干净 |
| `credit_score` on profiles / 信用评分 | Admins use this when reviewing borrow requests / 管理员审批时参考 |
| `qr_code` on assets / 二维码字段 | Students scan QR codes to start borrowing / 学生扫码借用的核心功能 |
| `return_photo_url` / 归还照片 | Proof of condition at return, protects both sides / 归还状况证明，保护双方权益 |
| Bilingual `name`/`name_zh` / 双语字段 | Supports English and Chinese UI / 支持中英文界面 |

---

*For the visual ER diagram, paste `er-diagram.dbml` into [dbdiagram.io](https://dbdiagram.io) and export as PNG.*
