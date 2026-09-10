# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- 结果列表改为可读列表：每行显示序号、BV 号与标题，点击任意一处在新标签页打开视频页
- 新增结果筛选框（按 BV 号 / 标题关键词过滤）与头部数量徽标
- 新增「复制 BV」按钮，一键复制全部 BV 号（每行一个）
- UID 输入框支持回车启动

### Changed
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
