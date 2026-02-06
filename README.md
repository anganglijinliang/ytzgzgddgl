# 安钢永通球墨铸铁管 - 订单管理系统

这是一个基于 React + TypeScript + Vite + Tailwind CSS 开发的现代订单管理系统。

## 功能特性

1.  **用户认证与权限管理**
    -   支持多角色登录：管理员 (admin)、录入员 (entry)、生产人员 (prod)、发运人员 (ship)
    -   基于角色的菜单和功能权限控制

2.  **订单管理 (MES Core)**
    -   支持主从订单结构（一个主订单包含多个不同规格、级别的子订单）
    -   **智能记忆输入 (Smart Combobox)**：自动记忆历史产线/规格，支持一键删除，完美适配移动端/触屏
    -   支持二维码生成，客户扫码即可追踪进度
    -   支持 Excel/PDF 导出

3.  **生产跟踪 (Workshop Mode)**
    -   **车间触屏模式**：专为车间平板/工控机设计的大按钮交互界面
    -   **容错保护**：内置 ErrorBoundary 防止白屏，关键操作二次确认
    -   按班组（甲乙丙丁）、班次（白中夜）记录生产
    -   实时计算完成率，自动更新订单状态
    -   直观的进度条展示

4.  **发运管理**
    -   支持汽运/火车发运
    -   库存校验（发运数不能超过生产数）
    -   记录车辆信息和发运单号

5.  **企业级特性**
    -   **离线/弱网支持**：顶部状态栏实时显示网络连接状态
    -   **高性能存储**：Zustand 状态持久化优化，避免 LocalStorage 溢出
    -   **数据安全**：关键数据依赖后端 Neon 数据库，前端仅缓存必要配置
    -   **报表查询**：多维度筛选与数据可视化仪表盘

6.  **响应式设计**
    -   完美适配移动端 (Mobile)、平板 (Tablet) 和桌面端 (Desktop)
    -   现代化 UI 界面，Tailwind CSS 驱动

## 技术栈

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS, Lucide Icons
-   **State Management**: Zustand
-   **Backend**: Netlify Functions (Node.js)
-   **Database**: Neon Serverless PostgreSQL
-   **Charts**: Recharts
-   **Tools**: XLSX (Excel export), jsPDF (PDF export), qrcode.react
-   **Testing**: Vitest, React Testing Library

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并设置数据库连接字符串：

```env
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 4. 运行测试

```bash
npm run test
```

### 5. 构建生产版本

```bash
npm run build
```

构建产物位于 `dist` 目录。

## 演示账号

**通用密码**: `123456` (管理员备用: `admin123`)

| 角色 | 用户名 | 权限 |
| --- | --- | --- |
| 管理员 | admin | 所有权限 |
| 订单录入员 | entry | 订单录入、查看、报表 |
| 生产主管 | prod | 生产报工、查看、报表 |
| 发运主管 | ship | 发运管理、查看、报表 |
| 其它 | 数据库中任意用户 | 根据角色分配权限 |

## 部署说明 (Netlify)

本项目已配置好适配 Netlify 的部署设置。

1.  将代码推送到 GitHub/GitLab
2.  在 Netlify 创建新站点，关联仓库
3.  **重要**: 在 Site Settings > Environment Variables 中添加 `DATABASE_URL`
4.  点击 Deploy

## 数据架构说明

-   **混合模式**: 系统优先连接 Neon PostgreSQL 数据库。
-   **离线降级**: 如果数据库连接失败，系统会自动降级使用浏览器 LocalStorage 进行演示。
-   **初始化**: 管理员面板提供"初始化数据库"功能，可一键建立表结构。

## 目录结构

```
src/
├── components/     # 公共组件 (Layout, OrderForm)
├── pages/          # 页面组件 (Dashboard, Orders, Production...)
├── store/          # 状态管理 (Zustand store)
├── types/          # TypeScript 类型定义
├── test/           # 测试配置
└── main.tsx        # 入口文件
```
