# BookMart Mini Program

Campus second-hand book marketplace mini program based on WeChat Mini Program + TDesign.

- 中文说明: [跳转到中文](#中文说明)
- English: [Jump to English](#english)

## 中文说明

### 1. 项目简介

`Book_Market_Mini` 是 BookMart 的微信小程序前端，定位为校园二手教材与学习资料交易平台。

当前版本是在 TDesign 零售模板基础上改造，核心场景已切换为校园书市：

- 二手书浏览、搜索、分类筛选
- 微信登录与用户资料维护
- 购物车、收藏、下单、订单取消
- 教材匹配（按高校 + 学年）
- 二手书发布（图片上传 + 审核记录）
- 资料区浏览（当前为前端内置演示数据）
- 反馈提交（支持图片与定位）

### 2. 页面与功能

#### Tab 页面

| 路由 | 说明 |
| --- | --- |
| `pages/books/index` | 二手书首页，含搜索、分类、智能推荐、热度榜单 |
| `pages/material/index` | 资料页，支持分类筛选与关键词搜索 |
| `pages/books/cart/index` | 购物车与结算 |
| `pages/books/me/index` | 个人中心、登录、功能入口聚合 |

#### 业务页面

| 路由 | 说明 |
| --- | --- |
| `pages/books/detail` | 图书详情、收藏、加购、立即下单 |
| `pages/books/profile/index` | 个人资料编辑（学校、学年、专业、课程等） |
| `pages/books/wallet/index` | 钱包页面（本地存储演示） |
| `pages/books/feedback/index` | 反馈提交（图片/位置/历史记录） |
| `pages/books/favorites/index` | 我的收藏 |
| `pages/books/orders/index` | 我的订单、取消订单 |
| `pages/books/match/index` | 教材匹配（调用 `/api/book-plan`） |
| `pages/books/sell/index` | 二手书发布与审核记录 |

### 3. 技术栈

- WeChat Mini Program (JavaScript + WXML + WXSS)
- [TDesign Miniprogram](https://github.com/Tencent/tdesign-miniprogram) `1.9.5`
- 代码规范: ESLint + Prettier + Husky + lint-staged
- 网络请求: 基于 `wx.request` 与 `wx.uploadFile` 的封装（`services/books.js`）

### 4. 目录结构

```text
Book_Market_Mini/
|- app.js
|- app.json
|- custom-tab-bar/          # 自定义 TabBar
|- pages/
|  |- books/                # 二手书主业务
|  |- material/             # 资料页
|  |- goods/home/order/...  # 模板遗留模块（当前主流程未启用）
|- services/
|  |- books.js              # 当前主业务 API 封装
|  |- ...                   # 模板服务模块
|- model/                   # 模板 mock 数据
|- components/              # 公共组件
|- style/                   # 公共样式
|- config/                  # 工程配置（含 eslint 检查脚本）
|- project.config.json      # 微信开发者工具项目配置
```

### 5. 快速启动

#### 环境准备

- Node.js 16+（建议 LTS）
- npm
- 微信开发者工具（最新稳定版）

#### 安装与运行

```bash
npm install
```

然后在微信开发者工具中：

1. 打开本项目目录 `Book_Market_Mini`
2. 执行“工具 -> 构建 npm”
3. 编译并预览

### 6. 后端对接说明

主业务 API 在 `services/books.js` 中定义，默认生产域名：

```js
const PROD_API_BASE = 'https://api.example.com';
```

对接自有后端时，建议按以下步骤：

1. 修改 `PROD_API_BASE` 为你的 HTTPS 域名
2. 在微信公众平台配置合法域名（request/upload）
3. 保持接口契约兼容（字段命名与返回结构）

已使用的核心接口包含：

- `POST /api/wx/login`
- `GET /api/me`
- `PUT /api/me`
- `GET /api/books`
- `GET /api/books/:id`
- `GET /api/book-plan`
- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/:bookId`
- `GET /api/favorites`
- `POST /api/favorites/:bookId`
- `DELETE /api/favorites/:bookId`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/orders/:id/cancel`
- `POST /api/sell-requests`
- `GET /api/sell-requests/mine`
- `POST /api/uploads/sell-image` (upload file)

### 7. 开发命令

```bash
npm run lint
npm run check
```

### 8. 说明与边界

- `pages/material/index` 当前使用前端内置示例数据，不走后端。
- `pages/books/wallet/index` 与 `pages/books/feedback/index` 目前是本地存储逻辑（`wx.setStorageSync`）。
- 工程内保留了部分 TDesign 模板页面与服务模块，可按需要逐步清理或复用。

### 9. License

本项目仓库内附带 `LICENSE` 文件，当前为 MIT License。

---

## English

### 1. Overview

`Book_Market_Mini` is the WeChat Mini Program frontend of BookMart, focused on campus second-hand books and study-material trading.

This project is evolved from the TDesign retail starter, with a rewritten business flow for campus scenarios:

- Browse/search/filter second-hand books
- WeChat login and profile management
- Cart, favorites, checkout, order cancellation
- Textbook matching by university and school year
- Sell-request submission with image upload and review status
- Material section (currently local demo data)
- Feedback form with image and location support

### 2. Pages and Features

#### Tab Pages

| Route | Description |
| --- | --- |
| `pages/books/index` | Home feed with search, categories, recommendation, hot ranking |
| `pages/material/index` | Materials page with category and keyword filtering |
| `pages/books/cart/index` | Cart and checkout |
| `pages/books/me/index` | User center, login, and feature navigation |

#### Business Pages

| Route | Description |
| --- | --- |
| `pages/books/detail` | Book details, favorite, add-to-cart, buy now |
| `pages/books/profile/index` | Profile editor (school, year, major, courses, etc.) |
| `pages/books/wallet/index` | Wallet demo (local storage) |
| `pages/books/feedback/index` | Feedback form (image/location/history) |
| `pages/books/favorites/index` | Favorites list |
| `pages/books/orders/index` | Orders list and cancellation |
| `pages/books/match/index` | Textbook matching (`/api/book-plan`) |
| `pages/books/sell/index` | Sell request submission and review records |

### 3. Tech Stack

- WeChat Mini Program (JavaScript + WXML + WXSS)
- [TDesign Miniprogram](https://github.com/Tencent/tdesign-miniprogram) `1.9.5`
- ESLint + Prettier + Husky + lint-staged
- API layer built on `wx.request` and `wx.uploadFile` (`services/books.js`)

### 4. Project Structure

```text
Book_Market_Mini/
|- app.js
|- app.json
|- custom-tab-bar/
|- pages/
|  |- books/
|  |- material/
|  |- goods/home/order/...   # legacy template modules (not in active main flow)
|- services/
|  |- books.js               # main API module
|- model/                    # legacy mock data from template
|- components/
|- style/
|- config/
|- project.config.json
```

### 5. Quick Start

Prerequisites:

- Node.js 16+ (LTS recommended)
- npm
- WeChat DevTools

Install dependencies:

```bash
npm install
```

Then in WeChat DevTools:

1. Open this project folder (`Book_Market_Mini`)
2. Run `Tools -> Build npm`
3. Compile and preview

### 6. Backend Integration

Main API config is in `services/books.js`:

```js
const PROD_API_BASE = 'https://api.example.com';
```

If you deploy your own backend:

1. Replace `PROD_API_BASE` with your HTTPS domain
2. Add request/upload domains in WeChat Mini Program admin
3. Keep API response contracts compatible with current frontend expectations

Core APIs in use include:

- `POST /api/wx/login`
- `GET /api/me`
- `PUT /api/me`
- `GET /api/books`
- `GET /api/books/:id`
- `GET /api/book-plan`
- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/:bookId`
- `GET /api/favorites`
- `POST /api/favorites/:bookId`
- `DELETE /api/favorites/:bookId`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/orders/:id/cancel`
- `POST /api/sell-requests`
- `GET /api/sell-requests/mine`
- `POST /api/uploads/sell-image`

### 7. Scripts

```bash
npm run lint
npm run check
```

### 8. Notes

- `pages/material/index` currently uses local in-memory demo data.
- `pages/books/wallet/index` and `pages/books/feedback/index` are local-storage-based features.
- Some original TDesign template modules are still present and can be cleaned or reused progressively.

### 9. License

See `LICENSE` in this repository (MIT).
