/** 从当前 URL 提取 UP 主 UID（如 /12345/dynamic → 12345） */
export function getUidFromLocation(): string {
  const match = window.location.pathname.match(/^\/(\d+)/);
  return match ? match[1] : '';
}
