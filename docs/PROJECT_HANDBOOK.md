# 🎓 UniGear 校园资产管理系统 — 团队开发完全手册 (企业级硬核终极版)

> **项目周期**：14天 (2026年3月7日 - 3月20日)
> **工时要求**：每人每天 **满打满算 6 小时** (纯敲代码、查文档、联调联试的时间)
> **目标人群**：零基础/初次接触完整前后端分离项目的学生团队
> **终极目标**：在 4 月 9 日的 Business Playground 商业展会上，拿出能直接落地商用的企业级 SaaS 实体产品！

---

## 零、写给全队新手的保命铁律（每天开工前必须看一遍！）

我们是一个 5 个人同时写同一个项目的团队，代码极其容易互相覆盖打架，酿成惨剧。以下是绝对红线：

1. **绝不允许修改别人的文件！** 你的任务分在哪个文件夹，你就只能在这个文件夹里新建和修改文件。千万不要出于好心去改别人的代码。
2. **每天必须保存上交进度：** 下班前必须在终端输入这三行命令：
   - `git add .`
   - `git commit -m "今天完成了XX页面的UI设计"`
   - `git push`
3. **遇到红屏幕报错不要死磕：** 超过 1 小时查不出原因的 Bug，立刻在群里找负责后端的 Bosheng 求救。不要自己乱删库或者乱动别人的文件试图修复。
4. **后端没写好时的前台绝活：** 如果 Bosheng 还没写好查数据库的接口，Yuxuan、Cunjun、Letao 和 Linpeng **绝对不要停下干等**！你们要在自己的页面里手写一段**假数据 (Mock Data)** 来代替（比如写个 `const fakeAssets = [{ id: 1, name: "相机" }]`），先把界面跑通。
5. **💣【排雷铁律】数据库更新吼声：** Bosheng 每次在 Supabase 后台修改了表结构（比如加了个字段），必须**第一时间**重新生成 `types/supabase.ts` 并推送到 GitHub，然后**立刻在群里大吼一声**：“数据库更新了，大家 `git pull`！”。其他人听到立刻拉取最新类型，否则旧前端强行调用新字段会直接全屏崩溃！

---

## 一、项目完整文件夹导航树及“领地”划分 (重要参考)

大家对照着看自己应该在哪个目录下干活，别人的目录碰都别碰。团队的重心完全在于**代码开发**：

* **📱 移动端 (`/app-mobile`)**：Bosheng, Yuxuan, Cunjun
* **💻 网页端 (`/app-web`)**：Letao, Linpeng
* **🗄️ 数据库 (`/database`)**：Bosheng

*(注：大家认准自己的 `components` 和 `screens/pages`，严格执行物理隔离，坚决不跨界写代码)*

```
Capstone_Project/
├── app-mobile/                        ← 📱 Bosheng / Yuxuan / Cunjun 的阵地
│   └── src/
│       ├── components/                ← 拿来到处拼装的小积木模块
│       │   ├── ui/                    ← Yuxuan专属 (红色的按钮、灰色的输入框)
│       │   ├── AssetCard.tsx          ← Yuxuan专属 (一个商品长什么样的卡片UI)
│       │   ├── CalendarView.tsx       ← Yuxuan专属 (高级的日历组件：显示哪天借了哪天没借)
│       │   ├── QRScanner.tsx          ← Cunjun专属 (调手机后置摄像头扫码的黑框)
│       │   ├── PhotoCapture.tsx       ← Cunjun专属 (按快门咔嚓拍照并保存的小方块)
│       │   └── NotificationItem.tsx   ← Cunjun专属 (一条消息提醒的UI)
│       ├── screens/                   ← App的一整个大的全屏页面！
│       │   ├── auth/
│       │   │   ├── LoginScreen.tsx    ← Bosheng (登录一整页)
│       │   │   └── RegisterScreen.tsx ← Bosheng (注册一整页)
│       │   ├── home/
│       │   │   ├── HomeScreen.tsx     ← Yuxuan (首页：带轮播图和商品)
│       │   │   └── CategoryScreen.tsx ← Yuxuan (按分类查看的列表页)
│       │   ├── asset/
│       │   │   └── AssetDetailScreen.tsx ← Yuxuan (资产详情页及日历)
│       │   ├── scan/
│       │   │   └── ScanScreen.tsx     ← Cunjun (扫码全屏页)
│       │   ├── booking/
│       │   │   ├── BookingFormScreen.tsx    ← Bosheng (填写借用日期的表单页)
│       │   │   ├── BookingHistoryScreen.tsx ← Cunjun (我这学期借了啥的列表大页)
│       │   │   └── ReturnScreen.tsx         ← Cunjun (归还相机强制拍照的详情页)
│       │   ├── damage/
│       │   │   └── DamageReportScreen.tsx   ← Cunjun (提交损坏报修和照片的表单单页)
│       │   └── profile/
│       │       ├── ProfileScreen.tsx        ← Yuxuan (我的主页，展示信用分)
│       │       └── NotificationScreen.tsx   ← Cunjun (完整的全屏消息通知列表页)
│       ├── navigation/                ← 控制这些页面怎么互相跳转的中枢神经
│       │   ├── RootNavigator.tsx      ← Bosheng (总开关：判明有没有登录)
│       │   └── MainTabNavigator.tsx   ← ✅ 已完成 (Bosheng - 底部的点击小标签)
│       └── services/                  ← 和互联网上的真实数据库发生网线交流的接口层
│           ├── supabase.ts            ← ✅ 已完成
│           ├── authService.ts         ← Bosheng
│           ├── assetService.ts        ← Bosheng
│           └── bookingService.ts      ← Bosheng
│
├── app-web/                           ← 💻 Letao / Linpeng 的阵地
│   ├── app/                           ← 这是控制网页网址（路由）的地方
│   │   ├── login/
│   │   │   └── page.tsx               ← Letao (管理端店长登录页面)
│   │   └── dashboard/                 ← 登录成功后的庞大管理大后台
│   │       ├── page.tsx               ← Letao (仪表盘：展示统计图表和今日概览的看板)
│   │       ├── assets/                ← Letao (列出几百个库房物资的巨大检索表格页)
│   │       ├── bookings/              ← Linpeng (借用申请等待队列列表页及详情)
│   │       ├── returns/               ← Linpeng (人工核验归还损坏的照片对比中心)
│   │       └── damage/                ← Linpeng (设备坏了被报修的客诉单管理列表)
│   ├── components/                    ← 从上面页面里拆出来的一块块小组件
│   │   ├── layout/                    ← Letao (如 Sidebar 侧边栏, Header 顶栏)
│   │   ├── assets/                    ← Letao (如 AssetTable 资产表格, AssetForm 新增表单)
│   │   ├── bookings/                  ← Linpeng (如 BookingTable, ApprovalModal 审批弹窗)
│   │   ├── returns/                   ← Linpeng (如 ReturnVerify 对比照片用的组件)
│   │   ├── damage/                    ← Linpeng (如 DamageTable 重灾客诉表格)
│   │   └── analytics/                 ← Letao (折线图 BorrowChart, 饼状图等)
│   └── lib/                           ← 网页端请求数据去要东西的地方 (Supabase 增删改查)
│       ├── supabase.ts                ← ✅ 已完成
│       ├── auth.ts                    ← Letao (Web端登录认证+角色校验逻辑)
│       ├── assetService.ts            ← Letao
│       └── bookingService.ts          ← Linpeng (含 damage_reports 的增删改查)
│
├── database/                          ← 🗄️ Bosheng
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     ← ✅ 已完成
│   │   └── 002_rpc_functions_and_audit_logs.sql ← Bosheng (Day 4 RPC函数 / Day 12 加 audit_logs 表)
│   ├── seed/
│   │   └── seed.sql                   ← ✅ 已完成
│   └── types/
│       └── supabase.ts                ← ✅ 已完成
│
└── docs/
    ├── design/
    │   ├── DATABASE_DESIGN.md         ← ✅ 已完成
    │   └── er-diagram.dbml            ← ✅ 已完成
    └── requirements/                  ← 需求原始文件
```

---

## 二、每天 6 小时魔鬼推进表（100% 纯写代码版）

> **没有专门的划水测试期。每天写完一个功能必须自己跑通。这 14 天全用来写代码和拼装系统。**
> **开始日期：2026-03-07**

### 🟢 第一阶段：点亮黑暗，前端狂画壳子 (Day 1 - Day 3)

*目标：这一阶段只关注在屏幕上画出一个个带颜色的空白页面，不连网，全部用自己编的假文字填满。*

#### ☀️ Day 1 (3/7)：基建局域配置与大架子

* **Bosheng**：帮大家处理 `npm install` 的无主报错。连通手机底部有四个小图标的 `MainTabNavigator.tsx`。 **(✅ 已完成)**
* **Yuxuan**：建立全局主题颜色 `theme.ts`，画出 `components/ui/Button.tsx` (紫色的通用按钮)。
* **Cunjun**：**💣【排雷铁血条件】：你的电脑和手机必须连接在同一个 Wi-Fi 热点下！千万别用校园网（会封端口导致 Expo Go 手机上万年白屏转圈）。强烈建议开个手机热点给电脑连。** 在稳定局域网下写出 `NotificationScreen.tsx` 的全尺寸空壳子。
* **Letao**：网页端启动 `npm run dev`，成功引入 Shadcn UI，把左侧的黑色菜单导航条 `Sidebar.tsx` 跑起来。
* **Linpeng**：啃 `TanStack Table` 文档。在网页画一个 `[ { item: "相机", user: "小明" } ]` 的静态假数据表。

#### ☀️ Day 2 (3/8)：疯狂填充 UI 皮肤

* **Bosheng**：写登录注册页 `LoginScreen.tsx` + `RegisterScreen.tsx` 的逻辑框架。同时写好 `authService.ts`（封装 `supabase.auth.signInWithPassword` / `signUp` / `signOut`），准备好能用账号密码发送给后台的函数体。
* **Yuxuan 全天画图**：画出手机主页 `HomeScreen.tsx` 外观皮囊（顶部轮播图画框 + 下方横滑产品列表）。**顶部加一个搜索栏输入框（先不接后台，纯UI）**，方便日后按名字筛选设备。
* **Cunjun 全天画图**：画出借用记录页 `BookingHistoryScreen.tsx` 的壳子。用假数组画出来”已借用、已逾期、已归还”三种颜色的堆叠卡片。
* **Letao 全天画图**：画后台精美的高端登录页面 `login/page.tsx`。**同时修正 `Sidebar.tsx` 的菜单项为实际路由：Dashboard / Assets / Bookings / Returns / Damage Reports，链接分别指向 `/dashboard`、`/dashboard/assets`、`/dashboard/bookings`、`/dashboard/returns`、`/dashboard/damage`。** **同时写好 `lib/auth.ts`**：封装 `signIn(email, password)`、`signOut()`、`getCurrentUser()`、`checkAdminRole()` 函数（从 Day 3 提前到 Day 2，减轻 Day 3 压力）。**💣【Day 4 对接真实登录时必须加角色验证】：登录成功后立刻查 `profiles` 表的 `role` 字段，如果不是 `admin` 或 `staff`，直接弹出"无管理权限"并跳回登录页！绝不能让普通学生进入管理后台！**
* **Linpeng 表格进阶**：用 TailwindCSS 美化你的表格。加斑马纹和不同状态色的高亮绿黄块！**同时真正实现 `BookingTable.tsx` 组件的内部结构**（不要再留占位符，至少能渲染传入的假数据行）。

#### ☀️ Day 3 (3/9)：硬件接口与复杂弹窗起步

* **Bosheng**：完善登录界面，打通 `RootNavigator.tsx` 的路由跳转（未登录 → 登录页，已登录 → 主Tab页）。**💣【关键架构任务：重构 `MainTabNavigator`，在每个 Tab 内嵌套 Stack Navigator】**：
  - Home Tab Stack：`HomeScreen → CategoryScreen → AssetDetailScreen → BookingFormScreen`
  - Bookings Tab Stack：`BookingHistoryScreen → ReturnScreen → DamageReportScreen`
  - Scan Tab：`ScanScreen`（单页，扫码后通过 `navigation.navigate('HomeStack', { screen: 'AssetDetail', params: { assetId } })` 跳到详情页）
  - Profile Tab Stack：`ProfileScreen → NotificationScreen`

  **没有嵌套 Stack Navigator，所有从列表页到详情页的跳转都会报错！这是 React Navigation 的硬性架构要求。**
  **同时开始写 `bookingService.ts`（移动端）骨架**：封装创建借用请求、获取我的借用列表等函数签名。
* **Yuxuan**：画出超精美的 `AssetCard.tsx`（长条商品卡片），铺满昨天的空白首页。**同时画出 `CategoryScreen.tsx`（分类列表页）**：用假数据展示分类图标网格（相机、无人机、实验室钥匙等）。**点击分类后导航回 `HomeScreen` 并传递 `categoryId` 参数**，`HomeScreen` 接收该参数后只显示该分类下的资产（Day 7 接真实筛选逻辑时一并实现）。
* **Cunjun 调原生相机**：写 `ScanScreen.tsx`！使用 `expo-camera` 强行弹出向系统索要相机权限的许可框。能在屏幕上看到自己的脸就算完工。
* **Letao**：建立 `Header.tsx` 面包屑顶部路径，画出网页版的极大资产录入表单页面 `AssetForm.tsx`。**创建 `dashboard/assets/page.tsx` 路由页面**（资产列表独立页面，从 `dashboard/page.tsx` 中把资产表格代码搬过来，`dashboard/page.tsx` 留给 Day 6 做统计仪表盘）。**开始写 `lib/assetService.ts`**：封装 `getAssets()`、`createAsset()`、`updateAsset()` 函数签名（先返回假数据）。（`lib/auth.ts` 已提前到 Day 2 完成）
* **Linpeng**：做网页端的 `ApprovalModal.tsx`（审核弹窗）——**必须真正实现弹窗 UI**，不要只留占位符！当你点击表里的小明时，弹窗：”同意借出(绿字) / 拒绝(红字)”。**同时开始写 `lib/bookingService.ts` 的真实函数体**：`getBookings()` 先查 Supabase 获取 `pending` 状态的记录。

---

### 🟡 第二阶段：连接真后台与生死缝合交接 (Day 4 - Day 8)

*目标：把假数据全部丢掉，所有人开始连接 Bosheng 建好的 Supabase 真实数据库！*

#### ☀️ Day 4 (3/10)：前台换上真心脏，与缝合雷区大排班

* **💣【排雷铁血协议：代码强制缝合】：今天起正式拉网线。Yuxuan 和 Cunjun 画完精美的 UI 组件后，只负责暴露出属性 (Props)，绝不允许擅自修改 Bosheng 的后台文件！必须由 Bosheng 在上层页面引入你们的卡片，并将他拉取的真实数据库字段 (如 `asset.name`) 一对一注入进去！**
* **Bosheng（今天任务极重，优先级排序执行）**：
  1. **~~【撤销】不需要加 `image_url` 字段！~~** 数据库已经有 `images TEXT[]` 数组字段（Schema 第106行）。通知 Yuxuan 的 `AssetCard` 用 `asset.images[0]` 作为封面图。~~`002_add_image_url_and_audit_logs.sql` 迁移文件不再需要加 `image_url`~~（只保留 Day 12 的 `audit_logs` 建表部分）。
  2. **【最优先】在 Supabase Dashboard 创建 Storage Bucket**：`asset-images`（资产图片）、`return-photos`（归还照片）、`damage-photos`（损坏照片），全部设为 authenticated 用户可上传、public 可读。**必须今天完成，否则明天 Cunjun 传照片会 403！** **同时在 Supabase Dashboard → Database → Replication 中开启 `bookings` 和 `notifications` 表的 Realtime 功能**（Day 8 和 Day 11 依赖此配置）。
  3. **【最优先】💣 RLS 排雷：创建 `SECURITY DEFINER` 的数据库函数**（学生无权直接 UPDATE `assets` 表和 INSERT `notifications` 表！）——**今天只写前两个最紧急的**：
     - `activate_booking(p_booking_id UUID)` — 将 booking 状态改为 `active` + 将 asset 状态改为 `borrowed`。前端调用 `supabase.rpc('activate_booking', { p_booking_id: id })`。
     - `return_booking(p_booking_id UUID, p_photo_url TEXT)` — 将 booking 状态改为 `returned`；若该借用仍存在 `open/investigating` 的损坏报告，则 asset 保持 `maintenance`，否则恢复 `available`；正常归还信用分 +5。
     这两个函数声明为 `SECURITY DEFINER`，以数据库所有者身份运行。**第三个 `check_overdue_bookings()` 移至 Day 5 再写，减轻今天压力。**
  4. 写好 `assetService` 的其余抓取代码，充当总工程师把后台数据硬插进 Yuxuan 的卡片组件里。
* **Yuxuan**：啃读 `react-native-calendars` 的使用文档！**先把日历逻辑封装到独立的 `CalendarView.tsx` 组件里**（接收 `markedDates` 属性，红色=已预订，绿色=可用），然后在 `AssetDetailScreen` 中引入 `CalendarView`。**在 `AssetDetailScreen` 底部放一个醒目的【立即预约】按钮**，点击后导航到 `BookingFormScreen` 并传递 `assetId` 参数。同时在 `HomeScreen` 上方加一排可横滑的分类图标条（从 `categories` 表取数据），点击后跳转到 `CategoryScreen` 并传递选中的 `categoryId`。
* **Cunjun 扫码截获**：加入二维码解析逻辑。当摄像头对着带有 `id` 乱码的二维码时，触发手机震动并把那串码输出打印到电脑控制台上。**💣【关键新增：扫码取货激活】扫到的 `qr_code` 值去查 `assets` 表拿到 `asset_id`，再查 `bookings` 表看当前用户是否有该资产状态为 `approved` 的借用记录。如果有，弹出确认框"确认取货？"，点确认后将状态从 `approved` 改为 `active` 并记录取货时间。如果没有，则跳转到资产详情页供用户查看或发起新预订。** 这一步是借用生命周期 `approved → active` 的唯一触发点！
* **Letao 对接库**：在 `lib/assetService.ts` 里把假数据全部换成真实的 Supabase 查询（`supabase.from('assets').select('*, categories(*)')`），让网页资产表格显示真实数据！**同时在 `createAsset()` 函数里用 `crypto.randomUUID()` 自动生成 `qr_code` 值**，并引入 `qrcode.react` 库在资产详情区域渲染可打印的二维码图片（管理员打印贴到设备上，学生才有码可扫）。
* **Linpeng 对接库**：在 `lib/bookingService.ts` 里实现三个真实函数：`getBookings()` 查 `bookings` 表并关联 `profiles` 和 `assets`；`approveBooking(id)` 和 `rejectBooking(id)` 执行真实的 `UPDATE` 操作。把 `BookingTable.tsx` 和 `ApprovalModal.tsx` 接上真数据！**审批通过时，同时调用 Supabase 向 `notifications` 表插入一条通知记录**（`type: 'booking_approved'`）。

#### ☀️ Day 5 (3/11)：防超卖核心与图片归档黑洞

* **Bosheng**：
  1. 写防冲突代码：校验如果在别人定的时间段内点击，直接抛出红字”时间冲突”并拦截。
  2. **在 `assetService.ts` 中新增 `getBookingsForAsset(assetId)` 函数**（从 Day 4 移入）：查询该资产所有 `pending/approved/active` 状态的 booking 的 `start_date` 和 `end_date`，供 Yuxuan 的日历标红。
  3. **创建第三个 RPC 函数 `check_overdue_bookings()`**（从 Day 4 移入）：将所有 `status = 'active' AND end_date < now()` 的记录改为 `overdue`，**同时保持 `assets.status` 为 `borrowed`**，插入催还通知、扣减信用分。声明为 `SECURITY DEFINER`。💣【pg_cron 在 Supabase Free Plan 不可用！】改用：(1) Supabase Edge Function（`supabase functions new check-overdue`）+ Dashboard Schedules 每小时执行；(2) 移动端 `HomeScreen` 加载时调用 `supabase.rpc('check_overdue_bookings')` 兜底。
* **Yuxuan**：把已经被预订的日子强行用极其醒目的红色圆圈填充满，并禁止任何人点选操作！**同时完善 `AssetDetailScreen` 的信息展示区域**：除了日历外，展示设备的完整信息（名称、描述、存放位置 `location`、物理状况 `condition`、保修状态 `warranty_status`），让这个页面不再是光秃秃的日历。
* **Cunjun 爆炸级难度【图片不能存库法则】：**
  - **💣排雷：绝不能把手机拍下来的照片转成 Base64 长码直接塞进关系型数据库！会当场宕机。**
  - **任务**：按下快门后用 `expo-image-manipulator` 降低照片画质。传给 Supabase 的大存储桶（`Storage`）。挂起等待系统返回一个网链串(URL)，你只能把这一小串网址，存进借用记录单的 `return_photo_url` 字段里！
* **Letao**：给资产大表格头上加搜索栏和分类下拉筛选器。实现按名称模糊搜索 + 按 `category_id` 精确过滤。
* **Linpeng**：给审批弹窗接网线：点击通过的瞬间调用 `approveBooking(id)` 向后台发 `UPDATE`，订单马上消失并排向下一个状态！拒绝时必须弹出输入框让管理员填写 `rejection_reason`。**同时提前画好 `returns/page.tsx` 的空壳骨架和 `ReturnVerify.tsx` 的基本布局**（左右分栏结构），Day 6 再接入真实照片数据。这样 Day 6 不用从零开始画。

#### ☀️ Day 6 (3/12)：闭环体系之借款与拍照上传应用

* **Bosheng**：完成移动端最终页 `BookingFormScreen.tsx`。带选日期框和同意协议后发向库的逻辑。**同时把 `bookingService.ts`（移动端）里的 `createBooking()`、`getMyBookings()`、`cancelBooking()` 对接真实 Supabase 查询。`returnAsset()` 必须调用 Day 4 Bosheng 创建的 RPC 函数：`supabase.rpc('return_booking', { p_booking_id: id, p_photo_url: url })`——不能直接 UPDATE `assets` 表，学生没有 RLS 权限！** 还需新增 `submitDamageReport(assetId, bookingId, description, severity, photoUrls)` 函数——**注意：学生仍然不能直接 UPDATE `assets` 表，但一旦成功插入 `damage_reports` 且状态为 `open/investigating`，数据库侧会立即把设备切到 `maintenance`，并把该设备未来的 `pending/approved` 预约批量改成 `suspended`。**
* **Yuxuan**：开发 `ProfileScreen.tsx` 个人信息主面板大厅。展示用户的信用分绿数字、学号、学院。**必须从 Supabase `profiles` 表拉取真实数据，不能再用假数据。** **同时给 `ProfileScreen` 加一个"我的通知"入口按钮**（带未读红点角标），点击后通过 Stack Navigator 跳转到 Cunjun 的 `NotificationScreen`。**再在 `HomeScreen` 的 `AssetCard` 上展示 `asset.images[0]` 封面图**（用 `<Image source={{ uri: ... }}>`），确认图片正确加载。
* **Cunjun**：完成极复杂的 `ReturnScreen.tsx` (还物页面)。必须强行调出照相组件拍一张实物照片，并把那串网链拿稳了，发给归还工单以供确认。
* **Letao**：网页版加入超级资产总分析台 `dashboard/page.tsx`。建立两个占满半屏的业务计数仪区块（总资产数、当前借出数、待审批数、逾期数）。**同时在 `AssetForm.tsx` 中加入图片上传功能**：管理员新建资产时可以选择图片文件 → 上传到 Supabase Storage 的 `asset-images` 桶 → 拿到 URL 放进 `images` 数组。
* **Linpeng**：画全屏用于对比归还是否损坏的模块：左侧出库记录图，右侧归还实拍图的超宽检视对比功能 `ReturnVerify.tsx`。**同时创建 `returns/page.tsx` 路由页面**，把 `ReturnVerify` 组件嵌入进去。**💣组件底部必须有两个操作按钮：【确认无损归还】（结束流程，该借用记录标记为完结）和【发现损坏，转入损坏处理与赔偿流程】（自动关联/创建损坏报告，并触发设备进入 `maintenance`、未来预约进入 `suspended` 的统一后端逻辑）。**

#### ☀️ Day 7 (3/13)：客诉罚单与类型滞后危机防御

* **Bosheng**：建立极其敏感的红点强提醒角标推送（提示欠账人）。在 `notifications` 表中插入记录，移动端通过查询该表来显示红点。注意随时大吼更新 `types/supabase.ts`。**💣【关键新增：信用分扣减规则必须明确写成数据库函数】** 在 Supabase 创建函数 `update_credit_score(user_id, delta, reason)`，规则如下：
  - 逾期归还：第 1 天 `-10`、满 7 天再 `-15`、满 30 天再 `-25`（累计上限 `-50`）
  - 损坏报告 `minor`：`-5` / `moderate`：`-15` / `severe`：`-30`
  - `lost`：系统自动判定 `0`；用户主动自报 `-30`；管理员确认恶意调包或严重丢失 `-50`
  - 正常按时归还：`+5`
  - 分数范围锁死 0-200，不能扣成负数也不能超过 200
* **Yuxuan**：将系统所有白骨架屏用极其唯美的灰色 `Skeleton Loading` 圈填充防跳频闪烁。**同时给 `HomeScreen` 的搜索栏接上真实筛选逻辑**：输入文字后过滤 `assets` 列表，实现前端即时搜索。
* **Cunjun**：画客单报修页 `DamageReportScreen.tsx`。让学生上交长作文控诉和碎镜头的照片网链，生成报修单！**调用 Bosheng 在 Day 6 写好的 `submitDamageReport()` 函数提交到数据库。** **同时完善 `NotificationScreen.tsx`**：从 `notifications` 表拉取真实数据，用 `NotificationItem` 组件渲染列表，点击后标记已读。（取消预约按钮移至 Day 9-10 补充，减轻今天3屏同改的压力）
* **Letao**：利用后台真实数据进行折线图、扇形图等炫酷报表的网页大版显示（引入 `recharts` 或 `chart.js`）。
* **Linpeng**：处理客诉大网页版处理界面 `damage/page.tsx`。**在 `lib/bookingService.ts` 中新增 `getDamageReports()`、`updateDamageStatus(id, status)` 函数。** 用 `DamageTable.tsx` 展示所有损坏报告。管理员确认损坏等级后，调用 Bosheng 写的 `update_credit_score()` 数据库函数扣减学生信用分，并同步赔偿单状态、通知与资产后续流转！

#### ☀️ Day 8 (3/14)：系统内全员合线与防雷网络布置

*（不写新功能。全面护盘联调）*

* **全员联调**：互相开始测试对方屏幕的功能流，使用 `try / catch` 把没拿到的空值置换，坚决防止一不小心点飞引发App崩溃大红屏。为所有有 `API` 加载时间的网页组件统一放置一个”转圆圈禁按”Loading 层，防止狂点防抖导致连发两单。
* **Linpeng（关键新增：Web 端 Realtime 实时刷新）**：在 `bookings/page.tsx` 中接入 Supabase Realtime，订阅 `bookings` 表的 INSERT 和 UPDATE 事件。当学生在手机端提交新借用请求时，管理员的网页**无需手动刷新**，新的 `pending` 记录自动出现在审批列表顶部并伴有轻微高亮动画提示。代码示例：`supabase.channel('bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => refetch()).subscribe()`。
* **💣【关键联调测试清单——必须全部跑通才能进入第三阶段】：**
  1. 学生注册 → 登录 → 浏览资产 → 按分类筛选 → 查看详情日历 → 提交借用请求（`pending`）
  2. 管理员 Web 端实时收到新请求 → 审批通过（`approved`）→ 学生收到通知
  3. 学生到现场扫码取货 → 状态变为 `active`
  4. 学生拍照归还 → 状态变为 `returned` → 信用分 +5
  5. 管理员在 Web 端核验归还照片 → 完结
  6. 逾期未还 → 自动标记 `overdue` → 通知 + 扣分

---

### 🔴 第三阶段：企业级高阶功能开发与全端部署 (Day 9 - Day 14)

*目标：摒弃表面功夫，用真实的硬核代码（数据导出、推送通知、性能缓存、真机打包）把 UniGear 从“学生作业”拉升到“商业级 SaaS 产品”的水平。*

#### ☀️ Day 9 - Day 10 (3/15 - 3/16)：自己造的孽自己填 + 📋 QA 质检单上线 + 评价系统

* **全员修大坝填缝隙：** 在自己的分支里狂补异常验证（比如不填设备长度绝不能让保存动作往下传，立刻弹出黄色警告框）。
* **Cunjun（QA + 补全）：** **必须同时维护一个 Excel 表格（Bug Tracking List）**。记录下在哪一页发现了什么 Bug（比如”借用日期可以选过去的时间”）、是谁修复的、修复状态。**同时在 `BookingHistoryScreen` 里给状态为 `pending` 或 `approved` 的记录加上【取消预约】按钮**（从 Day 7 移入），点击后调用 `cancelBooking()` 将状态改为 `cancelled`。**再集成 Yuxuan 的 `ReviewModal` 组件**，给”已归还”状态的记录加【评价】按钮。
* **Yuxuan（新增：评价功能）：** **💣注意领地规则！`BookingHistoryScreen` 是 Cunjun 的文件，Yuxuan 不能直接改！** 正确做法：Yuxuan 在自己的 `components/` 目录下新建 `ReviewModal.tsx`（1-5星评分 + 文字评论的弹窗组件），然后由 **Cunjun 在 `BookingHistoryScreen` 里引入 `ReviewModal`**，给”已归还”状态的记录加一个【评价】按钮触发弹窗。评价提交后调用 Bosheng 写的接口写入 `reviews` 表。
* **Bosheng（新增：评价接口）：** 在移动端 `bookingService.ts` 中新增 `submitReview(bookingId, rating, comment)` 函数。同时在 Web 端 `assetService.ts` 里加一个 `getAssetReviews(assetId)` 以便管理员查看。

#### ☀️ Day 11 (3/17)：高阶功能突击（数据导出与应用内推送）

* **Bosheng / Cunjun（应用内实时通知）**：~~接入 Expo Push Notifications~~（需要 Apple/Google 证书配置，时间不够）。**改为实现应用内通知系统**：利用 Supabase Realtime 订阅 `notifications` 表的 INSERT 事件。当网页端老师点击”同意”后，Bosheng 的后端逻辑向 `notifications` 表插一条记录，Cunjun 的移动端通过 Realtime 监听立刻在 App 内弹出 Toast 提示：”您的相机借用已获批！”，同时 Tab 栏的个人页图标上显示红点角标。
* **Letao / Linpeng（网页端数据导出）**：引入 `xlsx` 或 `papaparse` 库，在”资产大表”和”客诉单”右上角写一个【导出 Excel/CSV】的按钮。点击后，直接在浏览器下载一份完整的报表文件。
* **Yuxuan（移动端交互升级）**：写出原生的”下拉刷新 (Pull-to-refresh)”和”无限滚动 (Infinite Scroll)”。不要一次性把 100 个设备全加载出来，写分页逻辑，滑到底部再加载下 10 个。

#### ☀️ Day 12 (3/18)：性能优化与极端边界容灾处理

* **Bosheng（并发压测与锁表）**：写一段 SQL 事务处理代码（Transaction），确保如果有两个学生在同一毫秒点击预约同一个相机，只有一个人能成功，彻底杜绝“幽灵超卖”。
* **Yuxuan（图片性能大换血）**：把手机端所有的原始 `<Image>` 标签替换成专业的 `expo-image` 库，开启内存缓存机制，确保高清照片第二次打开瞬间加载，消除白屏。
* **Cunjun（权限拒绝容灾）**：写极其严密的防崩溃代码：如果学生在扫码时死活点拒绝授权相机权限，程序不能崩溃。必须优雅地切到一个 UI 页面显示：“未获取相机权限，请手动输入设备编号”，并提供输入框备用。
* **Letao / Linpeng（Web 端审计日志）**：**💣【前置条件】Bosheng 必须先在数据库中新建 `audit_logs` 表（字段：`id`, `admin_id`, `action`, `target_table`, `target_id`, `details`, `created_at`），并更新 `types/supabase.ts`！** 然后在后台新建一个隐蔽的 `Audit Logs`（操作日志）页面 `dashboard/audit/page.tsx`。在每次管理员执行审批/修改资产操作时，自动向 `audit_logs` 表插入一条记录，实现不可篡改的操作留痕。

#### ☀️ Day 13 (3/19)：主分支末日大汇合与云端网络部署

* **全员（代码冲突血战）**：所有人停止开发新功能。Bosheng 独裁操作，下达分支汇合指令。敲下 `git merge` 处理掉大量的 `<<<<<< HEAD` 红线死冲突。大家坐在一起人工判读每一条到底留下哪个函数，保证合体后能无瑕疵运转。
* **Letao 专属任务（Web 公网部署）**： 主分支安全合并后，将 GitHub 上的 `app-web` 代码一键部署到 **Vercel** 云平台上。配置好环境变量，拿到真实的公网网址（如 `unigear-admin.vercel.app`）。
* **Bosheng（安全上锁）**：关闭 Supabase 的所有匿名读写权限，将 RLS（行级安全策略）调至最严格的生产模式。

#### ☀️ Day 13.5 (3/19 下午)：提前启动 APK 打包（避免 Day 14 来不及）

* **Cunjun / Bosheng（脱离基座，真实打 APK 包）**：别再用 Expo Go 预览了！**Day 13 下午代码合并完毕后立刻开始**：阅读 `Expo EAS Build` 文档，在终端敲下打包命令 `eas build --platform android --profile preview`，将代码放到云端编译（云端编译一般需要 20-40 分钟排队）。**提前注册好 Expo 账号并安装 `eas-cli`：`npm install -g eas-cli && eas login`。**

#### ☀️ Day 14 (3/20)：断网自救与终极联调（展会极客版护航）

* **Cunjun / Bosheng（APK 验收）**：拿到昨晚云端编译好的 `UniGear.apk`，装到手机上，变成真正拥有独立图标的 App。如果打包失败，排查 `app.json` 配置和环境变量问题。
* **Yuxuan（断网拦截UI）**：引入网络状态监听库 `expo-network`。写一个全局拦截器，如果展会现场完全没网，App 不能白屏崩溃，必须立刻弹出一个全屏精美插画页：”当前网络信号弱，请检查连接...”。
* **Letao / Linpeng（双端公网终极联调）**：拿着 Cunjun 刚打包出来的真机 App，通过 4G/5G 网络操作，查看是否能完美将数据推送到你们 Vercel 上的真实公网后台。
* **一键锁死主分支代码！恭喜，你们用 14 天纯代码生磕出了一个能降维打击同龄人的真正商业级软件系统！！** 🎉🎉

---

## 三、修订补全清单（对照原计划的所有差距）

> 以下是两轮修订中发现并补入计划的全部遗漏，供全队核对。

### A. 第一轮修订：原计划遗漏的文件/任务

| 遗漏项 | 负责人 | 补入天数 | 说明 |
|---|---|---|---|
| `authService.ts`（移动端） | Bosheng | Day 2 | 登录注册的核心接口层，原计划完全没提 |
| `bookingService.ts`（移动端）完整实现 | Bosheng | Day 3 骨架 / Day 6 真实对接 | 文件树列了但从未安排 |
| `CategoryScreen.tsx` | Yuxuan | Day 3 | 分类浏览页，文件树标了 Yuxuan 但从未排期 |
| `lib/assetService.ts`（Web端） | Letao | Day 3 骨架 / Day 4 真实对接 | 文件树列了但从未安排 |
| `lib/bookingService.ts`（Web端）真实实现 | Linpeng | Day 3-4 | 原来3个函数全是空壳 |
| `BookingTable.tsx` 真实实现 | Linpeng | Day 2 | 原来只有占位符文字 |
| `ApprovalModal.tsx` 真实实现 | Linpeng | Day 3 | 原来只有占位符文字 |
| Sidebar 菜单修正 | Letao | Day 2 | 原来是 Next.js 模板默认菜单 |
| `NotificationScreen.tsx` 真实数据 | Cunjun | Day 7 | 原来只显示"暂无通知" |
| `reviews` 评价功能 | Yuxuan + Bosheng | Day 9-10 | 数据库设计了但从未排期 |
| `audit_logs` 建表 | Bosheng | Day 12（前置） | 原 Day 12 要求做审计日志页但没建表 |
| `returns/page.tsx` 路由页 | Linpeng | Day 6 | 原来只安排了组件没安排路由页 |
| `damage/page.tsx` 路由页 | Linpeng | Day 7 | 同上 |

### B. 第二轮修订：核心业务闭环断点（致命级）

| 遗漏项 | 负责人 | 补入天数 | 严重性 | 说明 |
|---|---|---|---|---|
| **扫码取货激活 (`approved → active`)** | Cunjun | Day 4 | **致命** | 借用生命周期的关键一环，没人触发"取货"状态转换，整个借还流程断裂 |
| **逾期自动检测 (`active → overdue`)** | Bosheng | Day 5 | **致命** | 没有定时任务检查过期订单，逾期标签永远不会出现 |
| **QR 码生成（Web 管理端）** | Letao | Day 4 | **致命** | 只有扫码功能没有生码功能，学生无码可扫 |
| **`assets` 表加 `image_url` 字段** | Bosheng | Day 4 | **中等** | 资产没有图片字段，移动端卡片无图可显示 |
| **Web 管理端角色验证** | Letao | Day 4 | **中等** | 普通学生登录后能进入管理后台，安全漏洞 |
| **信用分扣减规则明确化** | Bosheng | Day 7 | **中等** | 多处提到扣分但从未定义具体规则和触发时机 |
| **Web 端 Realtime 实时刷新** | Linpeng | Day 8 | **中等** | 项目计划书承诺的"实时推送"功能，原计划只给移动端排了 |
| **`CalendarView.tsx` 独立封装** | Yuxuan | Day 4 | **轻微** | 文件树列出但从未安排，直接写在 AssetDetailScreen 里会导致代码臃肿 |

### C. 降级/调整的任务

| 原计划 | 调整后 | 原因 |
|---|---|---|
| Day 11 接入 Expo Push Notifications | 改为 Supabase Realtime 应用内通知 | 原生推送需要 Apple/Google 证书，14天内来不及 |
| Day 14 当天打 APK | 提前到 Day 13 下午启动云端编译 | EAS Build 排队+编译需要 30-60 分钟，不能赌最后一天 |

### D. 第三轮修订：Service 层断线与 UI 入口遗漏

| 遗漏项 | 负责人 | 补入天数 | 说明 |
|---|---|---|---|
| `submitDamageReport()` 移动端函数 | Bosheng | Day 6 | DamageReportScreen 的提交按钮无处可调 |
| `getDamageReports()` / `updateDamageStatus()` Web端函数 | Linpeng | Day 7 | damage/page.tsx 没有数据来源 |
| 学生【取消预约】按钮 + `cancelBooking()` | Cunjun（UI）+ Bosheng（函数） | Day 6-7 | 生命周期有 cancelled 但没有入口 |
| Supabase Storage Bucket 创建 | Bosheng | Day 6（前置） | 没建桶，照片上传 403 |
| Web 端 `lib/auth.ts` 认证文件 | Letao | Day 3 | 登录逻辑没有归属文件 |
| `dashboard/assets/page.tsx` 独立路由页 | Letao | Day 3 | 资产表格和仪表盘混在一个页面 |
| `CategoryScreen` 点击导航目标 | Yuxuan | Day 3 | 点击分类后去哪里没定义 |

### E. 第四轮修订：数据同步、时序依赖与平台限制

| 遗漏项 | 负责人 | 补入天数 | 严重性 | 说明 |
|---|---|---|---|---|
| **`assets.status` 状态同步** | Bosheng | Day 4/6 | **致命** | 取货→`borrowed`；归还→`available/maintenance`（取决于是否仍有未结损坏报告）；`open/investigating` 损坏报告会立刻触发 `maintenance` 并暂停未来预约 |
| **Storage Bucket 时间线倒挂** | Bosheng | Day 4 (从 Day 6 提前) | **致命** | Day 5 Cunjun 传照片时桶还没建 |
| **`activateBooking()` 函数缺失** | Bosheng | Day 4 (优先) | **致命** | Day 4 Cunjun 扫码取货依赖此函数 |
| **评价功能领地冲突** | Yuxuan→ReviewModal + Cunjun集成 | Day 9-10 | **中等** | 原写法违反铁律第1条 |
| **CategoryScreen 不可达** | Yuxuan | Day 4 | **中等** | HomeScreen 加分类图标横条入口 |
| **AssetDetail → BookingForm 入口** | Yuxuan | Day 4 | **中等** | 详情页缺"立即预约"按钮 |
| **ReturnVerify 管理员操作未定义** | Linpeng | Day 6 | **中等** | 看完照片后点什么、改什么状态没说 |
| **pg_cron 免费版不可用** | Bosheng | Day 5 | **风险** | 改用 Edge Function + 前端兜底双保险 |

### F. 第五轮修订：RLS 权限冲突与导航架构（Schema 级审计）

| 遗漏项 | 负责人 | 补入天数 | 严重性 | 说明 |
|---|---|---|---|---|
| **RLS 阻止学生更新 `assets.status`** | Bosheng | Day 4 | **致命** | 学生端 `activateBooking` 和 `returnAsset` 直接 UPDATE assets 表会被 RLS 拦截。改用 `SECURITY DEFINER` RPC 函数 |
| **RLS 阻止逾期检测插入通知** | Bosheng | Day 4 | **致命** | `check_overdue_bookings()` 以学生身份调用时无法 INSERT notifications。必须声明 `SECURITY DEFINER` |
| **`image_url` 字段重复** | Bosheng | Day 4 (撤销) | **致命** | Schema 已有 `images TEXT[]` 数组，计划书要加的 `image_url` 是冗余的。改用现有字段 |
| **缺 `getBookingsForAsset()` 函数** | Bosheng | Day 4 | **中等** | 日历组件需要查某资产所有用户的预订，但只有 `getMyBookings()` |
| **缺嵌套 Stack Navigator** | Bosheng | Day 3 | **中等** | Tab 内无法跳转详情页，React Navigation 硬性要求 |
| **Supabase Realtime 未启用** | Bosheng | Day 4 | **轻微** | 需在 Dashboard 中手动开启 bookings/notifications 表的 Realtime |

### G. 新增功能

| 功能 | 天数 | 说明 |
|---|---|---|
| 移动端首页搜索栏 | Day 2 UI / Day 7 逻辑 | 100 个设备没法翻找 |
| HomeScreen 分类图标横条 | Day 4 | 从首页进入 CategoryScreen 的入口 |
| AssetDetailScreen "立即预约"按钮 | Day 4 | 进入 BookingFormScreen 的入口 |
| 嵌套 Stack Navigator | Day 3 | 每个 Tab 内支持多层页面跳转 |
| 3 个 SECURITY DEFINER RPC 函数 | Day 4 | 绕过 RLS 处理跨表状态同步 |
| Day 8 联调测试清单 | Day 8 | 6 条核心流程必须全部跑通才能进入第三阶段 |
| 数据库迁移文件 `002_rpc_functions_and_audit_logs.sql` | Day 4 / Day 12 | RPC 函数 + audit_logs 表 |

---

## 四、测试与完善阶段 — 7天实战测试计划（Testing & Refinement Phase）

> **阶段周期**：7天 (2026年3月23日 - 3月29日)
> **核心理念**：**边用边测边发现问题边修复** — 每个人像真实用户一样使用系统，遇到的任何不合理、卡顿、报错、UI丑陋都是 Bug
> **工时要求**：每人每天 **5 小时**（测试 + 修复，不写新功能）
> **每人总工时**：**35 小时**
> **全队总工时**：**175 小时**
> **展会日期**：4月9日 Business Playground（3/30-4/8 做最终部署和演练）


## 四、初步测试与修复阶段 — 第一轮 7 天（Basic Testing & Fixing）

> **阶段周期**：7天 (2026年3月23日 - 3月29日)
> **阶段目标**：让系统的基本逻辑跑通，修掉明显的 Bug 和不合理的地方
> **后续计划**：本轮结束后还有第二轮深度测试（另外 7 天），本轮只管基础问题
> **展会日期**：4月9日 Business Playground

### 每天的工作节奏

每人每天 5 小时，分两块：

```
【前半段】必测任务（约 2-3 小时）
   → 按下面的测试清单逐条执行，每条标 ✅ 通过 或 ❌ 不通过
   → 不通过的立刻修，修完重测直到通过

【后半段】自由探索（约 2-3 小时）
   → 像真实用户一样用自己的模块
   → 用着用着发现"这里不对" → 停下来修 → 修完继续用
   → 遇到别人模块的问题 → 记到 Bug List 告诉他
```

### 记录规则

1. **必测任务**的结果记在每天的测试检查表上（✅ / ❌ + 备注）
2. **自由探索**中发现的问题记到 Bug List（`docs/bug_tracking_list.md`），格式：`ID | 位置 | 描述 | 发现人 | 修复人 | 状态`
3. **谁的代码谁修。** 发现别人模块的问题，记下来告诉他，他来修。
4. **Cunjun 每天下班前汇总 Bug List，在群里发当天新增/修复数量。**
5. **每天下班前 `git add . → git commit → git push`。**

### 每人负责的模块

| 成员 | 负责的模块 | 包含的页面 |
|------|-----------|-----------|
| **Bosheng** | 认证 + 数据库 + 所有 Service 接口 | LoginScreen, RegisterScreen, BookingFormScreen, 所有 `*Service.ts`, RPC 函数, RLS 策略 |
| **Yuxuan** | 首页 + 资产详情 + 个人中心 | HomeScreen, CategoryScreen, AssetDetailScreen, CalendarView, ProfileScreen, AssetCard |
| **Cunjun** | 借还流程 + 扫码拍照 + QA 汇总 | BookingHistoryScreen, ReturnScreen, ScanScreen, DamageReportScreen, NotificationScreen, PhotoCapture |
| **Letao** | Web 登录 + 仪表盘 + 资产管理 | login/page, dashboard/page, dashboard/assets, dashboard/users, Sidebar, AssetForm, 图表 |
| **Linpeng** | Web 审批 + 归还核验 + 损坏管理 | dashboard/bookings, dashboard/returns, dashboard/damage, dashboard/audit-logs, ApprovalModal, ReturnVerify |

---

### 📅 7 天详细任务

---

#### Day 1 (3/23 周日)：环境跑通 + 基础功能检查

**全员第一件事 — 环境同步：**
```bash
git pull && cd app-mobile && npm install && cd ../app-web && npm install
```
跑不起来找 Bosheng 帮忙，环境不通后面全白干。

---

##### Bosheng — 认证 + Service 层

**【必测任务】（2.5h）** 逐条执行，每条标 ✅ 或 ❌：

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| B1-01 | 什么都不填，直接点登录 | 弹出提示"请填写邮箱和密码"，不发请求 | ☐ |
| B1-02 | 输入正确账号密码登录 | 跳转到主页，底部 Tab 正常显示 | ☐ |
| B1-03 | 输入错误密码 | 显示中文提示"密码错误"，不是 Supabase 英文原文 | ☐ |
| B1-04 | 输入不存在的邮箱 | 显示"账号不存在"或"邮箱或密码错误" | ☐ |
| B1-05 | 登录成功后杀掉 App 重新打开 | 仍然在登录状态，不用重新登 | ☐ |
| B1-06 | 注册一个新账号（正常流程） | 注册成功，能立刻登录 | ☐ |
| B1-07 | 用已存在的邮箱注册 | 提示"邮箱已被注册" | ☐ |
| B1-08 | 密码输入 123（太短） | 提示密码长度要求 | ☐ |
| B1-09 | 在 Supabase SQL Editor 调用 `SELECT activate_booking('某id')` | booking 状态变 active，asset 状态变 borrowed | ☐ |
| B1-10 | 调用 `SELECT return_booking('某id', 'url')` | booking 状态变 returned；若该借用无未结损坏报告则 asset=available，否则 asset=maintenance；信用分 +5 | ☐ |
| B1-11 | 调用 `SELECT check_overdue_bookings()` | 过期的 active booking 变 overdue，通知已插入，信用分已扣 | ☐ |
| B1-12 | 调用 `SELECT update_credit_score('某id', -10, 'test')` | 信用分 -10；如果原来是 5，结果应该是 0 不是 -5 | ☐ |

> ❌ 的项目立刻修，修完重测直到 ✅

**【自由探索】（2.5h）** 自己用登录/注册/BookingForm，感受哪里不顺畅就修：
- 错误提示是 Supabase 英文原文？→ 改成中文
- 登录按钮点了没反应？→ 加 Loading 状态
- 注册成功后没有任何反馈？→ 加成功提示或自动跳转
- Service 函数有没有 try/catch？空数据会不会 crash？
- 自己觉得"这个体验不太对"的地方 → 直接改

---

##### Yuxuan — 首页 + 详情 + 个人中心

**【必测任务】（2.5h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| Y1-01 | 打开 HomeScreen | 有 Loading 动画，然后显示设备列表（不是白屏等半天） | ☐ |
| Y1-02 | 查看 AssetCard 封面图 | 每张卡片有图片显示（`asset.images[0]`），不是灰框 | ☐ |
| Y1-03 | 搜索栏输入"相机" | 列表只显示相机类设备 | ☐ |
| Y1-04 | 搜索栏输入"xyzabc123"（不存在的） | 显示"暂无匹配设备"，不是空白一片 | ☐ |
| Y1-05 | 点击分类图标横条中的某一个 | 跳转到 CategoryScreen 并显示该分类下的设备 | ☐ |
| Y1-06 | 从首页点一个设备进 AssetDetailScreen | 显示完整信息：名称、描述、位置、状况、保修状态 | ☐ |
| Y1-07 | 日历上已被预订的日期 | 红色标记且不可点选 | ☐ |
| Y1-08 | 点底部【立即预约】按钮 | 正确跳转到 BookingFormScreen，传了 assetId | ☐ |
| Y1-09 | 打开 ProfileScreen | 显示的信用分、学号、姓名和 Supabase profiles 表一致 | ☐ |
| Y1-10 | 检查所有页面有没有硬编码颜色 `#xxx` | 全部使用 `theme.colors.*`，没有硬编码 | ☐ |

**【自由探索】（2.5h）** 自己当学生用首页 + 详情 + 个人中心：
- 图片加载慢不慢？第一次打开要等多久？
- 列表滑动顺不顺畅？卡不卡？
- 日历切月份的体验自然吗？
- 页面之间跳转流畅吗？返回的时候状态丢了没有？
- 间距、字体、按钮样式统一吗？
- 自己觉得"不够好看"或"用着别扭"的地方 → 直接改

---

##### Cunjun — 借还流程 + 扫码拍照

**【必测任务】（2.5h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| C1-01 | 打开 BookingHistoryScreen | 显示当前用户的借用记录列表，不同状态颜色不同 | ☐ |
| C1-02 | pending 状态的记录 | 显示【取消预约】按钮 | ☐ |
| C1-03 | 点【取消预约】 | 弹确认框"确定要取消吗？"，确认后状态变 cancelled | ☐ |
| C1-04 | returned 状态的记录 | 显示【评价】按钮 | ☐ |
| C1-05 | 列表为空时 | 显示"暂无借用记录"，不是空白 | ☐ |
| C1-06 | 打开 ScanScreen | 弹出相机权限请求，授权后看到摄像头画面 | ☐ |
| C1-07 | 扫一个有效 QR 码 | 震动 + 识别出资产信息 | ☐ |
| C1-08 | 打开 ReturnScreen，拍照后上传 | 有 Loading 提示，上传成功后显示照片预览 | ☐ |
| C1-09 | 在 DamageReportScreen 不填描述直接提交 | 被拦截，提示"请填写损坏描述" | ☐ |
| C1-10 | 打开 NotificationScreen | 按时间倒序显示通知，点击后标记已读 | ☐ |

**【自由探索】（1.5h）** 自己走完整借还流程，修不顺的地方。

**【QA 汇总】（1h）** 收集所有人今天在群里报的问题，全部录入 Bug List，发 Day 1 日报。

---

##### Letao — Web 登录 + 仪表盘 + 资产管理

**【必测任务】（2.5h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| L1-01 | admin 账号登录 | 跳转到 Dashboard | ☐ |
| L1-02 | student 账号登录 | 被拦截，显示"无管理权限" | ☐ |
| L1-03 | 不登录直接访问 `/dashboard/assets` | 自动跳转到登录页 | ☐ |
| L1-04 | 登录后刷新页面 | 保持登录状态 | ☐ |
| L1-05 | Dashboard 的 4 个 KPI 数字 | 和 Supabase `SELECT count(*)` 查出来的一致 | ☐ |
| L1-06 | 图表（折线图/饼图） | 显示真实数据，不是空白或写死的 | ☐ |
| L1-07 | 新增资产：不填名称直接提交 | 红色提示"请填写名称" | ☐ |
| L1-08 | 新增资产：上传图片 | 上传成功，URL 写入 images 数组 | ☐ |
| L1-09 | 搜索栏输入关键词 | 按名称模糊匹配，结果正确 | ☐ |
| L1-10 | Sidebar 每个菜单项 | 链接指向正确页面，当前页高亮 | ☐ |

**【自由探索】（2.5h）** 自己当管理员用后台，修不合理的地方：
- 表格加载慢吗？数据多的时候有分页吗？
- 编辑资产保存后表格立刻刷新了吗？
- 表单校验还有没有遗漏的字段？
- 整体布局在你的电脑屏幕上好看吗？

---

##### Linpeng — Web 审批 + 归还核验 + 损坏管理

**【必测任务】（2.5h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| P1-01 | 打开 bookings 页面 | 看到 pending 状态的借用请求列表 | ☐ |
| P1-02 | 点一条记录 | ApprovalModal 弹出，显示学生+资产+日期信息 | ☐ |
| P1-03 | 点"通过" | 状态变 approved | ☐ |
| P1-04 | 点"拒绝"，不填理由直接确认 | 被拦截"请填写拒绝理由" | ☐ |
| P1-05 | 状态筛选下拉选 "pending" | 列表只显示 pending 记录 | ☐ |
| P1-06 | 打开 returns 页面 | 看到待核验的归还记录 | ☐ |
| P1-07 | ReturnVerify 照片对比 | 左右分栏显示，照片正常加载 | ☐ |
| P1-08 | 点【确认无损归还】 | booking 完结，信用分 +5（去 Supabase 核实） | ☐ |
| P1-09 | 点【发现损坏，转入客诉】 | 跳转到 damage 页面 | ☐ |
| P1-10 | damage 页面确认 moderate 等级 | 信用分 -15（如果原来 15 分，应变为 0 不是负数） | ☐ |
| P1-11 | 检查 audit-logs 页面 | 刚才的审批/归还/损坏操作都有日志记录 | ☐ |

**【自由探索】（2.5h）** 自己当管理员走完整审批流程，修不合理的地方。

---

#### Day 2 (3/24 周一)：深入测试 + 继续修

> 昨天每人跑了一遍基础功能，今天的必测任务更深入——测异常输入、边界情况、流程衔接。自由探索时间继续修昨天没修完的 + 发现新问题。

---

##### Bosheng

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| B2-01 | BookingFormScreen：选过去的日期提交 | 被拦截"不能选择过去的日期" | ☐ |
| B2-02 | BookingFormScreen：结束日期早于开始日期 | 被拦截"结束日期不能早于开始日期" | ☐ |
| B2-03 | BookingFormScreen：选一个已被别人预订的时间段 | 被拦截"该时间段已被预订" | ☐ |
| B2-04 | 两个账号同时预约同一设备同一时段 | 只有一个成功，另一个提示"时间冲突" | ☐ |
| B2-05 | BookingFormScreen：正常提交一个借用 | 成功，BookingHistory 里出现 pending 记录 | ☐ |
| B2-06 | 提交后连续快速点击提交按钮 3 次 | 只产生 1 条记录，不会重复提交 | ☐ |
| B2-07 | 数据库至少有 20 个资产、5 个用户、覆盖所有状态的 booking | 别人测试时有数据可用 | ☐ |

**【自由探索】（3h）** 继续修昨天的 ❌ 项 + 打磨 Service 层：
- 所有 catch 里的英文错误换成中文
- 所有 Service 函数传空值会不会 crash
- BookingForm 的提交体验是否顺畅

---

##### Yuxuan

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| Y2-01 | 快速上下滑动 HomeScreen 列表 30 秒 | 不卡顿、不闪烁、不崩溃 | ☐ |
| Y2-02 | 从首页进详情→返回→再进另一个→反复 10 次 | App 不变卡（无内存泄漏） | ☐ |
| Y2-03 | 日历连续快速切换月份 20 次 | 不崩溃，数据正确 | ☐ |
| Y2-04 | 一个没有图片的资产的 AssetDetailScreen | 不白屏，显示默认占位图 | ☐ |
| Y2-05 | 一个所有字段都为空的资产的详情页 | 不崩溃，空字段显示 "—" 或友好文案 | ☐ |
| Y2-06 | HomeScreen 下拉刷新 | 有刷新动画，松手后重新加载数据 | ☐ |
| Y2-07 | 在 Supabase 后台改某用户信用分为 180 | App 的 ProfileScreen 刷新后显示 180 | ☐ |

**【自由探索】（3h）** 继续修昨天的 ❌ + 打磨视觉：
- 补所有缺 Loading 的页面
- 补所有空列表的友好提示
- 颜色/间距统一化

---

##### Cunjun

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| C2-01 | 拒绝相机权限后打开 ScanScreen | 不崩溃，显示"未获取相机权限"提示 + 手动输入设备编号的备用方案 | ☐ |
| C2-02 | 扫一个非 UniGear 的普通 QR 码 | 友好提示"无法识别该设备"，不是崩溃 | ☐ |
| C2-03 | 扫码后有 approved 记录 | 弹出"确认取货？"，确认后状态变 active | ☐ |
| C2-04 | 扫码后没有该资产的 booking | 跳到资产详情页查看 | ☐ |
| C2-05 | ReturnScreen：不拍照直接提交 | 被拦截"请拍摄设备照片" | ☐ |
| C2-06 | ReturnScreen：拍照上传到一半断网 | 有"上传失败"提示，不卡死 | ☐ |
| C2-07 | DamageReport：提交成功后 | 有成功反馈（弹窗或跳转），不是没反应 | ☐ |

**【自由探索】（2h）** 继续修 + 完整走一遍扫码→取货→归还→评价的流程。

**【QA 汇总】（1h）** 更新 Bug List，发 Day 2 日报。

---

##### Letao

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| L2-01 | 新增资产：名字输 200 字符 | 能保存或有长度限制提示 | ☐ |
| L2-02 | 新增资产：数量输入 -1 | 被拦截"数量必须为正整数" | ☐ |
| L2-03 | 新增资产：数量输入 abc | 被拦截 | ☐ |
| L2-04 | 新增资产：不选分类直接提交 | 被拦截"请选择分类" | ☐ |
| L2-05 | 上传 10MB 大图片 | 有大小限制提示或能正常上传 | ☐ |
| L2-06 | 编辑资产保存后 | 表格立刻刷新显示新数据 | ☐ |
| L2-07 | 删除一个有关联 booking 的资产 | 被拦截"该资产有未完成的借用"，不是静默删除 | ☐ |
| L2-08 | Excel 导出 → 打开检查 | 列名正确、中文不乱码、数据条数和页面一致 | ☐ |

**【自由探索】（3h）** 继续修 + 深度使用资产管理和仪表盘，找不合理的地方。

---

##### Linpeng

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| P2-01 | 让移动端提一个新借用，bookings 页面不刷新 | 新请求自动出现（Realtime） | ☐ |
| P2-02 | 审批一条已被取消（cancelled）的 booking | 被拦截，不能审批 | ☐ |
| P2-03 | 拒绝时填入 5000 字超长理由 | 能保存或有长度限制提示 | ☐ |
| P2-04 | 审批通过后 | 移动端用户收到通知 | ☐ |
| P2-05 | ReturnVerify 照片加载失败时 | 有 fallback 显示（如"照片加载失败"），不是空白 | ☐ |
| P2-06 | 信用分为 0 的学生再确认 moderate 损坏（-15） | 信用分保持 0，不变成负数 | ☐ |
| P2-07 | 做一个审批操作后查 audit-logs | 有对应的日志记录，且不可编辑删除 | ☐ |

**【自由探索】（3h）** 继续修 + 走完整的审批→归还→损坏流程，修不合理的逻辑。

---

#### Day 3 (3/25 周二)：交叉测试 — 用新手眼光测别人的模块

> 自己测自己永远测不出问题。今天每个人去用别人的模块。
> **必测任务是给别人的模块做"验收检查"。** 自由探索时间回来继续修自己的。

| 成员 | 去测谁的模块 |
|------|------------|
| **Bosheng** → 测 **Letao** 的 Web 登录 + 资产管理 |
| **Yuxuan** → 测 **Cunjun** 的借还 + 扫码 |
| **Cunjun** → 测 **Yuxuan** 的首页 + 详情 |
| **Letao** → 测 **Linpeng** 的审批 + 归还核验 |
| **Linpeng** → 测 **Letao** 的仪表盘 + 资产管理 |

---

##### Bosheng → 测 Letao 的 Web 端

**【必测任务】（2h）** 以"想搞破坏的黑客"角度测：

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| X-BL-01 | 用 student 账号登录 Web 管理端 | 被拦截 | ☐ |
| X-BL-02 | 浏览器地址栏直接输 `/dashboard/assets` | 跳登录页 | ☐ |
| X-BL-03 | 登录邮箱框输入 `'; DROP TABLE users;--` | 不报错不崩溃 | ☐ |
| X-BL-04 | AssetForm 名称输入 `<script>alert('xss')</script>` | 被转义，不执行脚本 | ☐ |
| X-BL-05 | Excel 导出后打开 | 列名对、中文不乱码、条数一致 | ☐ |
| X-BL-06 | KPI 数字和你手动跑 SQL 对比 | 一致 | ☐ |

> 发现的问题记 Bug List，Letao 来修。

**【自由探索】（3h）** 回来继续修自己模块（Service 层 / 数据库）的遗留问题。

---

##### Yuxuan → 测 Cunjun 的借还流程

**【必测任务】（2h）** 以"完全不懂系统的新用户"角度测：

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| X-YC-01 | 打开 ScanScreen，你知道该干嘛吗？ | 有引导文案或操作提示 | ☐ |
| X-YC-02 | 扫一个有效 QR 码 | 响应速度 < 2 秒，提示清晰 | ☐ |
| X-YC-03 | 走完 ReturnScreen 归还流程 | 全程有 Loading、有反馈、知道下一步干什么 | ☐ |
| X-YC-04 | BookingHistoryScreen 各种状态的记录 | 颜色区分明显，按钮位置合理 | ☐ |
| X-YC-05 | DamageReport 不填描述直接提交 | 被拦截 | ☐ |
| X-YC-06 | NotificationScreen 点击通知 | 标记已读，视觉上有变化 | ☐ |

**【自由探索】（3h）** 修自己模块遗留问题。

---

##### Cunjun → 测 Yuxuan 的首页详情

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| X-CY-01 | 首页搜索输入 emoji 😀📷 | 不崩溃，显示"暂无匹配"或正常过滤 | ☐ |
| X-CY-02 | 首页搜索输入 200 字超长文本 | 不崩溃，输入框有截断或限制 | ☐ |
| X-CY-03 | 快速滑动列表 30 秒 | 不卡不闪不崩 | ☐ |
| X-CY-04 | 进入 AssetDetailScreen 后信息完整吗？ | 名称/描述/位置/状况/日历都有 | ☐ |
| X-CY-05 | 日历上已预订的日期，使劲点 | 不可选中，不会穿透 | ☐ |
| X-CY-06 | ProfileScreen 信用分 | 和 Supabase 数据一致 | ☐ |

**【自由探索】（2h）** 修自己模块遗留问题。
**【QA 汇总】（1h）** 今天交叉测试 Bug 可能暴增，全部录入 + 发日报。

---

##### Letao → 测 Linpeng 的审批归还

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| X-LP-01 | bookings 页面审批通过一条 | 状态立刻变 approved | ☐ |
| X-LP-02 | 拒绝一条并填理由 | 理由保存成功，booking 状态变 rejected | ☐ |
| X-LP-03 | 状态筛选每种都试 | 过滤结果正确 | ☐ |
| X-LP-04 | ReturnVerify 照片对比 | 左右分栏清晰，操作按钮可用 | ☐ |
| X-LP-05 | damage 确认损坏后 | 信用分正确扣减 | ☐ |
| X-LP-06 | audit-logs 有对应记录 | 完整且不可编辑 | ☐ |

**【自由探索】（3h）** 修自己模块遗留问题。

---

##### Linpeng → 测 Letao 的仪表盘资产

**【必测任务】（2h）**

| 编号 | 测试用例 | 预期结果 | 通过？ |
|------|---------|---------|--------|
| X-PL-01 | Dashboard KPI 数字 | 和 Supabase SQL 手动查询一致 | ☐ |
| X-PL-02 | 图表数据 | 反映真实趋势，不是空或写死的 | ☐ |
| X-PL-03 | 浏览器缩放到 50% 和 150% | 布局不崩 | ☐ |
| X-PL-04 | 资产 CRUD 全流程 | 增删改查全部正常 | ☐ |
| X-PL-05 | 搜索 + 分类筛选同时使用 | 结果正确 | ☐ |
| X-PL-06 | 在 1366px 笔记本屏幕上看表格 | 不挤压，可读 | ☐ |

**【自由探索】（3h）** 修自己模块遗留问题。

---

#### Day 4 (3/26 周三)：E2E 全链路联调 — 所有人同时在线

> 前 3 天各自修了很多，今天串起来跑 6 条完整业务链路。**上午逐条跑 E2E，下午修跑不通的地方。**

##### 【必测任务】上午全员联调（2.5h）

**E2E-1：学生提交借用** `Yuxuan 操作手机`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | 用 student 账号登录 | 成功进入主页 | ☐ |
| 2 | 搜索一个资产 | 搜索结果正确 | ☐ |
| 3 | 点进详情看日历 | 已预订日期标红 | ☐ |
| 4 | 点立即预约 → 选日期 → 提交 | 提交成功 | ☐ |
| 5 | BookingHistory 里 | 出现 pending 记录 | ☐ |

**E2E-2：管理员审批** `Linpeng 操作 Web + Yuxuan 看通知`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | Linpeng 的 bookings 页面 | E2E-1 的请求自动出现（不刷新） | ☐ |
| 2 | 点通过 | 状态变 approved | ☐ |
| 3 | Yuxuan 查手机 | 收到通知 | ☐ |

**E2E-3：扫码取货** `Cunjun 操作手机`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | 扫描 E2E-1 中资产的 QR 码 | 识别成功 | ☐ |
| 2 | 弹出"确认取货？" → 确认 | 操作成功 | ☐ |
| 3 | Bosheng 查数据库 | booking=active, asset=borrowed | ☐ |

**E2E-4：拍照归还** `Cunjun 手机 + Linpeng Web`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | Cunjun：BookingHistory → active 记录 → ReturnScreen → 拍照 → 提交 | 上传成功 | ☐ |
| 2 | Linpeng：returns 页面看到记录 → 照片对比 → 确认无损归还 | 操作成功 | ☐ |
| 3 | Bosheng 查数据库 | booking=returned, asset=available, 信用分+5 | ☐ |

**E2E-5：逾期检测** `Bosheng 操作数据库`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | SQL 插入一条 end_date 为昨天的 active booking | 插入成功 | ☐ |
| 2 | 调用 `check_overdue_bookings()` | booking=overdue, 通知已插入, 信用分已扣 | ☐ |

**E2E-6：损坏报告** `Cunjun 手机 + Linpeng Web`

| 步骤 | 操作 | 验证 | 通过？ |
|------|------|------|--------|
| 1 | Cunjun：DamageReport → 填描述 → 选 moderate → 拍照 → 提交 | 提交成功 | ☐ |
| 2 | Linpeng：damage 页面看到 → 确认 moderate | 操作成功 | ☐ |
| 3 | Bosheng 查数据库 | 信用分-15, asset=maintenance, 未来 `pending/approved` 预约已转 `suspended`, audit_log 有记录 | ☐ |

##### 【自由探索 + 修复】下午（2.5h）

E2E 跑不通的地方，对应负责人立刻修。修完重跑那条链路直到通过。
修完 E2E 的问题后，剩余时间继续用自己模块，修发现的新问题。

---

##### 【Day 4 新增】Web 端改动任务（利用下午修复时间并行推进）

> 详细改动说明见 §六

**Bosheng（优先级最高，今天必须完成）：**
- `bookingService.ts` → `approveBooking()` 函数：审批通过后同步将 `assets.status` 更新为 `'borrowed'`
- 修完后通知 Linpeng，Linpeng 重跑 E2E-2 和 E2E-3 验证联动是否正常

**Linpeng（今天完成 §6.2②）：**
- `bookingService.ts` → `getDamageReports()` 的 select 语句补上 `photo_urls`、`assets.purchase_price`、`assets.purchase_date`
- `DamageReportWithDetails` 类型同步加上 `photo_urls: string[]`
- 今天不用动 UI，只改 Service 层，明天 Day 5 再接上照片展示

**Letao（今天完成 §6.5）：**
- `assets/page.tsx` 删除 Price 列（`<th>` + 对应 `<td>`）和 `exportData` 里的 `'Price'` 字段
- 任务简单，今天必须完成

---

#### Day 5 (3/27 周四)：集中修复 + 继续完善

> 经过 4 天的测试，Bug List 上积累了不少问题。今天重点把 Bug 清一清，同时继续用自己的模块深入完善。

##### 【必测任务】Bug List 清理（2h）

**每个人：** 打开 Bug List，把自己名下所有 Pending / Reopened 的 Bug 逐一修复。修完标 Fixed，通知发现人去复测。

| 成员 | 重点修复方向 |
|------|-------------|
| **Bosheng** | Service 报错、RPC 函数异常、并发问题、RLS 权限、错误提示中文化 |
| **Yuxuan** | UI 错位、颜色硬编码、Loading 缺失、空状态缺失、图片问题 |
| **Cunjun** | 扫码异常、拍照上传失败、权限容错、通知不显示、按钮状态逻辑 |
| **Letao** | 表单校验漏洞、图表数据不准、路由保护、Excel 导出、编辑后不刷新 |
| **Linpeng** | Realtime 不生效、审批异常状态、信用分计算错误、审计日志缺失 |

##### 【Day 5 新增】Web 端改动任务（必须今天完成，见 §六）

**Linpeng（今天主要任务，共约 3h）：**

① `ReturnVerify.tsx` — 补全日期信息（§6.3，约 1.5h）：
- Info bar 新增一行：借用期 `start_date → end_date`（计算共 X 天）
- 新增一行：实际归还日期 `actual_return_date`
- 如果 `actual_return_date > end_date`：显示红色"逾期 X 天"badge
- 如果按时归还：显示绿色"按时归还"badge
- 使用 `date-fns` 的 `differenceInDays` 计算天数差

② `DamageTable.tsx` — 照片展示（§6.4①，约 1.5h）：
- 每行新增点击展开/收起逻辑（`useState<string | null>(expandedId)`）
- 展开区域显示：`photo_urls` 缩略图列表（点击全屏）+ 完整描述（不截断）+ 赔偿金额估算
- 赔偿估算公式：`purchase_price × 折旧比例 × 损坏系数`（见 §5.2 和 §6.4③）
- 如果 `photo_urls` 为空或 `purchase_price` 为空，对应区域显示"暂无"

**Letao（今天）：**
- 验证 Day 4 删除 Price 列后导出 Excel 是否正常，没问题则完成

##### 【自由探索】继续完善自己的模块（3h）

每个人用自己模块的视角做更深入的体验检查：

**Bosheng：**
- 连续提交 5 个借用请求，每个都正常吗？
- 取消一个 pending 的借用，再重新预约同一设备同一时段，能成功吗？
- BookingForm 里的日期选择器体验好用吗？

**Yuxuan：**
- 把 `expo-image` 替换掉所有 `<Image>`，开启缓存
- 首页有 50 个资产的时候，滑到底部能分页加载吗？
- 从 CategoryScreen 返回 HomeScreen 后，搜索栏状态还在吗？

**Cunjun：**
- 所有提交按钮加防重复点击（点击后 disable + loading）
- ReturnScreen 给用户一个引导文案"请拍摄设备正面照片"
- DamageReport 提交成功后自动跳回 BookingHistory

**Letao：**
- Dashboard 加一个时间范围选择（近 7 天 / 30 天 / 全部）
- users 页面搜索是否正常
- QR 码生成显示在资产详情里了吗？能打印吗？

**Linpeng：**
- 所有不可逆操作（审批/归还/确认损坏）加二次确认弹窗
- bookings 页面挂着 10 分钟不操作，Realtime 还活着吗？
- 对一个已完结（returned）的 booking 能不能重复操作？不应该能

---

#### Day 6 (3/28 周五)：第二轮 E2E + 交叉复测

> 经过 Day 5 的集中修复，今天验证成果：先交叉复测确认别人修好了，再跑第二轮 E2E。

##### 【Day 6 新增】Web 端改动任务（上午完成，下午验证）

**Linpeng（今天完成 §6.4②，约 2h）：**

`DamageTable.tsx` — Update 操作改为弹窗：
- 删除行内的 `w-40` 输入框和 select 下拉
- 新建 `DamageUpdateModal` 状态（`useState<DamageReportWithDetails | null>`）
- 点 Update 按钮 → 设置该报告为 modal 目标，弹窗打开
- 弹窗内容：
  - 显示借用者姓名 + 学号 + 损坏等级 badge
  - 状态下拉选（open / investigating / resolved / dismissed）
  - 动态提示文字（选 resolved → 显示"将扣 X 分"；选 dismissed → 显示"免责"）
  - 赔偿估算金额（只读，来自 Day 5 写好的计算逻辑）
  - 多行文本框填处理备注
  - 取消 / 确认保存 两个按钮
- 确认保存 → 调用 `onUpdateStatus(id, status, notes)` → 关闭弹窗

**Bosheng（今天验证）：**
- 核查 `approveBooking()` 修改后数据库状态是否正确（booking=approved, asset=borrowed）
- 如有问题今天修完

##### 【必测任务 - 上午】交叉复测（1.5h）

Day 3 你在别人模块发现的问题，今天确认修好了没：
- 修好了 → Bug List 标 **Verified**
- 没修好 → Bug List 标 **Reopened**，告诉他

同时以新用户角度再用一遍，看有没有新问题。

##### 【必测任务 - 下午】第二轮 E2E（1.5h）

跟 Day 4 一样的 6 条链路，但**换人操作**：

| 链路 | Day 4 谁操作 | 今天换谁 |
|------|------------|---------|
| E2E-1 借用申请 | Yuxuan | **Cunjun** |
| E2E-2 管理员审批 | Linpeng | **Letao** |
| E2E-3 扫码取货 | Cunjun | **Yuxuan** |
| E2E-4 归还核验 | Cunjun+Linpeng | **Yuxuan+Letao** |
| E2E-5 逾期检测 | Bosheng | **Bosheng** |
| E2E-6 损坏报告 | Cunjun+Linpeng | **Yuxuan+Letao** |

**6 条全通过 → 基础逻辑没问题了！有不通过的 → 立刻修。**

##### 【自由探索】剩余时间（2h）

继续用自己的模块，修发现的新问题。
重点关注"用着觉得别扭但不至于报错"的地方——这些是逻辑不合理的问题。

---

#### Day 7 (3/29 周六)：收尾 + 本轮总结

##### 【必测任务 - 上午】清理所有遗留 Bug（2h）

每个人把 Bug List 里自己名下的 Pending / Reopened 全部修完。
**标准：修完后没有"致命"和"严重"级别的遗留问题。**

##### 【必测任务 - 下午】最终确认（1.5h）

每个人打开自己负责的所有页面，从头到尾再用一遍：

| 成员 | 最终确认清单 |
|------|-------------|
| **Bosheng** | 登录✅ 注册✅ BookingForm提交✅ 所有RPC函数正常✅ `approveBooking`同步资产状态✅ |
| **Yuxuan** | 首页加载✅ 搜索✅ 详情✅ 日历（不可借用时禁用）✅ 设备信息完整显示✅ 个人中心✅ |
| **Cunjun** | 借用记录✅ 扫码✅ 取货✅ 归还✅ 报损坏✅ 通知✅ |
| **Letao** | 登录权限✅ 仪表盘✅ 资产CRUD✅ Assets页无Price列✅ Excel导出正常✅ |
| **Linpeng** | 审批通过后资产变borrowed✅ 归还页显示日期/逾期信息✅ 损坏页照片展示✅ Update弹窗正常✅ 赔偿估算显示✅ 审计日志✅ |

##### 【Day 7 Web 端最终验证清单】Linpeng + Letao 逐一跑通：

| 编号 | 验证点 | 预期结果 | 通过？ |
|------|--------|---------|--------|
| W7-01 | 审批一条 pending 借用后，去 Assets 页查该资产 | 状态已变为 Borrowed | ☐ |
| W7-02 | Assets 页表格 | Price 列已删除，表格整洁 | ☐ |
| W7-03 | 导出 Assets Excel | 无 Price 列，其他列正常，中文不乱码 | ☐ |
| W7-04 | Returns 页展开一条记录 | 显示借用期（起止日期 + 天数） | ☐ |
| W7-05 | Returns 页展开逾期的记录 | 显示红色"逾期 X 天"badge | ☐ |
| W7-06 | Returns 页展开准时归还的记录 | 显示绿色"按时归还"badge | ☐ |
| W7-07 | Damage Reports 页点击一条有照片的报告行 | 展开显示损坏照片缩略图 | ☐ |
| W7-08 | Damage Reports 页展开区域 | 显示赔偿估算金额（如 ¥4,800） | ☐ |
| W7-09 | Damage Reports 页点 Update 按钮 | 弹出 Modal，不再是行内小输入框 | ☐ |
| W7-10 | 弹窗选 resolved | 显示"将扣 X 分"提示，信息准确 | ☐ |
| W7-11 | 弹窗选 dismissed | 显示"免责处理，不扣分"提示 | ☐ |
| W7-12 | 弹窗点确认保存 | 关闭弹窗，列表刷新，状态正确 | ☐ |

##### 【QA】Cunjun 出第一轮总结报告（1.5h）

内容包括：
- 7 天总共发现多少个 Bug？修了多少？还剩多少？
- 每个模块的质量排名
- 哪些是"逻辑不合理"类的问题（改了设计而不只是改代码）
- 第二轮深度测试应该重点关注什么

---

### 📊 7 天总览

| 天 | 日期 | 必测任务 | 自由探索 |
|----|------|---------|---------|
| Day 1 | 3/23 | 基础功能检查（每人 10-12 条用例） | 自己用自己模块，发现问题就修 |
| Day 2 | 3/24 | 异常输入 + 边界情况测试（每人 7-8 条） | 继续修 + 深入使用 |
| Day 3 | 3/25 | 交叉测试（测别人的模块，每人 6 条） | 修自己模块遗留问题 |
| Day 4 | 3/26 | E2E 全链路联调（6 条业务流程） | 修 E2E 跑不通的地方 |
| Day 5 | 3/27 | Bug List 清理 | 深入完善自己模块 |
| Day 6 | 3/28 | 交叉复测 + 第二轮 E2E | 继续修 + 修逻辑不合理的地方 |
| Day 7 | 3/29 | 清理遗留 + 最终确认 | Cunjun 出总结报告 |

### 关键里程碑

| 日期 | 标准 |
|------|------|
| Day 2 结束 | 每人的必测任务通过率 > 80% |
| Day 4 结束 | 6 条 E2E 至少 4 条一次跑通 |
| Day 6 结束 | 6 条 E2E 全部跑通 |
| Day 7 结束 | Bug List 中无"致命/严重"级遗留，第一轮测试报告完成 |

---

## 六、Web 端逻辑优化方案（2026-03-26 补充）

> **背景**：测试阶段发现 Web 管理端存在多处数据不一致、信息残缺、操作体验差的问题。本章记录完整的改进设计，对应 Day 4-7 的开发任务。
> **负责人**：Linpeng（归还 + 损坏页）、Letao（资产页）、Bosheng（Service 层）

---

### 6.1 核心问题清单

| 优先级 | 问题 | 影响 |
|--------|------|------|
| 🔴 P0 | `approveBooking()` 审批通过后不更新 `assets.status` | 审批后资产仍显示 Available，Dashboard 借出数统计错误，可重复审批同一资产 |
| 🔴 P0 | `getDamageReports()` 不查询 `photo_urls` | 损坏照片无法显示，管理员无视觉证据 |
| 🟡 P1 | `ReturnVerify.tsx` Info bar 缺少日期信息 | 看不出是否逾期、借了多久 |
| 🟡 P1 | `DamageTable.tsx` Update 操作在行内，输入框 `w-40` 极小 | 处理备注几乎无法输入，体验极差 |
| 🟡 P1 | Assets 页显示 Price 列 | 校园借用系统，学生不需要看设备原价 |
| 🟢 P2 | 无赔偿金额估算 | 管理员处理损坏时无参考金额 |

#### 6.1.1 执行前审查修正（2026-03-26 实际落地时发现）

在执行上述计划时，代码审查发现以下偏差，已在实现中同步修正：

| # | 原计划描述 | 实际情况 | 修正措施 |
|---|-----------|---------|---------|
| 1 | P0：`getDamageReports()` 不查 `photo_urls` | **不成立**。`select(*)` 已包含 `photo_urls`（它是 `damage_reports` 表自身字段）。真正缺失的是 `assets` 子查询里的 `purchase_price`、`purchase_date` | 将此 P0 降级；改为在 assets select 中补查 `purchase_price`、`purchase_date` |
| 2 | 信用分扣减标准混乱 | 代码中的损坏扣分曾与 §5.3 文档标准不一致，界面展示也未同步 | 全部统一为 §5.3 标准：**minor:-5 / moderate:-15 / severe:-30** |
| 3 | `createDamageReport()` 方法 | 与 `reportDamage()` 功能高度重复，且项目中无任何调用方 | 已删除，避免维护歧义 |
| 4 | `lib/authFetch.ts` 文件 | 导出函数从未被任何文件 import，属于遗留死代码 | 已删除 |

---

### 6.2 改动一：`bookingService.ts` — 数据一致性修复（Bosheng/Linpeng）

**文件**：`app-web/lib/bookingService.ts`

#### ① `approveBooking()` — 审批时同步更新资产状态

```
现在：bookings.status → 'approved'（只改这一个）
改后：bookings.status → 'approved'
      assets.status  → 'borrowed'（通过 booking.asset_id 找到资产，同步更新）
```

逻辑：审批通过 = 管理员确认该设备将被借出，资产状态应立刻反映为不可借用。

#### ② `getDamageReports()` — 补查照片字段

```
现在：select 语句中 damage_reports 没有拉取 photo_urls
改后：select 语句加上 photo_urls

DamageReportWithDetails 类型同步加上：
  photo_urls: string[]
```

---

### 6.3 改动二：`ReturnVerify.tsx` — 补全关键日期信息（Linpeng）

**文件**：`app-web/components/returns/ReturnVerify.tsx`

#### Info bar 新增一行日期区块

```
现在的 Info bar：
  [资产名]
  Returned by [姓名] [学号]  |  [QR码]

改后的 Info bar：
  [资产名]
  Returned by [姓名] [学号]  |  [QR码]
  ─────────────────────────────────────
  📅 借用期：2026-03-20 → 2026-03-26（共 6 天）
  🕐 实际归还：2026-03-28   ⚠️ 逾期 2 天（红色 badge）
```

**计算逻辑**：
- 借用天数 = `end_date - start_date`（用 `date-fns` 的 `differenceInDays`）
- 是否逾期 = `actual_return_date > end_date`
- 逾期天数 = `differenceInDays(actual_return_date, end_date)`
- 逾期时显示红色 badge，准时归还显示绿色 "按时归还"

**所用字段**（`BookingWithDetails` 已有，直接用）：
- `booking.start_date`
- `booking.end_date`
- `booking.actual_return_date`

**两个操作按钮保持不变**（Report Damage / Confirm Return，已够清晰）

---

### 6.4 改动三：`DamageTable.tsx` — 照片展示 + Update 改弹窗 + 赔偿估算（Linpeng）

**文件**：`app-web/components/damage/DamageTable.tsx`

#### ① 损坏照片展示

每条报告行新增可展开区域（点击行展开/收起）：

```
点击行展开后显示：
┌──────────────────────────────────────────────────┐
│ 损坏照片                                          │
│ [缩略图1] [缩略图2] [缩略图3]  ← 点击任意一张全屏 │
│                                                    │
│ 完整描述：[report.description，不截断]             │
│ 赔偿估算：原值 ¥12,000 × 80%（1-3年）× 0.5（中度）= ¥4,800  │
└──────────────────────────────────────────────────┘
```

条件：仅当 `photo_urls.length > 0` 时显示照片区；`photo_urls` 为空则只显示描述和估算。

#### ② Update 操作改为弹窗

```
现在：点 Update → 行内展开 w-40 输入框（极小，体验差）

改后：点 Update → 弹出 Modal，内容如下：

弹窗标题：处理损坏报告 — [资产名]
┌──────────────────────────────────────┐
│ 借用者：[姓名] [学号]                 │
│ 损坏等级：[Severity badge]            │
│                                      │
│ 当前状态：[Open]  →  更新为：[下拉选] │
│                                      │
│ ⚠️ 状态说明（动态显示）：              │
│   · resolved → 将扣减学生信用分       │
│     minor: -5分 / moderate: -15分    │
│     severe: -30分                    │
│   · dismissed → 免责，不扣分          │
│                                      │
│ 赔偿估算：¥4,800（可手动修改）         │
│                                      │
│ 处理备注：[多行文本框]                 │
│                                      │
│          [取消]     [确认保存]        │
└──────────────────────────────────────┘
```

#### ③ 赔偿金额估算（只读参考，可手动覆盖）

根据 §5.2 公式自动计算：

```
赔偿金额 = purchase_price × 折旧比例 × 损坏系数

折旧比例：
  purchase_date 距今 0-1年 → 100%
  1-3年 → 80%
  3-5年 → 50%
  5年以上 → 20%

损坏系数：
  minor → 0.2
  moderate → 0.5
  severe → 1.0
```

`DamageReportWithDetails` 需要额外 join `assets.purchase_price` 和 `assets.purchase_date`（在 `bookingService.ts` 的 select 语句里补上）。

---

### 6.5 改动四：Assets 页删除 Price 列（Letao）

**文件**：`app-web/app/dashboard/assets/page.tsx`

```
删除表格的 Price 列（<th> 和对应的 <td>）
删除 exportData 中的 'Price' 字段

保留：purchase_price 字段在 AssetForm 里仍可录入
      （用途：赔偿计算，不对外展示）
```

---

### 6.6 各页面联动流程（改后完整版）

```
学生提交借用申请
    │
    ▼
【Bookings 页】待审批列表出现 → 管理员点 Review → 弹窗审批
    │ 点 Approve
    ▼
bookingService.approveBooking()
  ├── bookings.status → 'approved'
  └── assets.status  → 'borrowed'  ← 【改动一，数据联动修复】
    │
    ▼
【Assets 页】该资产状态立刻变为 Borrowed ✅
    │
    （学生手机端扫码取货 → booking active）
    │
    （学生归还 + 上传照片）
    │
    ▼
【Returns 页】待验证列表出现该记录
  展开显示：取借照片 vs 归还照片
           借用期 / 实际归还日 / 逾期天数  ← 【改动二，新增】
    │
  管理员操作：
    ├── Confirm Return → processReturn()
    │     ├── bookings.status → returned + VERIFIED
    │     └── assets.status  → available
    │     【Assets 页恢复可用 ✅】
    │
    └── Report Damage → DamageSeverityModal 选等级
          → reportDamage()
          ├── damage_reports 创建（含 photo_urls）
          ├── bookings.status → returned + VERIFIED
          └── assets.status  → maintenance
          【Damage Reports 页自动出现新记录 ✅】
    │
    ▼
【Damage Reports 页】新报告（status: open）
  点击行展开 → 显示损坏照片 + 赔偿估算  ← 【改动三，新增】
  点 Update → 弹窗处理                   ← 【改动三，改为弹窗】
    ├── resolved → 自动扣分 + 推送通知（弹窗内明确提示扣几分）
    └── dismissed → 免责 + 推送通知
    【resolved 后管理员去 Assets 页手动 Re-list 恢复设备】
```

---

### 6.7 改动文件速查表（含审查修正）

| 文件 | 改动内容 | 状态 |
|------|---------|------|
| `app-web/lib/bookingService.ts` | `approveBooking()` 加 asset 状态同步为 `borrowed`；`getDamageReports()` assets select 补 `purchase_price`、`purchase_date`；`DamageReportWithDetails` 类型同步更新；信用分标准统一为 §5.3（minor:-5 / moderate:-15 / severe:-30）；删除重复的 `createDamageReport()` 方法 | ✅ 已完成 |
| `app-web/components/returns/ReturnVerify.tsx` | Info bar 新增借用期（start_date → end_date）、实际归还日、逾期天数（红色 badge）/ 按时归还（绿色 badge） | ✅ 已完成 |
| `app-web/components/damage/DamageTable.tsx` | 行可展开显示损坏照片（含全屏预览）、完整描述、赔偿估算；Update 改为弹窗（含借用者信息、状态下拉、扣分提示、赔偿估算、多行备注）；新增赔偿公式 `purchase_price × 折旧比例 × 损坏系数` | ✅ 已完成 |
| `app-web/components/damage/DamageSeverityModal.tsx` | 信用分显示从 -10/-20/-30 修正为 -5/-15/-30，与 §5.3 一致 | ✅ 已完成 |
| `app-web/app/dashboard/assets/page.tsx` | 删除 Price 列（表头、行数据）、导出字段去除 Price、colSpan 9→8 | ✅ 已完成 |
| `app-web/lib/authFetch.ts` | 死代码，从未被 import，已删除 | ✅ 已删除 |

---

## 五、设备损坏赔偿机制设计方案

> 参考依据：合肥工业大学、南昌大学、中山大学、美国 Stanford / University of Houston / Florida State University 等高校的设备借用损坏政策（2019-2024年版本），结合 UniGear 实际场景定制。

---

### 5.1 核心设计原则

1. **不按原价全额赔偿** — 设备随时间折旧，赔偿额应反映当前实际价值，否则对学生不公平。
2. **正常磨损免赔** — 合理使用产生的划痕、按键磨损等，由学校自行承担，不追究学生责任。
3. **损坏等级决定赔偿系数** — 损坏越严重，赔偿比例越高，故意破坏按最高系数处理。
4. **信用分与赔偿双轨并行** — 经济赔偿解决物质损失，信用分扣减约束借用行为，两者独立计算。
5. **追缴有层次、有期限** — 逐步升级处置手段，给学生合理的缓冲时间，避免一刀切。

---

### 5.2 赔偿金额计算公式

```
赔偿金额 = 设备原值 × 折旧比例 × 损坏系数
```

#### 折旧比例（按购置年限）

| 购置年限 | 折旧比例 | 说明 |
|---------|---------|------|
| 0 - 1 年 | 100% | 近新设备，价值基本无损 |
| 1 - 3 年 | 80% | 主要使用期，保值率较高 |
| 3 - 5 年 | 50% | 中期折旧，已有明显损耗 |
| 5 年以上 | 20% | 接近报废年限，价值大幅下降 |

> 购置年限 = 当前日期 - 设备 `purchase_date`，对应数据库 `assets.purchase_date` 字段。

#### 损坏系数（按损坏等级）

| 等级 | 英文标识 | 系数 | 典型例子 |
|-----|---------|------|---------|
| 正常磨损 | — | **0（免赔）** | 轻微划痕、按键磨损、接口轻微氧化 |
| 轻微损坏 | `minor` | **0.2** | 配件缺失、外壳轻微凹陷、条码磨损 |
| 中度损坏 | `moderate` | **0.5** | 屏幕裂纹、接口损坏、外壳破裂 |
| 严重损坏 | `severe` | **1.0** | 无法开机、浸液损坏、主板故障 |
| 设备丢失（用户自报） | `lost` | **折旧价** | 用户主动申报丢失，赔偿 = 原价 × 折旧比例 × 1.0 |
| 设备丢失（超期/调包） | `lost` | **全款** | 超期30天自动判定或管理员发现调包，不计折旧，赔偿 = 原价 |
| 故意破坏 | — | **1.0 + 纪律处分** | 主观故意损毁，按净值全额赔偿 |

#### 计算示例

> **场景 A**：MacBook Pro（原值 ¥15,000，购置 2 年），归还时发现屏幕破裂（中度损坏）。
>
> 赔偿金额 = 15,000 × 80%（折旧比例）× 0.5（损坏系数）= **¥6,000**

> **场景 B**：相机（原值 ¥3,000，购置 4 年），用户主动申报丢失。
>
> 赔偿金额 = 3,000 × 50%（折旧比例）× 1.0 = **¥1,500**（享受折旧优惠，因主动诚信申报）

> **场景 C**：相机（原值 ¥3,000），超期 30 天系统自动判定丢失。
>
> 赔偿金额 = 3,000（**全款，不计折旧**，惩罚长期拖延）

---

### 5.3 信用分扣减规则

> 系统中已有 `profiles.credit_score` 字段（满分 100 分），以下为违规行为对应扣分标准。
> 参考依据：MIT Equipment Pool 信用分制、青桔单车节点式惩罚、中国高校 7/30 天节点惯例。

#### 一、逾期自动扣分（三节点，系统自动触发）

| 节点 | 扣分 | 触发条件 | 说明 |
|-----|------|---------|------|
| **Day 1** | **-10** | 到期未还，首次检测（`active → overdue`） | 一次性触发 |
| **Day 7** | **-15** | 仍未还 | 在 Day 1 基础上额外扣 |
| **Day 30** | **-25** | 仍未还，自动判定为丢失 | 同时创建 `lost` 损坏报告 |
| **逾期封顶** | **-50** | 三节点合计上限，Day 30 后不再扣逾期分 | |

#### 二、丢失报告扣分（三种场景，由来源区分）

| 场景 | 来源识别 | 信用分扣减 | 赔偿金额 |
|-----|---------|-----------|---------|
| **系统自动判定丢失**（超期30天） | `auto_generated = true` | **0**（已含在逾期 -50 内，不重复扣） | **全款**（不计折旧） |
| **用户主动申报丢失**（手机端提交） | `reporter_id == borrower_id` | **-30**（管理员确认时扣） | 折旧价（诚信申报优惠） |
| **管理员发现调包**（归还时欺诈） | `reporter_id == admin_id` | **-50**（管理员确认时扣） | **全款**（不计折旧） |

#### 三、损坏报告扣分（管理员审核确认时触发）

| 损坏等级 | 扣分 | 对应 `severity` |
|---------|------|----------------|
| 轻微损坏 | **-5** | `minor` |
| 中度损坏 | **-15** | `moderate` |
| 严重损坏 | **-30** | `severe` |

#### 四、叠加规则与下限

- **逾期 + 损坏可叠加**：同一借用既逾期又有损坏报告，两者独立计算后合并扣减
- **信用分下限为 0**：不会扣成负数
- **最坏情况示例**：逾期 30 天（-50）+ 管理员发现调包（-50）= -100，信用分从 100 → 0

#### 五、信用分门槛与借用权限

| 信用分区间 | 状态 | 借用限制 |
|-----------|------|---------|
| 80 – 100 | 正常 | 无限制，可借所有设备 |
| 60 – 79 | 警告 | 不可借用高价值设备（原值 ≥ ¥5,000） |
| 40 – 59 | 受限 | 暂停所有借用权限，须先处理未结赔偿 |
| 0 – 39 | 冻结 | 账号冻结，须联系管理员人工审核恢复 |

> 信用分可通过**连续守信行为**自动恢复：连续 30 天无违规，每天 +0.5 分，上限恢复至 100 分。

---

### 5.4 丢失处理流程（三种场景）

#### 场景一：超期未还 → 系统自动判定丢失

```
到期未还
    │
    ▼ Day 1（check_overdue_bookings 自动触发）
booking: active → overdue
信用分 -10，推送逾期通知

    │ 仍未还
    ▼ Day 7
信用分 -15，推送加急通知

    │ 仍未还
    ▼ Day 30
信用分 -25，逾期扣分封顶 -50
自动创建 severity=lost 的损坏报告（auto_generated=true）
推送丢失判定通知，告知需全额赔偿

    │
    ▼ 管理员在 Damage Reports 页确认
显示全款赔偿金额（不计折旧）
不额外扣信用分（已扣满 -50）
资产状态标记为 retired
```

#### 场景二：用户主动申报丢失

```
用户手机端 DamageReportScreen
选择"设备丢失"→ 提交损坏报告
    │
    ▼ 系统立即进入“待确认丢失”中间态
damage_report: severity=lost, status=open
booking: active / overdue / returned → lost_reported
asset: → maintenance

    │ 管理员确认前，用户仍可纠正
    ├── 方案 A：把 severity 从 lost 改为普通损坏
    │         ▼
    │   booking 恢复到 active / overdue / returned（按当前借用进度判断）
    │   若原本还没归还 → 回到“拍照归还”流程
    │   若原本已提交归还照片 → 回到“已归还待核验”流程
    │
    ├── 方案 B：直接撤销这条报修单
    │         ▼
    │   damage_report.status → dismissed
    │   booking 同样恢复到 active / overdue / returned
    │
    └── 管理员确认真实丢失
              ▼
        damage_report.status → resolved
        booking → lost
        asset → retired
        信用分 -30（诚信申报，从轻处理）
        赔偿金额 = 原价 × 折旧比例（有折旧优惠）
```

#### 场景三：归还时管理员发现调包（欺诈行为）

```
学生归还了物品（booking 通常已进入 returned 或核验阶段）
管理员在归还验证页对比照片发现物品被调包 / 实物缺失
    │
    ▼ 管理员先创建 lost 类型损坏报告（不是直接终态）：

入口 A：归还验证页 → "Report Damage" → DamageSeverityModal → 选 Lost
入口 B：损坏报告页 → Update Modal → 选 Lost

    │
    ▼ 系统先进入 lost_reported（待确认丢失）
booking → lost_reported
asset → maintenance

    │
    ▼ 管理员在 Damage Reports 页最终确认
damage_report.status → resolved
booking → lost
asset → retired
信用分 -50（主动欺骗，重罚）
赔偿金额 = 全款（不计折旧）
```

#### 赔偿追缴通用流程

```
赔偿金额确定（管理员确认损坏报告后）
    │
    ▼ Day 0
推送通知给学生，附赔偿金额明细

    │ 7 天内未处理
    ▼ Day 7
暂停该学生借用权限，每日催缴提醒

    │ 再 23 天内未处理
    ▼ Day 30
账号冻结，管理员介入线下处理
情节严重者提交校级纪律审查
```

> 确有困难的学生可向管理员申请分期处理，在系统备注中记录协商结果。

---

### 5.5 数据库字段对应关系

| 机制元素 | 对应数据库字段 | 所在表 |
|---------|--------------|-------|
| 设备原值 | `purchase_price` | `assets` |
| 购置日期（计算折旧） | `purchase_date` | `assets` |
| 损坏等级 | `severity` (`minor`/`moderate`/`severe`/`lost`) | `damage_reports` |
| 是否系统自动生成 | `auto_generated` (`boolean`) | `damage_reports` |
| 赔偿状态 | `status` (`open`/`investigating`/`resolved`/`dismissed`) | `damage_reports` |
| 学生信用分 | `credit_score` | `profiles` |
| 损坏描述 | `description` | `damage_reports` |
| 损坏照片 | `photo_urls` | `damage_reports` |
| 处理备注 | `resolution_notes` | `damage_reports` |

#### 丢失场景代码识别逻辑

```
damage_reports.auto_generated = true
  → 系统30天自动判定（场景一）→ 管理员确认，不额外扣分

damage_reports.reporter_id == bookings.borrower_id
  → 用户主动自报（场景二）→ 管理员确认，扣 -30 分

damage_reports.reporter_id != bookings.borrower_id（管理员 ID）
  → 管理员发现调包（场景三）→ 管理员确认，扣 -50 分
```

---

### 5.6 免责情形（不予追究赔偿）

以下情形经管理员核实后，可标记为 `dismissed`（不追责），学生无需赔偿，信用分不扣减：

1. **正常使用磨损** — 外观轻微磨损、非人为导致的老化
2. **设备本身质量问题** — 借出前设备已存在隐患，管理员应在发放时拍照记录
3. **不可抗力** — 自然灾害、突发意外等客观因素导致损坏

> 免责认定必须由管理员在 Web 端手动操作，系统不自动豁免。

---

### 5.7 参考来源

| 来源 | 参考内容 |
|-----|---------|
| 南昌大学《仪器设备损坏或丢失赔偿实施细则》 | 分段折旧比例表 |
| 合肥工业大学《仪器设备损坏、丢失赔偿管理办法》(2019) | 责任系数体系 |
| 中山大学《实验室损坏、丢失设备赔偿细则》 | 五级责任等级划分 |
| Stanford University Equipment Borrowing Policy | 30天账单转入机制、赔偿上限设计 |
| University of Houston Libraries — Laptop Borrowing Policies | 累计违规次数触发制 |
| Florida State University — Equipment Loss & Damage Fund | 免赔额制度、故意破坏认定标准 |
| Ohio State University Libraries — Fines, Fees, and Appeals | 欠款触发冻结账户机制 |

---

## 七、逾期扣分机制实现方案（2026-03-26 补充）

> **背景**：归还验证页已能检测并显示"Overdue X days"，但点击「Confirm Return」时系统不会自动扣分。本章记录将逾期检测与信用分扣减打通的完整实现计划。

---

### 7.1 扣分规则（分级制）

| 逾期天数区间 | 每天扣分 | 示例 |
|------------|---------|------|
| 1–3 天 | -3 分/天 | 逾期 3 天 → -9 分 |
| 4–7 天 | -5 分/天 | 逾期 5 天 → -9 + (-5×2) = -19 分 |
| > 7 天 | -8 分/天 | 封顶合计 **-50 分** |

**计算公式（伪代码）：**

```
function calcOverduePenalty(overdueDays):
  if overdueDays <= 0: return 0
  penalty = 0
  penalty += min(overdueDays, 3) × 3          // 前 3 天
  if overdueDays > 3:
    penalty += min(overdueDays - 3, 4) × 5    // 第 4-7 天
  if overdueDays > 7:
    penalty += (overdueDays - 7) × 8          // 第 7 天以后
  return min(penalty, 50)                      // 封顶 -50
```

---

### 7.2 触发时机

**触发点：管理员在「归还验证」页点击「Confirm Return (No Damage)」**

选择此触发点的原因：
- 逾期扣分属于"归还行为结束时的系统后果"，与验证动作绑定最自然
- 不需要定时任务（cron job），减少系统复杂度
- 管理员可在确认前看到预警，避免误操作

若该归还**既逾期又损坏**（点「Report Damage」路径）：
- 逾期扣分：在 `processReturn()` 中执行（归还时）
- 损坏扣分：在 `updateDamageReportStatus()` → resolved 时执行（审核时）
- 两者独立扣减，互不影响

---

### 7.3 改动文件清单

| 文件 | 改动内容 | 负责人 |
|------|---------|-------|
| `app-web/lib/bookingService.ts` | `processReturn()` 内新增：计算 `overdueDays`、按分级规则算 `penalty`、调用已有 `update_credit_score` RPC、发送 `overdue_alert` 通知 | Bosheng / Linpeng |
| `app-web/app/dashboard/returns/page.tsx` | `handleVerify()` 无损归还分支：若逾期则弹二次确认框（显示"将扣 X 分，是否确认？"），确认后再调 `processReturn()` | Linpeng |
| `app-web/components/returns/ReturnVerify.tsx` | 逾期时在 badge 旁追加预估扣分提示（如 `Overdue 3 days · 预计扣 -9 分`），管理员点按钮前即可知晓后果 | Linpeng |

**无需新增数据库字段**：逾期天数由 `actual_return_date - end_date` 动态计算，扣分通过已有 `update_credit_score(user_id, delta, reason)` RPC 执行。

---

### 7.4 UI 交互流程

```
管理员打开归还验证页
        │
        ▼
看到「Overdue 3 days · 预计扣 -9 分」红色 badge
        │
        ▼
点击「Confirm Return (No Damage)」
        │
        ▼
弹出确认框：
  "此借用逾期 3 天，将自动扣减 9 信用分。确认归还？"
  [取消]  [确认扣分并归还]
        │
        ▼ 确认
系统执行：
  1. booking.status → returned
  2. asset.status → available
  3. credit_score -= 9（通过 update_credit_score RPC）
  4. 发送通知给借用者："您的借用逾期 3 天，已扣减 9 信用分"
        │
        ▼
归还卡片从列表消失，Toast 提示成功
```

---

### 7.5 通知内容模板

```
标题：逾期归还扣分通知
正文：您借用的「{设备名}」逾期 {X} 天归还，
      已扣减信用分 {Y} 分。
      当前信用分：{当前分数}。
      请按时归还设备，避免信用分持续降低。
通知类型：overdue_alert
```

---

### 7.6 与现有损坏扣分系统的对比

| 维度 | 损坏扣分（已实现） | 逾期扣分（本章新增） |
|------|-----------------|------------------|
| 触发方式 | 管理员手动确认损坏等级 | 系统自动（归还时计算） |
| 触发时机 | `updateDamageReportStatus` → resolved | `processReturn()` 调用时 |
| 扣分标准 | 固定值（-5/-15/-30） | 按天数分级（-3/-5/-8/天） |
| 上限 | -30（severe） | -50 |
| 二次确认 | 选择等级即为确认 | 弹窗确认（显示具体扣分数） |
| 通知类型 | 损坏报告通知 | `overdue_alert` |

---

## 八、损坏处理、maintenance 锁定与 suspended 预约恢复机制（2026-03-29 更新）

> **背景**：当前系统不再等待管理员手动把设备改成 `maintenance`。只要损坏报告进入 `open` 或 `investigating`，后端就会立刻锁定设备，并同步处理未来预约、通知与重新上架权限。

---

### 8.1 当前系统的核心规则

1. 任何 `damage_reports.status in ('open', 'investigating')` 的记录一旦创建或回填，系统立即执行：
   - `assets.status → maintenance`
   - 该设备所有 `start_date > now()` 的 `pending/approved` 预约 → `suspended`
   - 为受影响预约逐条写入 `booking_suspended` 通知
2. 对于普通损坏（`minor / moderate / severe`），当前这笔借用仍按归还生命周期继续走；`suspended` 只作用于未来预约，不回写到当前借用单本身。
3. 对于 `lost` 报告，当前借用会先进入可逆中间态：
   - `booking.status → lost_reported`
   - 手机端隐藏“拍照归还”，只保留“编辑报修 / 撤销报告”
   - 该状态表示“待确认丢失”，不是最终丢失
4. 在 `lost_reported` 阶段，用户若后来找回设备，可以：
   - 把 `severity` 从 `lost` 改成普通损坏；系统恢复到 `active / overdue / returned`
   - 或直接撤销自己的未处理报修单；系统同样恢复到 `active / overdue / returned`
   - 恢复后**不会**回到 `approved`，因此不会重新进入“扫码取货”，而是回到当前应处的归还阶段
5. 只有管理员最终确认真实丢失后，才进入终态：
   - `damage_report.status → resolved`
   - `booking.status → lost`
   - `assets.status → retired`
   - 相关 `suspended` 预约全部自动取消
6. 学生在 `suspended` 状态下可随时主动取消预约，无需等待设备修复。
7. 只要设备仍存在 `open/investigating` 的损坏报告，网页端不得 `Re-list`，数据库层也会阻止把资产改回 `available`。
8. `resolved/dismissed` 结束的是“损坏审核”，不是“赔偿结算”：
   - 非 `lost`：资产继续保持 `maintenance`，等待管理员修复后手动重新上架
   - `lost`：资产直接改为 `retired`
9. 当前实现以“损坏审核是否结束”作为 `Re-list` 门槛，而不是“赔偿是否已付清”。赔偿流程与设备可否重新上架相互独立。

---

### 8.2 当前以哪些迁移和函数为准

| 文件 | 当前口径 |
|------|---------|
| `database/migrations/014_add_suspended_booking_status.sql` | 引入 `suspended` 预约状态，作为后续暂停/恢复机制的基础 |
| `database/migrations/025_damage_maintenance_enforcement.sql` | 新增 `apply_damage_report_maintenance()`、`prevent_relist_with_unresolved_damage_reports()`、`check_suspended_maintenance_bookings()`；并重写 `return_booking()`，使其在存在未结损坏报告时保持 `maintenance` |
| `database/migrations/026_fix_return_booking_asset_status_cast.sql` | 修复 `return_booking()` 中 `asset_status` 枚举赋值问题 |
| `database/migrations/027_lost_reported_booking_flow.sql` | 引入 `lost_reported` / `lost` 借用状态，以及可恢复的“待确认丢失”流程 |
| `database/migrations/028_lost_reported_flow_followups.sql` | 让 `lost` 的 DB 触发器、赔偿同步和 `returned → lost_reported` 的回写规则保持一致 |
| `database/migrations/029_withdraw_own_damage_report.sql` | 允许用户撤销自己未处理的报修单，并恢复借用/资产流程 |
| `database/migrations/030_fix_withdraw_damage_report_dependencies.sql` | 补齐撤销报修所需的 helper functions，避免依赖缺失 |
| `database/migrations/031_fix_damage_flow_restore_status.sql` | 修复“撤销报失后误回到 approved/扫码取货”的问题，统一恢复到 `active / overdue / returned` |

> `025` 会回填已有的 `open/investigating` 损坏报告；`031` 会回填那些曾被错误恢复成 `approved` 的历史借用单。

---

### 8.3 `rejection_reason` 约定

| 值 | 含义 |
|----|------|
| `ASSET_MAINTENANCE` | 因设备进入维修流程而被挂起的预约 |
| `ASSET_MAINTENANCE_EXPIRED` | 取货前 12 小时仍未恢复，系统自动取消 |
| `ASSET_LOST_CONFIRMED` | 设备最终确认丢失，原 `suspended` 预约直接取消 |
| `LOST_REPORTED` | 当前借用已进入“待确认丢失”中间态 |
| `LOST_CONFIRMED` | 当前借用已被管理员确认为最终丢失 |
| `VERIFIED` | 归还已核验（无损或损坏流程已建立） |

---

### 8.4 暂停、恢复与取消的执行规则

```
损坏报告进入 open / investigating
      │
      ▼
资产 → maintenance
未来预约 pending / approved → suspended
      │
      ├── 当前借用若 severity = lost
      │        ▼
      │   booking → lost_reported
      │   手机端暂停“拍照归还”
      │
      │   ├── 用户改回普通损坏
      │   │        ▼
      │   │   booking 恢复为 active / overdue / returned
      │   │
      │   ├── 用户撤销未处理报修单
      │   │        ▼
      │   │   damage_report → dismissed
      │   │   booking 恢复为 active / overdue / returned
      │   │
      │   └── 管理员确认真实丢失
      │            ▼
      │       booking → lost
      │       asset → retired
      │
      ├── 学生主动取消 → cancelled
      │
      ├── 管理员修复并重新上架
      │        │
      │   start_date > now   → 恢复为 pending → 通知 booking_restored
      │   start_date ≤ now   → 自动 cancelled → 通知 booking_cancelled
      │
      ├── 距离取货时间 ≤ 12h 仍在 maintenance
      │        ▼
      │   自动 cancelled（ASSET_MAINTENANCE_EXPIRED）
      │
      └── 最终确认 lost
               ▼
          资产 → retired
          所有 suspended 预约 → cancelled（ASSET_LOST_CONFIRMED）
```

补充说明：
- `check_suspended_maintenance_bookings()` 是统一的后端 RPC；当前由网页端和移动端在拉取相关列表前触发一次检查。
- 管理员 `Re-list` 后，网页端会调用 `restoreMaintenanceBookings(assetId)`，把仍然有效的预约恢复成 `pending`，过期预约则直接取消。

---

### 8.5 通知与移动端展示

| 场景 | `type` | 用户端表现 |
|------|--------|-----------|
| 预约被暂停 | `booking_suspended` | 通知页提示设备维修中，借用记录允许用户主动取消 |
| 预约恢复 | `booking_restored` | 通知页提示预约恢复为待审批状态 |
| 维修过久自动取消 | `booking_cancelled` | 通知页提示因维修无法履约而取消 |
| 设备最终确认丢失 | `booking_cancelled` | 通知页提示设备无法恢复，本次预约已取消 |
| 赔偿流程更新 | `compensation_update` | 手机端赔偿中心与通知页同步显示金额、状态、已付/待付进度 |

移动端借用记录对 `lost_reported` / `lost` 的当前实现如下：
- `lost_reported`：显示“已报失待确认”，隐藏“拍照归还”，保留“编辑报修 / 撤销报告”
- 若用户把 `lost` 改回普通损坏，或撤销自己的未处理报修单：自动恢复到 `active / overdue / returned`
- `lost`：显示“已确认丢失”，不再允许归还，但仍可继续查看赔偿进度

移动端借用记录中的赔偿状态采用业务化文案：
- 已进入赔偿流程且未结案：显示 `等待赔款`
- 赔偿单状态为 `paid` 或 `waived`：显示 `已完成`
- 未进入损坏/赔偿流程：不额外显示赔偿状态条

---

### 8.6 完整状态流转图

```
学生提交预约
      │
      ▼
  pending ──(管理员审批通过)──→ approved ──(扫码取货)──→ active
      │                            │                        │
  (拒绝)                       (学生取消)              (归还)  (逾期)
      ▼                            ▼                   ▼       ▼
  rejected                    cancelled            returned  overdue
                                                              │
                                                         (最终归还)
                                                              ▼
                                                          returned

────── 资产维修 / 损坏处理分支 ─────────────────────────────────

  active / overdue / returned
      │
  (创建 open / investigating 损坏报告)
      ▼
  damage_report 处理中
      │
      ├── 资产 → maintenance
      ├── 未来 pending / approved → suspended
      ├── 未结案时禁止 Re-list
      │
      ├── (severity = lost 且 open / investigating)
      │          ▼
      │      booking → lost_reported
      │          │
      │          ├─ 用户改回普通损坏 ──→ active / overdue / returned
      │          ├─ 用户撤销报告 ─────→ active / overdue / returned
      │          ├─ 管理员驳回 lost ──→ active / overdue / returned
      │          └─ 管理员确认 lost ──→ booking lost + asset retired
      │
      ├── (dismissed / resolved 非 lost) ──→ 维修后管理员 Re-list
      │                                      │
      │                                      ├─ start_date > now → pending
      │                                      └─ start_date ≤ now → cancelled
      │
      └── (resolved 且 lost) ──→ asset retired + suspended 预约全部 cancelled
```

---

### 8.7 与其他机制的关系

| 机制 | 相互独立 | 说明 |
|------|---------|------|
| 逾期扣分（第七章） | ✅ 独立 | `suspended` 只影响未来预约，不回滚已产生的逾期记录 |
| 损坏审核与赔偿 | ✅ 独立 | `Re-list` 看损坏审核是否结束；赔偿是否已付清不阻止设备重新上架 |
| 通知系统 | 复用 | `booking_suspended` / `booking_restored` / `booking_cancelled` / `compensation_update` 均写入 `notifications` 表 |

---

## 附录 A：UniGear 用户规则与帮助手册（当前版本最终口径）

> **说明：** 本附录根据当前数据库函数、移动端与管理端代码实现整理。  
> 若计划书前文存在旧版规则或与本附录不一致的描述，**以本附录为最终口径**。

### A.1 借用与取货流程

1. 用户在设备详情页选择日期后提交借用申请，系统会先检查时间冲突，再创建预约记录。
2. 新申请默认进入 `pending`（待审批）状态，必须经过管理员审核。
3. 管理员审核通过后，预约进入 `approved`（已批准）状态；若拒绝，则进入 `rejected`（已拒绝）状态并记录原因。
4. 用户只有在借用开始日期当天及之后，才能通过现场扫码完成取货。
5. 扫码确认后，借用状态从 `approved` 变为 `active`（已借用），借用周期正式开始。
6. 当前系统支持记录取货照片，用于保留设备交接时的初始状态。

### A.2 归还与损坏处理流程

1. 处于 `active`（已借用）或 `overdue`（已逾期）状态的记录，均可发起归还。
2. 归还时用户需要上传归还照片，系统会保存归还时间和归还凭证。
3. 若设备存在问题，用户可提交损坏报告，管理员也可在归还核验页补录损坏单：
   - 轻微损坏 / 中度损坏 / 严重损坏：需上传证据照片
   - 设备丢失：允许无照片提交
4. 只要损坏报告进入 `open` 或 `investigating`，系统会立即：
   - 将设备状态切到 `maintenance`
   - 将该设备未来的 `pending/approved` 预约批量改为 `suspended`
   - 向受影响用户发送暂停通知
5. 普通损坏不会把当前借用切离归还流程；但若报告类型为 `lost`，当前借用会先进入 `lost_reported`（已报失待确认）中间态：
   - 手机端隐藏“拍照归还”
   - 保留“编辑报修 / 撤销报告”
   - 管理员确认前，用户可将 `lost` 改回普通损坏，或直接撤销报修单
6. 若用户把 `lost` 改回普通损坏，或撤销自己的未处理报修单，系统会把借用自动恢复到 `active / overdue / returned` 中正确的那个阶段；**不会**回到 `approved`，因此不会重新出现“扫码取货”。
7. 损坏报告处理流转为：`open`（待处理）→ `investigating`（核验中）→ `resolved`（确认成立）或 `dismissed`（驳回 / 撤销）。
8. 管理员确认损坏成立后，系统会按损坏程度扣减信用分、同步赔偿单，并依据设备信息估算赔偿金额。
9. 若设备先完成归还、后续又确认存在损坏，系统可能撤销之前的 `+5` 归还奖励。
10. 只要仍有 `open/investigating` 的损坏报告，设备不可重新上架；待审核结束后，管理员才可决定修复后重新上架或在 `lost` 场景下直接退役设备。

### A.3 业务状态说明

| 状态 | 含义 |
|------|------|
| `pending` | 用户已提交预约，等待管理员审核 |
| `approved` | 管理员已通过预约，等待用户扫码取货 |
| `active` | 用户已扫码取货，借用周期进行中 |
| `overdue` | 超过应还日期仍未归还 |
| `lost_reported` | 已提交丢失报告，等待管理员确认；当前属于可恢复中间态 |
| `lost` | 管理员已确认设备真实丢失，借用单进入最终丢失状态 |
| `returned` | 用户已完成归还，系统已记录归还结果 |
| `cancelled` | 用户主动取消或系统自动取消预约 |
| `suspended` | 设备因维修等原因导致预约被临时挂起 |

> `maintenance` 是 **资产状态**，不是借用单状态；它表示设备因损坏审核或维修暂时不可再借。

### A.4 信用分规则

1. 用户初始信用分为 **100 分**。
2. 系统将信用分限制在 **0 到 200 分**之间，不能低于 0，也不能超过 200。
3. 正常完成归还后，系统奖励 **+5 分**。
4. 逾期扣分采用三节点机制：
   - 逾期第 1 天：`-10`
   - 逾期满 7 天：额外 `-15`
   - 逾期满 30 天：额外 `-25`
   - 逾期累计扣分上限为 **50 分**
5. 普通损坏扣分规则：
   - 轻微损坏：`-5`
   - 中度损坏：`-15`
   - 严重损坏：`-30`
6. 设备丢失扣分规则分三种场景：
   - **系统自动判定丢失**：逾期 30 天后自动生成丢失报告，**不再额外扣分**，因为逾期系统已累计扣满 50 分
   - **用户主动上报丢失**：`-30`
   - **管理员确认恶意调包或严重丢失**：`-50`

### A.5 逾期处理规则

1. 一旦设备超过应还日期仍未归还，系统会将借用状态从 `active` 自动改为 `overdue`。
2. 第一次进入逾期时，系统自动发送逾期提醒通知，并扣减 10 分信用分。
3. 当逾期达到 7 天时，系统再次发送严重逾期通知，并额外扣减 15 分。
4. 当逾期达到 30 天时，系统会：
   - 再额外扣减 25 分
   - 自动生成一条 `lost`（丢失）损坏报告
   - 通知用户该设备已被系统判定为丢失
5. 即使逾期后最终完成归还，之前产生的逾期扣分仍然有效，不会自动恢复。

### A.6 赔偿规则

1. 对于已录入购置价的设备，系统使用以下公式估算赔偿金额：  
   **赔偿金额 = 购置价 × 折旧率 × 损坏系数**
2. 折旧率按设备使用年限计算：
   - 1 年内：`100%`
   - 1 到 3 年：`80%`
   - 3 到 5 年：`50%`
   - 5 年以上：`20%`
3. 损坏系数为：
   - 轻微损坏：`0.2`
   - 中度损坏：`0.5`
   - 严重损坏：`1.0`
4. 丢失场景的赔偿规则特殊处理：
   - 用户主动上报丢失：按**折旧后价格**赔偿
   - 系统自动判定丢失或管理员确认丢失：按**设备全价**赔偿，不计折旧
5. 如果设备没有录入购置价格，系统不会自动给出赔偿金额，需由管理员人工核验后线下确认。
6. 赔偿单由损坏报告自动同步生成，管理员可在 Web 端更新签字金额、已付金额和结案状态，系统会向移动端同步通知。
7. 手机端借用记录对赔偿流程采用简化业务状态：
   - 赔偿未结案：显示 `等待赔款`
   - 赔偿单为 `paid` 或 `waived`：显示 `已完成`

### A.7 可直接用于答辩的总结表述

> UniGear 采用“先申请、后审批、扫码取货、拍照归还”的闭环借用流程。
> 当损坏报告进入处理中状态时，系统会立即把设备切换到 `maintenance`，并把未来预约挂起为 `suspended`，待设备修复后再恢复或取消，从而避免“坏设备继续被借出”。
> 对于“设备丢失”场景，UniGear 采用可恢复的 `lost_reported` 中间态：管理员最终确认前，用户既可以把报失改回普通损坏，也可以直接撤销未处理报修单，系统会自动回到正确的归还阶段，而不会错误地重新进入扫码取货流程。
> 系统通过信用分与赔偿双轨机制约束用户行为：正常归还可加分，逾期与损坏会分级扣分；赔偿金额则结合设备购置价、使用年限和损坏程度进行估算，并允许管理员在线维护签字、付款与结案进度。
