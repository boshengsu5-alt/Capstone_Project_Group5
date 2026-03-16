# Bug Tracking List

> [!NOTE]
> A CSV version of this list is available at [docs/qa/Bug_Tracking_List.csv](file:///c:/Users/86131/.gemini/antigravity/scratch/Capstone_Project_Group5/docs/qa/Bug_Tracking_List.csv) for better Excel compatibility.

| ID | Location | Description | Reporter | Fixer | Status | Note |
|:---|:---|:---|:---|:---|:---|:---|
| 001 | BookingForm | 借用日期可以选过去的时间 | Cunjun | Antigravity | Fixed | 已添加 `minDate` 校验 |
| 002 | Auth/Register | 缺少邮箱格式正则校验 | Cunjun | - | Pending | 目前仅检查空字符串 |
| 003 | BookingService | 创建预约存在潜在并发竞争风险 | Antigravity | - | Pending | 检查与插入非原子操作 |
| 004 | AssetDetail | 状态标签颜色硬编码，未统一使用主题色 | Antigravity | - | Pending | 建议使用 `theme.colors.success` |
| 005 | Auth/Login | 缺少“忘记密码”重置功能 | Cunjun | - | Pending | 基础功能缺失 |
| 006 | CalendarView | 无法直接清除已选日期范围 | Cunjun | - | Pending | 只能通过重选来覆盖 |
| | | | | | | |
