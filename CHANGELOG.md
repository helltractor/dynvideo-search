# Changelog

## [Unreleased]

### Added
- 结果列表支持条目勾选与一键全选：复制 / 导出仅处理勾选项（未勾选时回退全部），勾选状态在列表重绘与筛选切换间保持，重启采集时清空

### Changed
- 结果列表渲染重构：每行由「BV 号 + 标题」改为 B 站视频链接样式的 **[视频标题]** 超链接（悬停显示 BV 号），点击整行空白处可切换勾选
- 安装方式简化为 Tampermonkey 一键直装：README 改为「最新 Release 直装链接」，移除 npm 构建安装说明；脚本头部新增 `@downloadURL` / `@updateURL` 指向最新 Release 产物，支持自动检查更新
- 浮窗缩略态圆钮由 📡 图标改为 UP 主头像：经用户卡片接口获取（轻量、无需 WBI 签名），加载失败自动回退图标，启动采集时随目标 UID 刷新

## [v0.1.3] - 2026-09-12

### Changed
- 浮窗样式抽离至 `src/ui/styles.ts`，DOM 工具（元素创建 / 视频链接）抽离至 `src/ui/dom.ts`，`panel.ts` 由 510 行减至约 270 行且职责单一
- UP 主 UID 校验收敛至 `src/utils/uid.ts`（`isValidUid`），消除面板输入校验与 URL 提取两处各自维护正则
- 控制台日志统一走 `src/shared/logger.ts`：带 `[dynvideo-search]` 前缀，调试日志由 `CONFIG.DEBUG_LOG` 门控（默认关闭，不再污染页面控制台），风控重试与复制失败等失败路径始终告警
- 补齐 `panel.ts` 内部函数、`wbi.ts` 缓存策略等 JSDoc，移除冗余 `@param` 参数表

### Docs
- 新增重构前审计报告 `docs/refactor-audit.md`
- 同步 README 运行流程与目录结构至新的 `ui/` / `shared/` 布局

## [v0.1.2] - 2026-09-10

### Added
- 结果列表改为可读列表：每行显示序号、BV 号与标题，点击任意一处在新标签页打开视频页
- 新增结果筛选框（按 BV 号 / 标题关键词过滤）与头部数量徽标
- 新增「复制 BV」按钮，一键复制全部 BV 号（每行一个）
- UID 输入框支持回车启动

### Changed
- 浮窗默认收起为纯图标圆钮，脚本加载后不再自动展开遮挡页面，点击图标才展开
- 浮窗样式优化：面板最大宽度自适应小屏、结果区自定义滚动条、条目悬浮高亮、面板内样式 reset 防止页面样式污染
- 输出格式由只读 JSON 文本框改为实时结果列表，JSON 结构保留在「导出 JSON」中
- 重新启动采集时清空上一轮结果，避免不同 UID 的结果混在一起
- 版本号、许可证与产物文件名统一由 `package.json` 推导，`vite.config.ts` 不再重复声明

### Fixed
- 修复状态圆点在首次状态更新后消失的问题（文案改为独立节点更新）

### Removed
- 移除未被调用的 `Collector.count` getter 与 `Collector.stop()` 方法
- 移除 `vite.config.ts` 中重复的 `version` / `author` / `license` / `build.fileName` 配置
- 移除不再使用的 JSON 输出文本框样式

## [v0.1.1] - 2026-08-16

### Changed
- 美化浮窗 UI：Bilibili 粉渐变主题、圆角卡片、按钮与输入框焦点/悬浮动效
- 浮窗缩略态改为纯图标圆形按钮（不展示文字），点击图标展开面板

## [v0.1.0] - 2026-08-16

### Added
- 采用官方 API（`x/polymer/web-dynamic/v1/feed/space`）分页拉取动态，替代 DOM 滚动抓取
- 实现 WBI 签名（`wts` + `w_rid`），密钥自动获取并缓存 12 小时
- 引入 TypeScript + Vite + vite-plugin-monkey 工程化构建，产出 `dist/dynvideo-search.user.js`
- 新增 UID 手动输入（默认从 URL 自动解析）
- 新增「导出文件」功能，可将结果保存为 JSON 文件
- 新增风控（-352）指数退避重试与网络瞬时错误重试
- 新增技术选型文档 `docs/tech-decision.md`
- 浮窗支持收起 / 展开，可缩略为标题栏窄条

### Changed
- 采集效率提升：由滚动等待（每页 2~4 秒）变为分页请求（默认间隔 800ms）
- 浮窗 UI 重构：状态实时展示页码、新增数与累计数

### Removed
- 删除 DOM 滚动采集逻辑（`main.js` 单文件脚本被 `src/*` 源码替换）

## [v0.0.1] - 2026-08-15

### Added
- 初始化项目结构
- 实现自动滚动加载 Bilibili 动态页面
- 提取带有「动态视频」badge 的原创视频 BV 号与标题
- 支持启动 / 暂停 / 继续控制
- 实现去重逻辑，避免重复记录
- 新增 JSON 输出与复制功能
- 增加 README 文档说明

### Changed
- 统一项目文档结构
- 规范版本号从 v0.0.1 开始

### Fixed
- 修正项目结构与说明的一致性
- 优化脚本入口和状态管理结构
