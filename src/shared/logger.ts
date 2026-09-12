/**
 * 带项目前缀的统一控制台日志。
 *
 * 依赖无关（不 import 任何项目模块）：脚本运行在 B 站页面里，控制台本身输出密集，
 * 所有日志必须带 `[dynvideo-search]` 前缀才可被过滤；调试日志默认关闭，
 * 避免每次打开空间页都污染用户控制台（见 main.ts 的 setDebugLogging 调用）。
 */
const PREFIX = '[dynvideo-search]';

let enabled = false;

/** 开关调试日志（由配置 CONFIG.DEBUG_LOG 驱动，仅入口调用） */
export function setDebugLogging(on: boolean): void {
  enabled = on;
}

/** 调试日志：生命周期、分页进度、逐条提取等高频信息，默认不输出 */
export function logDebug(...args: unknown[]): void {
  if (enabled) console.log(PREFIX, ...args);
}

/** 告警日志：仅用于真实失败路径（风控重试、剪贴板写入失败等），始终输出 */
export function logWarn(...args: unknown[]): void {
  console.warn(PREFIX, ...args);
}
