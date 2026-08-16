# dynvideo-search

当前版本：v0.1.0

一个用于 Bilibili UP 主空间动态页的 Tampermonkey 脚本，通过**官方 API（WBI 签名）**自动分页拉取动态内容，提取带有「动态视频」标识的原创视频 BV 号与标题。

## 项目定位

- 适用场景：Bilibili 个人空间动态页抓取
- 目标：自动发现并提取「动态视频」内容
- 输出：JSON 数组，包含 `bv` 和 `title`
- 使用方式：浏览器脚本 + Tampermonkey

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
- UID 手动输入（默认从当前页面 URL 自动解析）
- 启动 / 暂停 / 继续控制
- 实时展示当前已提取结果
- 复制 JSON 到剪贴板 / 导出 JSON 文件
- 浮窗可收起 / 展开，缩略为标题栏窄条

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
5. 点击右下角浮窗中的「启动」按钮

## 使用说明

1. 打开任意 UP 主空间页（如 `https://space.bilibili.com/2/dynamic`），UID 会自动填入
2. 也可手动修改 UID 后点击「启动」
3. 采集完成后复制或导出 JSON

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

## 许可证

MIT
