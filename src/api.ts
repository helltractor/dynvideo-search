import { API } from './config';
import { signParams } from './wbi';
import { ApiError } from './types';
import type { SpaceFeedResponse } from './types';

/**
 * 拉取 UP 主空间动态（分页）。
 *
 * offset 为上一页返回的分页游标，首页传空串；
 * 非零 code 不抛 HTTP 错误而是抛出带业务 code 的 {@link ApiError}，由调用方决定重试策略。
 */
export async function fetchSpaceFeed(uid: string, offset: string): Promise<SpaceFeedResponse> {
  const params: Record<string, string> = {
    host_mid: uid,
    timezone_offset: '-480',
    features: 'itemOpusStyle',
    platform: 'web'
  };
  if (offset) params.offset = offset;

  const query = await signParams(params);
  const url = `${API.SPACE_FEED}?${query.toString()}`;

  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error(`网络请求失败（HTTP ${resp.status}）`);

  const json = (await resp.json()) as SpaceFeedResponse;
  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || '未知错误');
  }
  return json;
}

/** 将 B 站业务错误码转换为可读提示 */
export function describeApiError(code: number): string {
  switch (code) {
    case -101:
      return '未登录：请先在浏览器中登录 B 站账号';
    case -111:
      return 'CSRF 校验失败，请刷新页面重试';
    case -352:
      return '触发风控（-352）：请放慢采集速度或稍后再试';
    case -400:
      return '请求参数错误（可能为签名失效），请刷新页面重试';
    case -404:
      return '接口不存在或已变更';
    default:
      return `接口返回错误（code=${code}）`;
  }
}
