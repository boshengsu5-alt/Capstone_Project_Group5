# Bug Tracking List

> [!NOTE]
> A CSV version of this list is available at `docs/qa/Bug_Tracking_List.csv` for better Excel compatibility.

| ID | Location | Description | Reporter | Fixer | Status | Note |
|:---|:---|:---|:---|:---|:---|:---|
| 001 | BookingForm | 借用日期可以选过去的时间 | Cunjun | Bosheng | Fixed | 已添加 `minDate` 校验 |
| 002 | Auth/Register | 缺少邮箱格式正则校验 | Cunjun | Bosheng | Fixed | Day 9 修复，登录/注册页均已加 emailRegex |
| 003 | BookingService | 创建预约存在潜在并发竞争风险 | Bosheng | Bosheng | Fixed | RPC `activate_booking` 使用 FOR UPDATE 行锁 |
| 004 | AssetDetail | 状态标签颜色硬编码，未统一使用主题色 | Yuxuan | - | Pending | 建议使用 `theme.colors.success` |
| 005 | Auth/Login | 缺少"忘记密码"重置功能 | Cunjun | - | Deferred | 展会优先级低，延至后续迭代 |
| 006 | CalendarView | 无法直接清除已选日期范围 | Bosheng | - | Pending | 只能通过重选来覆盖 |
| 007 | Web/Dashboard | recharts 依赖未安装，TS 编译失败 | Bosheng | Bosheng | Fixed | Day 9 修复，npm install recharts |
| 008 | Web/Dashboard | 隐式 any 类型参数导致编译警告 | Bosheng | Bosheng | Fixed | Day 9 修复，Legend formatter 加类型注解 |
| 009 | Web/Layout | Dashboard 无路由保护，学生可访问管理后台 | Bosheng | Bosheng | Fixed | Day 9 修复，layout.tsx 加 auth + admin 校验 |
| 010 | Web/Returns | returns/page.tsx 残留 mock 数据 (mock-2) | Bosheng | Bosheng | Fixed | Day 9 修复，改用真实状态筛选 |
| 011 | Web/Damage | 管理员确认损坏未触发信用分扣减 | Bosheng | Bosheng | Fixed | Day 9 修复，resolved 时调用 update_credit_score RPC |
| 012 | Web/Bookings | BookingTable 缺少 overdue/cancelled 状态标签 | Bosheng | Bosheng | Fixed | Day 9 修复，补充两种状态颜色 |
| 013 | Web/Dashboard | Dashboard 缺少 KPI 统计卡片 | Bosheng | Bosheng | Fixed | Day 9 修复，新增 4 个计数卡 |
| 014 | Mobile/BookingForm | 提交前缺少日期有效性前端校验 | Bosheng | Bosheng | Fixed | Day 9 修复，补充空日期和倒序检测 |
| 015 | Web/API | `/api/assets` 路由无鉴权，任何人可增删改查资产 (Critical) | Bosheng | Bosheng | Fixed | Day 3 交叉测试发现。新增 `serverAuth.ts` + `authFetch.ts`，API 路由验证 admin token |
| 016 | Web/Middleware | 无 middleware.ts，dashboard 路由保护完全依赖客户端 JS | Bosheng | Bosheng | Fixed | Day 3 交叉测试发现。新增 `middleware.ts`，cookie 机制拦截未登录访问 |
| 017 | Web/Login | student 账号可成功登录 Web 端，只在 dashboard 层才被拦截 | Bosheng | Bosheng | Fixed | Day 3 交叉测试发现。login 页登录后立即检查 admin 角色，非 admin 显示错误 |
| | | | | | | |
