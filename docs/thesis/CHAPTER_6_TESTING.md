# 6 TESTING / 测试

**Responsible / 负责人: Hu Cunjun**
**Pages / 页数: 4**

---

### 6.1 Testing Strategy / 测试策略

The testing phase ensures that the "Campus Trade" platform is reliable, secure, and user-friendly. We adopted a multi-layered testing approach, combining manual functional testing with automated API testing.

测试阶段确保“Campus Trade”平台可靠、安全且用户友好。我们采用了多层测试方法，将手动功能测试与自动化 API 测试结合起来。

#### 6.1.1 Testing Approach / 测试方法
- **Manual Functional Testing**: End-to-end verification of user flows (registration, listing, trading) via the browser and mobile application.
- **API Testing (Postman)**: Verification of backend RESTful endpoints, ensuring correct status codes (200, 201, 400, 401, etc.) and JSON response structures.
- **Unit & Integration Logic Audit**: Static code analysis and manual logic verification during development to catch edge cases.

- **手动功能测试**：通过浏览器和移动应用程序对用户流程（注册、发布、交易）进行端到端验证。
- **API 测试 (Postman)**：验证后端 RESTful 接口，确保正确的状态码（200、201、400、401 等）和 JSON 响应结构。
- **单元与集成逻辑审计**：开发过程中的静态代码分析和手动逻辑验证，以发现边缘情况。

#### 6.1.2 Test Environment / 测试环境
- **Operating System**: Windows 11 / macOS Sequoia.
- **Backend**: Node.js v18.x, Express.js.
- **Database**: MySQL 8.0 / Supabase (PostgreSQL).
- **Browsers**: Google Chrome, Mozilla Firefox, Safari.
- **API Client**: Postman v10.x.

- **操作系统**：Windows 11 / macOS Sequoia。
- **后端**：Node.js v18.x, Express.js。
- **数据库**：MySQL 8.0 / Supabase (PostgreSQL)。
- **浏览器**：Google Chrome, Mozilla Firefox, Safari。
- **API 客户端**：Postman v10.x。

---

### 6.2 Functional Testing / 功能测试

Functional testing validates that each feature performs exactly as specified in the requirements.

功能测试验证每个功能是否完全按照需求说明运行。

#### 6.2.1 Test Case Table / 测试用例表格

| # | Test Case / 测试用例 | Steps / 步骤 | Expected / 预期结果 | Actual / 实际结果 | Pass/Fail |
|---|---------------------|-------------|--------------------|--------------------|-----------|
| 1 | User Registration / 用户注册 | Input valid student email and password; click Register. / 输入有效的学生邮箱和密码；点击注册。 | Account created; verification email sent. / 账号创建成功；发送验证邮件。 | As expected. / 符合预期。 | Pass |
| 2 | User Login / 用户登录 | Enter correct credentials via Login screen. / 在登录页面输入正确的凭据。 | Redirect to Home screen; Session/Token generated. / 跳转至主页；生成会话/Token。 | As expected. / 符合预期。 | Pass |
| 3 | Product Publishing / 发布商品 | Upload images and fill details; click Publish. / 上传图片并填写详细信息；点击发布。 | Product appears in the market list. / 商品出现在市场列表中。 | As expected. / 符合预期。 | Pass |
| 4 | Order Flow / 完整订单流程 | Select item -> Book dates -> Submit request. / 选择商品 -> 选择日期 -> 提交申请。 | Booking is marked as 'Pending' in history. / 借用状态在历史记录中标记为“待处理”。 | As expected. / 符合预期。 | Pass |
| 5 | Date Validation / 日期校验 | Try to select a past date for borrowing. / 尝试选择过去的借用日期。 | System prevents selection or returns error. / 系统阻止选择或返回错误信息。 | Prevented by minDate. / 已被 minDate 阻止。 | Pass |

---

### 6.3 Security Testing / 安全测试

Security is critical for a campus-based platform to protect user data and prevent malicious attacks.

对于校园平台，安全性对于保护用户数据和防止恶意攻击至关重要。

- **SQL Injection Prevention / SQL 注入防御**: We verified that all database queries are performed using parameterized queries or via an ORM/Client library that automatically escapes input. Attempts to inject SQL commands into login fields were successfully blocked.
- **XSS Sanitization / XSS 净化**: The platform uses `helmet` middleware and input sanitization to prevent Cross-Site Scripting. HTML tags in product descriptions are stripped or escaped before rendering.
- **Unauthorized Access / 未授权访问**: We tested API endpoints without providing a valid session or token. The server correctly returned `401 Unauthorized` or `403 Forbidden` statuses.
- **Rate Limiting / 限流**: Using `express-rate-limit`, we verified that making more than 100 requests within a short window triggers a `429 Too Many Requests` response, protecting the server from Brute Force and DoS attacks.

- **SQL 注入防御**：我们验证了所有数据库查询均使用参数化查询或通过自动转义输入的 ORM/库执行。向登录字段注入 SQL 命令的尝试被成功阻止。
- **XSS 净化**：平台使用 `helmet` 中间件和输入净化来防止跨站脚本攻击。商品描述中的 HTML 标签在渲染前被剥离或转义。
- **未授权访问**：我们在未提供有效会话或 Token 的情况下测试了 API 接口。服务器正确返回了 `401 Unauthorized` 或 `403 Forbidden` 状态。
- **限流**：使用 `express-rate-limit`，我们验证了在短时间内发送超过 100 次请求会触发 `429 Too Many Requests` 响应，从而保护服务器免受暴力破解和 DoS 攻击。

---

### 6.4 Usability Testing / 可用性测试

Usability testing ensures that the user interface is intuitive and accessible across different environments.

可用性测试确保用户界面直观，并能在不同环境下访问。

- **Multi-Browser Compatibility / 多浏览器兼容性**: We tested the web interface on Chrome, Firefox, and Safari. Layouts maintained consistency using modern CSS (Flexbox/Grid), and performance remained stable.
- **Internationalization (i18n) / 国际化**: Tested the language switching feature. All labels in the navigation and forms correctly translated between English and Chinese without breaking the UI layout.
- **Image Handling / 图片处理**: We tested uploading various image formats (JPG, PNG, WebP) and sizes. The system successfully used `sharp` to compress large photos, reducing page load times while maintaining visual clarity.
- **Error Feedback / 错误反馈**: Verified that user-friendly error messages appear when network issues occur or when forms are filled incorrectly, improving the overall UX.

- **多浏览器兼容性**：我们在 Chrome、Firefox 和 Safari 上测试了 Web 界面。布局使用现代 CSS (Flexbox/Grid) 保持了一致性，性能保持稳定。
- **国际化 (i18n)**：测试了语言切换功能。导航和表单中的所有标签在英文和中文之间正确转换，未破坏 UI 布局。
- **图片处理**：我们测试了上传各种图片格式（JPG、PNG、WebP）和大小。系统成功使用 `sharp` 压缩大图，在保持视觉清晰度的同时缩短了页面加载时间。
- **错误反馈**：验证了在发生网络问题或表单填写不正确时，会出现用户友好的错误提示，提升了整体用户体验。
