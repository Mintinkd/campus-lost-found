# 校园失物招领智能平台

基于 AI 图像识别与自然语言语义搜索的校园失物招领系统，支持智能匹配、认领闭环流程和管理员后台审核。

## 功能特性

- **AI 图像识别** — 上传照片自动识别物品类别（TensorFlow.js / 华为云 SDK）
- **自然语言语义搜索** — 输入描述自动解析类别、地点、时间维度，多维度加权匹配
- **认领闭环流程** — 认领申请 → 失主确认 → 归还确认，联系方式加密传输
- **管理员后台** — RBAC 权限体系，内容审核/软删除/用户封禁/操作日志
- **匹配通知推送** — 新物品上报后自动匹配历史搜索，邮件/Webhook 通知

## 项目结构

```
├── server/              # 付费方案后端（华为云 MySQL + 微信小程序）
├── server-free/         # 免费方案后端（PostgreSQL/SQLite + TensorFlow.js + 邮箱登录）
├── web/                 # Web 前端（纯静态 HTML/JS）
│   ├── index.html       # 主应用
│   ├── admin.html       # 管理后台
│   ├── api.js           # API 请求层（自动唤醒/超时/重试）
│   ├── app.js           # 页面路由与渲染
│   └── config-loader.js # 配置加载器
├── miniprogram/         # 微信小程序前端（付费方案）
├── deploy/              # 华为云部署配置
└── .opencode/specs/     # SDD 规范文档（spec.md + design.md）
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
cd server-free
cp .env.example .env
npm install
npm run dev
```

访问 http://localhost:3000 即可使用。

默认使用 SQLite，无需额外配置数据库。

### 生产部署（免费方案）

#### 后端 — Render

1. Fork 本仓库
2. 在 [Render](https://render.com) 创建 Web Service，连接仓库
3. Root Directory 设为 `server-free`
4. Build Command: `npm install && npm run build`
5. Start Command: `node src/app.js`
6. 配置环境变量（见下方）

#### 数据库 — Neon PostgreSQL

1. 在 [Neon](https://neon.tech) 创建数据库
2. 获取连接信息填入 Render 环境变量

#### 前端 — Cloudflare Pages

1. 在 Cloudflare Pages 创建项目，连接仓库
2. Build Directory 设为 `web`
3. Build Command 留空（纯静态）
4. 在 `web/index.html` 中确认 `API_BASE` 指向 Render 后端地址

#### 图片存储 — Cloudinary（推荐）

1. 在 [Cloudinary](https://cloudinary.com) 注册获取 `CLOUDINARY_URL`
2. 设置到 Render 环境变量

### 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `DB_DIALECT` | 是 | 数据库类型 | `sqlite` |
| `DB_HOST` | PG必填 | PostgreSQL 主机 | - |
| `DB_PORT` | PG必填 | PostgreSQL 端口 | `5432` |
| `DB_NAME` | PG必填 | 数据库名 | `campus_lost_found` |
| `DB_USER` | PG必填 | 数据库用户 | - |
| `DB_PASS` | PG必填 | 数据库密码 | - |
| `DB_SSL` | PG必填 | 启用 SSL | `true` |
| `JWT_SECRET` | **生产必填** | JWT 签名密钥 | `dev_secret_change_me` |
| `ENCRYPTION_KEY` | **生产必填** | AES-256 加密密钥（32位hex） | 默认不安全值 |
| `ENCRYPTION_IV` | **生产必填** | AES 加密 IV（16位hex） | 默认不安全值 |
| `CLOUDINARY_URL` | 否 | Cloudinary 连接URL | - |
| `SMTP_HOST` | 否 | 邮件推送 SMTP 主机 | - |
| `SMTP_PORT` | 否 | SMTP 端口 | `587` |
| `SMTP_USER` | 否 | SMTP 用户名 | - |
| `SMTP_PASS` | 否 | SMTP 密码 | - |
| `ADMIN_EMAIL` | 否 | 管理员邮箱 | `admin@campus.edu` |
| `ADMIN_PASSWORD` | 否 | 管理员密码 | `admin123456` |
| `CORS_ORIGIN` | 否 | CORS 允许源 | `*` |

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 邮箱注册 |
| POST | `/api/v1/auth/login` | 邮箱登录 |
| GET | `/api/v1/auth/profile` | 获取个人信息 |

### 物品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/items` | 物品列表（公开） |
| POST | `/api/v1/items` | 上报拾物（需登录） |
| GET | `/api/v1/items/:id` | 物品详情 |
| GET | `/api/v1/items/categories` | 类别列表 |
| GET | `/api/v1/items/mine` | 我上报的物品 |

### 搜索与认领

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/search` | 语义搜索 |
| POST | `/api/v1/claims` | 提交认领 |
| PUT | `/api/v1/claims/:id/confirm` | 确认认领 |
| PUT | `/api/v1/claims/:id/reject` | 拒绝认领 |
| PUT | `/api/v1/claims/:id/return` | 确认归还 |

### 管理后台

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/admin/dashboard` | 任意管理员 | 仪表盘统计 |
| GET | `/api/v1/admin/items` | `content:view` | 内容列表 |
| PUT | `/api/v1/admin/items/:id/hide` | `content:hide` | 隐藏内容 |
| PUT | `/api/v1/admin/items/:id/approve` | `content:hide` | 恢复内容 |
| DELETE | `/api/v1/admin/items/:id/soft` | `content:delete` | 软删除 |
| DELETE | `/api/v1/admin/items/:id/hard` | `content:delete` | 硬删除 |
| PUT | `/api/v1/admin/items/:id/restore` | `content:delete` | 还原 |
| GET | `/api/v1/admin/users` | `user:view` | 用户列表 |
| PUT | `/api/v1/admin/users/:id/ban` | `user:ban` | 封禁用户 |
| PUT | `/api/v1/admin/users/:id/unban` | `user:ban` | 解封用户 |
| PUT | `/api/v1/admin/users/:id/role` | `role:manage` | 分配角色 |
| GET/POST/PUT/DELETE | `/api/v1/admin/roles` | `role:manage` | 角色管理 |
| GET | `/api/v1/admin/logs` | `admin:log` | 操作日志 |

## RBAC 权限体系

| 角色 | 权限 |
|------|------|
| `super_admin` | 全部权限 |
| `admin` | 内容查看/隐藏/删除、用户查看、日志查看 |
| `moderator` | 内容查看/隐藏、用户查看 |

权限码：`content:view` | `content:delete` | `content:hide` | `user:view` | `user:ban` | `role:manage` | `admin:log`

## 技术栈

### 免费方案

| 层 | 技术 |
|----|------|
| 前端 | 纯 HTML/JS（无框架） |
| 后端 | Express.js + Sequelize |
| 数据库 | Neon PostgreSQL（生产）/ SQLite（开发） |
| 图像识别 | TensorFlow.js + MobileNet |
| 图片存储 | Cloudinary（生产）/ 本地（开发） |
| 通知推送 | Nodemailer |
| 部署 | Render（后端）+ Cloudflare Pages（前端） |

### 付费方案

| 层 | 技术 |
|----|------|
| 前端 | 微信小程序 |
| 后端 | Express.js + Sequelize |
| 数据库 | 华为云 MySQL |
| 图像识别 | 华为云图像识别 SDK |
| 通知推送 | 华为云 SMN |
| 部署 | 华为云 CCE + Docker |

## 常见问题

### 页面一直"加载中"

1. 打开 F12 控制台检查 `window.__APP_CONFIG__.API_BASE` 是否正确
2. 确认后端服务已启动：访问 `https://your-backend.onrender.com/api/v1/health`
3. Render 免费实例会休眠，首次访问需等待 30-60 秒唤醒

### 图片上传后丢失

Render 临时文件系统在部署时清空。生产环境请配置 `CLOUDINARY_URL` 使用云存储。

### 数据库数据丢失

SQLite 文件存储在临时文件系统，部署后清空。生产环境请使用 Neon PostgreSQL。

### JWT_SECRET 警告

生产环境务必在 Render 环境变量中设置固定的 `JWT_SECRET`、`ENCRYPTION_KEY`、`ENCRYPTION_IV`，否则每次部署密钥变化会导致 token 失效和加密数据不可解密。

## 许可证

<<<<<<< HEAD
MIT
=======
MIT
>>>>>>> f48063cc012000bd36eb18c7d6edca478de7717b
