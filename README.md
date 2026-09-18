<div align="center">

# dynvideo-search

**Bilibili 动态视频 BV 号提取器** · Tampermonkey 用户脚本

[![CI](https://github.com/helltractor/dynvideo-search/actions/workflows/ci.yml/badge.svg)](https://github.com/helltractor/dynvideo-search/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/helltractor/dynvideo-search?include_prereleases&sort=semver)](https://github.com/helltractor/dynvideo-search/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于 Bilibili 官方 API（WBI 签名）自动分页拉取 UP 主空间动态，
提取带「动态视频」标识的原创视频 BV 号与标题，
浮窗实时展示，支持跳转 / 筛选 / 复制 / JSON 导出。

</div>

## 功能特性

- 通过官方 API 分页拉取 UP 主全部动态（无需滚动页面，WBI 签名自动生成并缓存）
- 过滤转发动态，只保留原创视频；检测「动态视频」badge
- 按 BV 号去重，避免重复记录
- UID 默认从当前页面 URL 自动解析，也支持手动输入，回车即可启动
- 启动 / 暂停 / 继续控制，浮窗实时显示页码、本页新增与累计数量
- 结果列表实时刷新：每行显示序号、BV 号与标题，点击任意处在**新标签页**打开视频
- 结果支持按 BV 号 / 标题关键词筛选，头部徽标显示已提取数量
- 一键复制全部 BV 号 / 导出 JSON 文件
- 浮窗默认收起为纯图标圆钮，点击图标展开，B 站粉渐变主题

## 安装

### 方式一：从 Releases 安装（推荐）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 前往 [Releases](https://github.com/helltractor/dynvideo-search/releases/latest) 页面
3. 下载 `dynvideo-search.user.js`，拖入 Tampermonkey 管理面板安装（或使用「实用工具 → 导入」选择该文件）

### 方式二：从源码构建

```bash
git clone https://github.com/helltractor/dynvideo-search.git
cd dynvideo-search
npm install
npm run build
# 产物：dist/dynvideo-search.user.js
```

构建完成后按方式一第 3 步安装 `dist/dynvideo-search.user.js` 即可。

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

## 配置

常量集中在 `src/config.ts`，修改后需重新构建：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `PAGE_DELAY` | `800` | 每页请求间隔（毫秒），调大可降低风控概率 |
| `MAX_PAGES` | `200` | 最大抓取页数，防止意外死循环 |
| `REQUIRE_BADGE` | `true` | 是否严格要求「动态视频」badge |
| `RISK_RETRY` / `NETWORK_RETRY` | `3` / `2` | 风控（-352）与网络瞬时错误的重试次数 |
| `WBI_CACHE_TTL` | 12 小时 | WBI 密钥缓存时长 |
| `DEBUG_LOG` | `false` | 是否输出调试日志（分页进度、逐条提取） |

## 常见问题

### 提示「请先登录 B 站账号」？

本脚本依赖 WBI 签名，需要浏览器已登录 B 站（任意页面登录即可），登录后刷新空间页再试。

### 提示「触发风控（-352）」？

采集频率过高。脚本默认每页间隔 800ms 并自动退避重试；若仍触发，可在 `src/config.ts` 中调大 `PAGE_DELAY` 后重新构建。

### 没有提取到动态视频？

确认该 UP 主确实发布过带「动态视频」标识的内容；或某些历史动态的 badge 字段缺失导致被过滤（`REQUIRE_BADGE` 配置）。

### 是否有风控风险？

脚本仅读取公开动态列表接口，不执行任何写操作（不点赞、不评论、不关注），且请求间隔可配置，风险较低。请勿将 `PAGE_DELAY` 调得过小。

## 项目结构

```
src/
  main.ts        脚本入口：开启调试日志、解析 UID 并挂载浮窗
  panel.ts       浮窗 UI：状态、结果列表（链接跳转）、筛选、复制 / 导出
  ui/
    styles.ts    浮窗全局样式（注入 <style>，dvs- 前缀防冲突）
    dom.ts       DOM 工具：创建元素 / 视频详情页链接
  collector.ts   采集状态机：分页、暂停 / 继续、重试、去重
  api.ts         动态 feed 接口封装与错误码文案
  wbi.ts         WBI 签名：mixinKey 计算与缓存
  config.ts      常量配置：请求间隔、最大页数、重试次数等
  shared/
    logger.ts    统一日志：[dynvideo-search] 前缀，调试日志门控 + 失败路径告警
  types.ts       接口响应与结果类型定义
  utils/
    uid.ts       UP 主 UID 提取与校验（单一来源）
test/
  functional.test.ts   核心逻辑功能测试（WBI 签名 / UID 解析 / 去重等）
docs/
  tech-decision.md     技术选型说明
  refactor-audit.md    重构前审计报告（refactor/v0.1.x 分支）
```

运行流程：`main.ts` 解析 URL 中的 UID → `panel.ts (+ui/)` 浮窗 UI → `collector.ts` 采集状态机（分页 / 暂停 / 重试 / 去重）→ `api.ts` 动态 feed 请求 → `wbi.ts` WBI 签名，采集进度经 `onStatus` / `onProgress` 回调刷新浮窗。

## 开发

技术栈：TypeScript（strict）+ Vite + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey)，运行时零依赖（MD5 等依赖全部内联打包）。

> 选型过程与备选方案对比见 [docs/tech-decision.md](docs/tech-decision.md)。

要求 Node.js ≥ 20。

```bash
npm run dev        # Vite 开发模式（HMR）
npm run typecheck  # TypeScript 类型检查
npm test           # 构建并于 Node 运行功能测试
npm run build      # 构建 userscript 产物
```

## 贡献

欢迎提交 [Issue](https://github.com/helltractor/dynvideo-search/issues) 与 Pull Request：

1. Fork 本仓库并创建特性分支（`feat/xxx`）
2. 确保 `npm run typecheck`、`npm test`、`npm run build` 全部通过
3. 更新 [CHANGELOG.md](CHANGELOG.md) 的 Unreleased 段落并提交

## 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

> 免责声明：本项目与 Bilibili 官方无关，仅供个人学习研究使用，请遵守 Bilibili 用户协议与相关法律法规。
