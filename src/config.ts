/** 全局配置常量 */
export const CONFIG = {
  /** 每页请求间隔（毫秒），降低触发风控的概率 */
  PAGE_DELAY: 800,
  /** 最大抓取页数，防止意外死循环 */
  MAX_PAGES: 200,
  /** 是否严格要求「动态视频」badge（与 v0.0.1 DOM 版行为一致） */
  REQUIRE_BADGE: true,
  /** 风控（-352）最大重试次数 */
  RISK_RETRY: 3,
  /** 网络瞬时错误的最大重试次数 */
  NETWORK_RETRY: 2,
  /** WBI 密钥缓存时长（毫秒），密钥每天轮换 */
  WBI_CACHE_TTL: 12 * 60 * 60 * 1000
} as const;

/** Bilibili 接口地址 */
export const API = {
  NAV: 'https://api.bilibili.com/x/web-interface/nav',
  SPACE_FEED: 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space'
} as const;
