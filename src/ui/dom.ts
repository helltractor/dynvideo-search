/**
 * 浮窗共用的轻量 DOM 工具。
 *
 * 刻意不引入模板引擎或框架：用户脚本需要零运行时依赖，
 * 且面板节点数量有限（<50 个），命令式创建足够可维护。
 */

/**
 * 创建带类名与文本的元素。
 *
 * @example
 * el('button', 'dvs-btn dvs-btn-primary', '▶ 启动');
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * 创建指向视频详情页的链接（新标签页打开）。
 *
 * 必须带 `rel="noreferrer noopener"`：B 站页面在 window.opener
 * 存在时可被反向操控，外链一律切断 opener 引用。
 *
 * @example
 * videoLink('dvs-item-bv', 'BV1xx411c7mD', 'https://www.bilibili.com/video/BV1xx411c7mD');
 */
export function videoLink(className: string, text: string, url: string): HTMLAnchorElement {
  const link = el('a', className, text) as HTMLAnchorElement;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  return link;
}
