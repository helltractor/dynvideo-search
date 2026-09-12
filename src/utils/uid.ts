/** 合法 UP 主 UID 形态：纯数字（B 站空间地址 /:uid/ 中的即是 UID） */
export const UID_PATTERN = /^\d+$/;

/**
 * 校验用户输入是否为合法 UID。
 *
 * 与 {@link getUidFromLocation} 共享同一概念：「什么算 UID」只在此处定义，
 * 面板输入校验等调用方不得各自手写正则。
 *
 * @example
 * isValidUid('946974'); // true
 * isValidUid('BV1xx411c7mD'); // false
 */
export function isValidUid(uid: string): boolean {
  return UID_PATTERN.test(uid);
}

/** 从当前 URL 提取 UP 主 UID（如 /12345/dynamic → 12345） */
export function getUidFromLocation(): string {
  const match = window.location.pathname.match(/^\/(\d+)/);
  return match ? match[1] : '';
}
