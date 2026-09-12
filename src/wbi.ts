import SparkMD5 from 'spark-md5';
import { API, CONFIG } from './config';
import type { NavResponse } from './types';

/**
 * WBI 签名实现，参考：
 * https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md
 */

/** mixinKey 重排表（官方混淆表） */
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52
] as const;

interface WbiKeys {
  imgKey: string;
  subKey: string;
}

let cache: { mixinKey: string; expiresAt: number } | null = null;

/** 从图片 URL 提取 key（去掉路径与扩展名） */
function keyFromUrl(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1).split('.')[0];
}

/** 从 nav 接口获取 wbi 图片密钥 */
async function fetchWbiKeys(): Promise<WbiKeys> {
  const resp = await fetch(API.NAV, { credentials: 'include' });
  if (!resp.ok) throw new Error(`获取 WBI 密钥失败（HTTP ${resp.status}）`);
  const json = (await resp.json()) as NavResponse;
  if (json.code !== 0 || !json.data?.wbi_img) {
    if (json.code === -101) throw new Error('请先登录 B 站账号（code=-101）');
    throw new Error(`获取 WBI 密钥失败（code=${json.code}）`);
  }
  return {
    imgKey: keyFromUrl(json.data.wbi_img.img_url),
    subKey: keyFromUrl(json.data.wbi_img.sub_url)
  };
}

/** 由 imgKey + subKey 计算 mixinKey（重排后取前 32 位） */
function calcMixinKey(keys: WbiKeys): string {
  const raw = keys.imgKey + keys.subKey;
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i]).join('').slice(0, 32);
}

/**
 * 获取 mixinKey（带 12 小时内存缓存）。
 *
 * WBI 密钥由 B 站每日轮换，但签名校验对旧密钥有宽限期，
 * 缓存 TTL 取 12 小时（CONFIG.WBI_CACHE_TTL）在有效性与请求量之间折中。
 */
async function getMixinKey(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.mixinKey;
  const keys = await fetchWbiKeys();
  const mixinKey = calcMixinKey(keys);
  cache = { mixinKey, expiresAt: now + CONFIG.WBI_CACHE_TTL };
  return mixinKey;
}

/**
 * 对请求参数进行 WBI 签名，返回带 wts / w_rid 的 URLSearchParams
 */
export async function signParams(params: Record<string, string>): Promise<URLSearchParams> {
  const mixinKey = await getMixinKey();

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    ...params,
    wts: String(Math.floor(Date.now() / 1000))
  })) {
    if (value !== undefined && value !== null && value !== '') filtered[key] = value;
  }

  const query = Object.keys(filtered)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(filtered[key])}`)
    .join('&');

  const wRid = SparkMD5.hash(query + mixinKey);
  const qs = new URLSearchParams(query);
  qs.set('w_rid', wRid);
  return qs;
}
