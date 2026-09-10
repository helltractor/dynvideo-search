# dynvideo-search

当前版本：v0.1.1

一个用于 Bilibili UP 主空间动态页的 Tampermonkey 脚本，通过**官方 API（WBI 签名）**自动分页拉取动态内容，提取带有「动态视频」标识的原创视频 BV 号与标题。

## 项目定位

- 适用场景：Bilibili 个人空间动态页抓取
- 目标：自动发现并提取「动态视频」内容
- 输出：浮窗实时列表（点击 BV 号或标题直接跳转视频页），可复制 BV 列表 / 导出 JSON
- 使用方式：浏览器脚本 + Tampermonkey

## 运行流程

```
main.ts          panel.ts              collector.ts          api.ts          wbi.ts
解析 URL 中的 UID → 浮窗 UI（输入/状态/结果列表） → 采集状态机（分页/暂停/重试/去重） → 动态 feed 请求 → WBI 签名
                        ↑                      │
                        └── onStatus / onProgress 回调 ──┘
```

1. `main.ts` 从当前 URL 解析 UP 主 UID，创建采集器与浮窗并挂载到页面；
2. 点击「启动」后，`collector` 分页调用 `api.fetchSpaceFeed`，每页间隔 `PAGE_DELAY`，期间可暂停 / 继续；
3. `api` 通过 `wbi.signParams` 生成带 `wts` / `w_rid` 的签名参数，mixinKey 缓存 12 小时；
4. 每页数据经类型过滤、转发过滤、badge 校验、BV 去重后写入内存，并通过回调刷新浮窗状态与结果列表；
5. 采集结束后可复制 BV 列表或导出 JSON 文件。

## 目录结构

```
src/
  main.ts        脚本入口：解析 UID 并挂载浮窗
  panel.ts       浮窗 UI：状态、结果列表（链接跳转）、筛选、复制 / 导出
  collector.ts   采集状态机：分页、暂停 / 继续、重试、去重
  api.ts         动态 feed 接口封装与错误码文案
  wbi.ts         WBI 签名：mixinKey 计算与缓存
  config.ts      常量配置：请求间隔、最大页数、重试次数、缓存时长、接口地址
  types.ts       接口响应与结果类型定义
  utils/uid.ts   从当前 URL 解析 UP 主 UID
docs/
  tech-decision.md  技术选型说明
```

## 技术栈（v0.1.0 起）

- **数据源**：Bilibili 官方接口 `x/polymer/web-dynamic/v1/feed/space`（WBI 签名）
- **语言**：TypeScript（strict）
- **构建**：Vite + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)
- **运行时依赖**：无（MD5 等依赖全部内联打包）

> 选型过程与备选方案对比见 [docs/tech-decision.md](docs/tech-decision.md)。

## 功能特性

- 通过官方 API 分页拉取 UP 主全部动态（无需滚动页面）
- 过滤转发动态，只保留原创视频
- 检测「动态视频」badge
- 按 BV 号去重，避免重复记录
- UID 手动输入（默认从当前页面 URL 自动解析，回车即可启动）
- 启动 / 暂停 / 继续控制
- 结果列表实时刷新：每行显示序号、BV 号与标题，**点击任意一处在新标签页打开视频**
- 结果列表支持按 BV 号 / 标题关键词筛选，头部徽标显示已提取数量
- 一键复制全部 BV 号 / 导出 JSON 文件
- 浮窗默认收起为纯图标圆钮（不展示文字），点击图标展开，支持随时收起，B 站粉渐变主题

## 安装方式

### 方式一：构建安装（推荐）

```bash
npm install
npm run build
# 产物：dist/dynvideo-search.user.js
```

然后打开 Tampermonkey 管理面板，将 `dist/dynvideo-search.user.js` 拖入安装，或使用「实用工具 → 导入」选择该文件。

### 方式二：直接安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开 `dist/dynvideo-search.user.js`（构建后生成）
3. 复制全部代码到新建的用户脚本中
4. 打开 Bilibili 空间动态页
5. 点击右下角图标按钮展开浮窗，再点击「启动」

## 使用说明

1. 打开任意 UP 主空间页（如 `https://space.bilibili.com/2/dynamic`），右下角会出现一个 📡 图标按钮（浮窗默认收起，不遮挡页面）
2. 点击图标展开面板，UID 会自动填入
3. 也可手动修改 UID 后点击「启动」（重新启动会清空上一轮结果）
4. 采集过程中浮窗实时显示页码、本页新增与累计数量，结果列表即时更新
5. 点击列表中的 BV 号或标题即可在新标签页打开对应视频；条目较多时可用筛选框按 BV 号 / 标题过滤
6. 采集完成后点击「复制 BV」复制全部 BV 号（每行一个），或点击「导出 JSON」保存文件

导出的 JSON 结构：

```json
[
  {
    "bv": "BV1234567890ab",
    "title": "视频标题"
  }
]
```

## 常见问题

### 1. 提示「请先登录 B 站账号」
本脚本依赖 WBI 签名，需要浏览器已登录 B 站（任意页面登录即可）。登录后刷新空间页再试。

### 2. 提示「触发风控（-352）」
采集频率过高。脚本默认每页间隔 800ms 并自动退避重试 3 次；若仍触发，可在 `src/config.ts` 中调大 `PAGE_DELAY` 后重新构建。

### 3. 没有提取到动态视频
确认该 UP 主确实发布过带「动态视频」标识的内容；或某些历史动态的 badge 字段缺失导致被过滤（`REQUIRE_BADGE` 配置）。

### 4. 是否有风控风险
脚本仅读取公开动态列表接口，不执行任何写操作（不点赞、不评论、不关注），且请求间隔可配置，风险较低。请勿将 `PAGE_DELAY` 调得过小。

## 开发命令

```bash
npm run dev        # Vite 开发模式（HMR）
npm run typecheck  # TypeScript 类型检查
npm run build      # 构建 userscript 产物
```

## 许可证

MIT
