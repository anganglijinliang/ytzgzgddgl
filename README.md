# 安钢永通球墨铸铁管 - 订单管理系统

这是一个基于 React + TypeScript + Vite + Tailwind CSS 开发的现代订单管理系统。

## 功能特性

1.  **用户认证与权限管理**
    -   支持多角色登录：管理员 (admin)、录入员 (entry)、生产人员 (prod)、发运人员 (ship)
    -   基于角色的菜单和功能权限控制

2.  **订单管理**
    -   支持主从订单结构（一个主订单包含多个不同规格、级别的子订单）
    -   智能记忆输入（规格、级别、内衬等字段自动补全）
    -   支持二维码生成，客户扫码即可追踪进度
    -   支持 Excel/PDF 导出

3.  **生产跟踪**
    -   按班组（甲乙丙丁）、班次（白中夜）记录生产
    -   实时计算完成率，自动更新订单状态
    -   直观的进度条展示

4.  **发运管理**
    -   支持汽运/火车发运
    -   库存校验（发运数不能超过生产数）
    -   记录车辆信息和发运单号

5.  **报表查询**
    -   多维度筛选（日期、状态、关键词）
    -   数据可视化仪表盘
    -   一键导出报表

6.  **响应式设计**
    -   完美适配移动端和桌面端
    -   现代化 UI 界面

## 技术栈

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS, Lucide Icons
-   **State Management**: Zustand (Persist to LocalStorage)
-   **Charts**: Recharts
-   **Tools**: XLSX (Excel export), jsPDF (PDF export), qrcode.react
-   **Testing**: Vitest, React Testing Library

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 3. 运行测试

```bash
npm run test
```

### 4. 构建生产版本

```bash
npm run build
```

构建产物位于 `dist` 目录。

## 演示账号

| 角色 | 用户名 | 权限 |
| --- | --- | --- |
| 管理员 | admin | 所有权限 |
| 订单录入员 | entry | 订单录入、查看、报表 |
| 生产主管 | prod | 生产报工、查看、报表 |
| 发运主管 | ship | 发运管理、查看、报表 |

## 部署说明 (Netlify)

本项目已配置好适配 Netlify 的部署设置。

1.  将代码推送到 GitHub/GitLab
2.  在 Netlify 创建新站点，关联仓库
3.  配置构建命令: `npm run build`
4.  配置发布目录: `dist`
5.  点击 Deploy

## 数据安全说明

当前版本为纯前端演示版，数据存储在浏览器 LocalStorage 中。
**生产环境建议**：
1.  对接后端 API (Java/Go/Node.js) 实现数据持久化到数据库 (MySQL/PostgreSQL)
2.  配置定时数据库备份任务
3.  启用 HTTPS 加密传输

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
