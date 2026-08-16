# Changelog

All notable changes to this project will be documented in this file.

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
