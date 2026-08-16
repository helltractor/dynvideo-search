# 技术选型说明

> 决策日期：2026-08-16 ｜ 决策范围：v0.1.0 重构

## 项目目标

自动发现并提取 Bilibili UP 主空间动态页中的「动态视频」（原创视频动态）BV 号与标题，输出 JSON 数组。

## 选型结论

| 维度 | v0.0.1（旧） | v0.1.0（新） |
| --- | --- | --- |
| 数据来源 | 页面 DOM 滚动抓取 | 官方 API `x/polymer/web-dynamic/v1/feed/space` |
| 鉴权 | 无需 | WBI 签名（`wts` + `w_rid`） |
| 语言 | 原生 JavaScript（单文件） | TypeScript（严格模式） |
| 构建 | 手动复制粘贴 | Vite + vite-plugin-monkey 自动化构建 |
| 产物 | `main.js` | `dist/dynvideo-search.user.js` |
| 采集方式 | 模拟滚动（慢、依赖 DOM 结构） | 分页接口直取（快、结构稳定） |
| 交互 | 启动/暂停/复制 | 启动/暂停/复制 + UID 输入 + 导出文件 |

## 为什么选官方 API + WBI 签名

1. **稳定性**：DOM 版依赖 B 站页面结构（`.bili-dyn-item` 等选择器）和滚动加载行为，页面改版即失效；官方 API 的 JSON 结构稳定且带字段版本演进。
2. **速度**：DOM 版每页需滚动 + 等待 2~4 秒；API 版每页一次请求，可配置 800ms 间隔，采集效率提升一个数量级。
3. **数据完整**：API 直接提供 `type`、`modules.module_dynamic.orig`（转发标记）、`major.archive.badge`（「动态视频」badge）等结构化字段，过滤逻辑精确。
4. **WBI 签名**：2023 年后 B 站对动态接口强制要求 `w_rid` 签名。实现依据社区维护的
   [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md)
   规范：从 `/x/web-interface/nav` 获取 `wbi_img` 密钥 → 按混淆表重排取 mixinKey → 参数排序 + `wts` 时间戳 → MD5 签名。
5. **风险可控**：脚本运行在用户已登录的浏览器中、仅读动态列表、请求间隔可配置，并内置 -352 风控退避重试。

## 为什么选 TypeScript + Vite

1. **类型安全**：对 B 站 API 响应定义接口（`DynItem` / `DynArchive` 等），编译期发现字段拼写与结构错误。
2. **模块化**：`wbi.ts`（签名）/ `api.ts`（请求）/ `collector.ts`（采集状态机）/ `panel.ts`（UI）职责分离，便于测试与扩展。
3. **工程化构建**：vite-plugin-monkey 自动生成 `==UserScript==` 元数据头并打包 IIFE，`npm run build` 一键产出可安装脚本，附带 HMR 开发模式。
4. **依赖内联**：MD5 依赖（spark-md5）被打包进产物，运行时零外部依赖、零 CDN 请求。

## 备选方案（未采纳）

| 方案 | 未采纳原因 |
| --- | --- |
| 继续 DOM 滚动抓取 | 页面改版易失效、速度慢、选择器脆弱 |
| 浏览器扩展（MV3） | 安装门槛高，且 Tampermonkey 形态已覆盖需求 |
| Node.js CLI | 需手动提供 Cookie，无法利用页面登录态，实时性差 |

## 风险与缓解

- **接口变更**：B 站可能调整 WBI 混淆表或接口路径 → 混淆表与接口地址集中在 `src/config.ts` 与 `src/wbi.ts`，单点维护；错误码 -404 有明确提示。
- **风控**：频繁请求可能触发 -352 → 默认 800ms 间隔 + 指数退避重试 + 可调参数。
- **登录依赖**：WBI 密钥需登录态 → 未登录时给出明确中文提示。
