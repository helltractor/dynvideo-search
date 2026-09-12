# 重构前审计报告（ts-refactor）

> 审计日期：2026-09-12 ｜ 基线：v0.1.2（3cb9b1e）｜ 分支：v0.2.0.x
> 基线状态：`npm run typecheck` ✓ ／ `npm run build` ✓（40.12 kB）
> 审计范围：全部 8 个源文件（约 902 行）+ tsconfig / vite.config / package.json / .gitignore / 文档

## 结论摘要

项目在 v0.1.0 重写后架构已相当健康：**入口 12 行纯接线、依赖单向、无运行时导入环、域模型独立于入口**。
不存在 P0 级结构缺陷。本次重构聚焦三类债务：panel.ts 多职责集中（P1）、UID 校验逻辑重复（P1）、
散落的 emoji 日志无前缀无开关（P1），外加 JSDoc 补齐与两项卫生项（P2）。

## 已达标项（保持不动）

- **入口纯接线**：`src/main.ts:5-10` 仅创建 Collector / Panel 并挂载，符合「entry <300 bytes」精神。
- **依赖单向**：panel → (collector/types 仅 `import type`) → api → wbi → config/types，无任何环。
  UI 模块没有从入口导入运行时值，循环检查通过。
- **域模型独立**：`src/types.ts` 承载 `CollectedVideo` / `ApiError` / DTO，不在入口定义。
- **配置集中**：请求间隔、重试、TTL、接口地址全部收敛在 `src/config.ts`。
- **核心模块 JSDoc**：`api.ts` / `wbi.ts` / `collector.ts` 类与方法基本都有「一句话摘要 + 动机」注释。
- **变更纪律**：CHANGELOG 按 Keep-a-Changelog 维护，最近提交均为规范 conventional commit。

## 问题清单

### P1-1 panel.ts 多职责集中（510 行 / 4 类职责）

- `src/panel.ts:12-254`：约 240 行 CSS 字符串（样式职责）；
- `src/panel.ts:269-287`：`el()` / `videoLink()` 通用 DOM 工具（可复用原语）；
- `src/panel.ts:298-417`：DOM 构建 + 渲染（视图职责）；
- `src/panel.ts:419-500`：启动/暂停事件、复制、JSON 导出（控制器职责）。
  单文件超过 3 类职责。CSS 与通用 DOM 工具应外移；剩余部分（渲染 + 事件）是内聚的控件，不再细拆。

### P1-2 UID 概念知识重复

- `src/utils/uid.ts:3`：`/^\/(\d+)/`（从路径提取）；
- `src/panel.ts:450`：`/^\d+$/.test(uid)`（输入校验）。
  「什么算合法 UID」这一知识分散两处，无共享校验器。应收敛到 `utils/uid.ts` 暴露 `isValidUid`。

### P1-3 日志无命名空间、无开关

- `src/main.ts:9`：脚本加载即 `console.log`（每次打开 B 站页面都污染控制台，且无法关闭）；
- `src/collector.ts:82`（每页）、`src/collector.ts:149`（每个新条目）：高频 `console.log`；
- `src/collector.ts:116`：风控重试 `console.warn`（这个属于应保留的失败路径，但同样无前缀）。
  B 站页面本身控制台输出密集，emoji 日志既无 `[项目名]` 前缀不可过滤，也无 debug 开关。
  应引入依赖无关的 `src/shared/logger.ts`：`logDebug`（由配置门控）+ `logWarn`（始终输出）。

### P2-1 JSDoc 缺口与风格不一致

- 无文档：`src/panel.ts:263`（`injectStyles`）、`src/panel.ts:269`（`el`）、`src/panel.ts:472`（`flash`）、
  `src/panel.ts:361`（`setCollapsed`）、`src/panel.ts:256`（`STATUS_COLORS`）、`src/wbi.ts:51`（`getMixinKey`）。
- `src/api.ts:9-10` 使用 `@param` 表但参数语义一目了然，按目标风格应删去。

### P2-2 卫生项

- 未跟踪目录 `.mimosa/`（本地安全扫描的 hook 状态）未列入 `.gitignore`，有误提交风险。
- 项目无 eslint / prettier，现有门禁仅 typecheck + build（本次重构按此门禁执行）。

## 刻意不采纳（防止过度工程）

- **i18n 分文件**：单中文语境的用户脚本，UI 文案内联即合理，B 站受众无需 locale 层。
- **core/ shared/ ui/ 目录化重组**：8 个文件的扁平结构已实现单向分层，目录改名只带来 import 变更噪音。
- **types.ts 拆分**（域模型 vs DTO vs 错误类）：共 69 行，拆分收益为零。
- **packages/ monorepo**：远低于 5k LOC，不适用。
- **注释语言改英文**：基准文档允许「以代码库现有注释的主语言为准」，本项目主语言为中文，保持中文。

## 执行顺序（每步 typecheck + build 门禁 + 独立提交）

1. `refactor(ui)` — 抽离 CSS 至 `src/ui/styles.ts`、DOM 工具至 `src/ui/dom.ts`
2. `refactor(shared)` — `utils/uid.ts` 暴露 `isValidUid`，消除双处校验
3. `refactor(logger)` — 引入 `src/shared/logger.ts`，替换散落日志并补失败路径告警
4. `docs` — 补齐 JSDoc（valaxy 风格：摘要 → 动机 → 可选示例）
5. `chore` — `.gitignore` 增加 `.mimosa/`
6. `docs` — 同步 README 目录结构与运行流程
