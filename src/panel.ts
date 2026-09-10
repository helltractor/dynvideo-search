import type { Collector, StatusKind } from './collector';
import type { CollectedVideo } from './types';

/** 视频详情页地址前缀（BV 号即完整 id） */
const VIDEO_URL_PREFIX = 'https://www.bilibili.com/video/';

/**
 * 全局样式（注入 <style>，类名前缀 dvs- 避免与页面冲突）。
 * 主题：Bilibili 粉（#fb7299）渐变 + 圆角卡片 + 轻量动效。
 * 首行 reset 只作用于面板内部，防止 B 站页面样式污染。
 */
const GLOBAL_CSS = `
.dvs-panel, .dvs-panel * { margin: 0; padding: 0; box-sizing: border-box; }
.dvs-panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 420px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(251, 114, 153, 0.18);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
  color: #2b2f36;
  font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  z-index: 99999;
  animation: dvs-pop 0.25s ease;
}
@keyframes dvs-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
.dvs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  color: #fff;
  background: linear-gradient(135deg, #fb7299 0%, #ff9db0 100%);
}
.dvs-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.dvs-head-actions { display: flex; align-items: center; gap: 8px; }
.dvs-count {
  padding: 1px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dvs-collapse {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s;
}
.dvs-collapse:hover { background: rgba(255, 255, 255, 0.4); }
.dvs-collapse:active { transform: scale(0.9); }
.dvs-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
.dvs-uid-row { display: flex; align-items: center; gap: 8px; }
.dvs-uid-label {
  flex: none;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}
.dvs-input {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dvs-input:focus {
  border-color: #fb7299;
  box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.15);
}
.dvs-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}
.dvs-status-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dvs-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd0d6;
  transition: background 0.25s;
}
.dvs-filter {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dvs-filter:focus {
  border-color: #fb7299;
  box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.12);
}
.dvs-list {
  height: 246px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafbfc;
}
.dvs-list::-webkit-scrollbar { width: 8px; }
.dvs-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #e3e6ea;
}
.dvs-list::-webkit-scrollbar-thumb:hover { background: #d3d7dd; }
.dvs-empty {
  padding: 22px 12px;
  color: #98a0aa;
  font-size: 12px;
  text-align: center;
}
.dvs-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}
.dvs-item:hover { background: rgba(251, 114, 153, 0.09); }
.dvs-item-idx {
  flex: none;
  width: 20px;
  color: #b7bdc6;
  font-size: 11px;
  line-height: 17px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dvs-item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dvs-item-bv {
  color: #fb7299;
  font-family: Consolas, 'SFMono-Regular', monospace;
  font-size: 11.5px;
  letter-spacing: 0.2px;
  text-decoration: none;
}
.dvs-item-bv:hover { text-decoration: underline; }
.dvs-item-title {
  overflow: hidden;
  color: #2b2f36;
  font-size: 12.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-decoration: none;
}
.dvs-item-title:hover { color: #fb7299; }
.dvs-btn-row { display: flex; gap: 8px; }
.dvs-btn {
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s, background 0.2s, color 0.2s, border-color 0.2s, transform 0.12s;
}
.dvs-btn:active { transform: scale(0.97); }
.dvs-btn-primary {
  flex: 1.5;
  background: linear-gradient(135deg, #fb7299, #ff8fab);
  color: #fff;
  box-shadow: 0 4px 12px rgba(251, 114, 153, 0.35);
}
.dvs-btn-primary:hover { box-shadow: 0 6px 16px rgba(251, 114, 153, 0.5); }
.dvs-btn-secondary {
  flex: 1;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #444;
}
.dvs-btn-secondary:hover { border-color: #fb7299; color: #fb7299; }
/* 缩略态：纯图标圆形按钮（不展示文字） */
.dvs-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 52px;
  height: 52px;
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #fb7299, #ff8fab);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(251, 114, 153, 0.45);
  z-index: 99999;
  transition: transform 0.2s, box-shadow 0.2s;
}
.dvs-fab:hover { transform: scale(1.1); box-shadow: 0 10px 24px rgba(251, 114, 153, 0.55); }
.dvs-fab:active { transform: scale(0.94); }
`;

const STATUS_COLORS: Record<StatusKind, string> = {
  running: '#fb7299',
  paused: '#f0a020',
  done: '#22c55e',
  error: '#ef4444'
};

function injectStyles(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 创建指向视频详情页的链接（新标签页打开） */
function videoLink(className: string, text: string, url: string): HTMLAnchorElement {
  const link = el('a', className, text) as HTMLAnchorElement;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  return link;
}

export interface PanelOptions {
  /** 从 URL 解析出的初始 UID */
  uid: string;
}

export interface PanelHandle {
  mount: () => void;
}

export function createPanel(collector: Collector, opts: PanelOptions): PanelHandle {
  injectStyles(GLOBAL_CSS);

  // ================= 完整面板 =================

  const panel = el('div', 'dvs-panel');

  // 头部：渐变标题栏 + 数量徽标 + 图标收起按钮
  const header = el('div', 'dvs-header');
  header.appendChild(el('div', 'dvs-title', '📡 动态视频BV号提取器'));
  const countBadge = el('span', 'dvs-count', '0');
  countBadge.title = '已提取数量';
  const collapseBtn = el('button', 'dvs-collapse', '—');
  collapseBtn.title = '收起为图标按钮';
  const headActions = el('div', 'dvs-head-actions');
  headActions.append(countBadge, collapseBtn);
  header.appendChild(headActions);
  panel.appendChild(header);

  // 内容区
  const body = el('div', 'dvs-body');

  // UID 输入行
  const uidInput = el('input', 'dvs-input') as HTMLInputElement;
  uidInput.placeholder = 'UP 主 UID（纯数字）';
  uidInput.value = opts.uid;
  const uidRow = el('div', 'dvs-uid-row');
  uidRow.appendChild(el('span', 'dvs-uid-label', 'UID'));
  uidRow.appendChild(uidInput);
  body.appendChild(uidRow);

  // 状态行（状态圆点 + 文案，文案单独成节点便于更新）
  const statusDot = el('span', 'dvs-dot');
  const statusText = el('span', 'dvs-status-text', '未启动');
  const statusDiv = el('div', 'dvs-status');
  statusDiv.append(statusDot, statusText);
  body.appendChild(statusDiv);

  // 筛选框（有结果时才展示）
  const filterInput = el('input', 'dvs-filter') as HTMLInputElement;
  filterInput.placeholder = '筛选 BV 号或标题';
  filterInput.style.display = 'none';
  body.appendChild(filterInput);

  // 结果列表（每行 = BV 号 + 标题，均可点击跳转视频页）
  const list = el('div', 'dvs-list');
  body.appendChild(list);

  // 按钮行
  const btnRow = el('div', 'dvs-btn-row');
  const toggleBtn = el('button', 'dvs-btn dvs-btn-primary', '▶ 启动');
  const copyBtn = el('button', 'dvs-btn dvs-btn-secondary', '复制 BV');
  const exportBtn = el('button', 'dvs-btn dvs-btn-secondary', '导出 JSON');
  btnRow.append(toggleBtn, copyBtn, exportBtn);
  body.appendChild(btnRow);

  panel.appendChild(body);

  // ================= 缩略态：纯图标圆形按钮 =================

  const fab = el('button', 'dvs-fab', '📡');
  fab.title = '展开采集面板';

  const setCollapsed = (value: boolean) => {
    panel.style.display = value ? 'none' : 'flex';
    fab.style.display = value ? 'flex' : 'none';
  };

  collapseBtn.addEventListener('click', () => setCollapsed(true));
  fab.addEventListener('click', () => setCollapsed(false));

  // ================= 渲染 =================

  const renderItem = (video: CollectedVideo, index: number): HTMLElement => {
    const url = VIDEO_URL_PREFIX + video.bv;
    const row = el('div', 'dvs-item');
    const main = el('div', 'dvs-item-main');
    const bvLink = videoLink('dvs-item-bv', video.bv, url);
    bvLink.title = '在新标签页打开视频';
    const titleLink = videoLink('dvs-item-title', video.title, url);
    titleLink.title = video.title;
    main.append(bvLink, titleLink);
    row.append(el('span', 'dvs-item-idx', String(index)), main);
    return row;
  };

  const renderList = () => {
    const videos = collector.list();
    const keyword = filterInput.value.trim().toLowerCase();
    const shown = keyword
      ? videos.filter(
          (video) =>
            video.bv.toLowerCase().includes(keyword) || video.title.toLowerCase().includes(keyword)
        )
      : videos;

    countBadge.textContent = String(videos.length);
    filterInput.style.display = videos.length > 0 ? '' : 'none';

    const scrollTop = list.scrollTop;
    list.replaceChildren();
    if (videos.length === 0) {
      list.appendChild(el('div', 'dvs-empty', '尚未提取到结果，点击「启动」开始采集'));
    } else if (shown.length === 0) {
      list.appendChild(el('div', 'dvs-empty', `没有匹配「${keyword}」的条目`));
    } else {
      const fragment = document.createDocumentFragment();
      shown.forEach((video, index) => fragment.appendChild(renderItem(video, index + 1)));
      list.appendChild(fragment);
    }
    list.scrollTop = scrollTop;
  };

  const setStatus = (kind: StatusKind, message: string) => {
    statusText.textContent = message;
    statusDot.style.background = STATUS_COLORS[kind];
  };

  // ================= 事件 =================

  const start = (uid: string) => {
    collector.reset();
    filterInput.value = '';
    renderList();
    toggleBtn.textContent = '⏸ 暂停';
    collector
      .start(uid, {
        onStatus: setStatus,
        onProgress: (progress) => {
          setStatus(
            'running',
            `运行中：第 ${progress.page} 页 · 本页新增 ${progress.added} · 累计 ${progress.total}`
          );
          if (progress.added > 0) renderList();
        }
      })
      .then(() => {
        renderList();
        toggleBtn.textContent = '▶ 启动';
      })
      .catch((err: Error) => {
        setStatus('error', `出错：${err.message}`);
        toggleBtn.textContent = '▶ 启动';
      });
  };

  toggleBtn.addEventListener('click', () => {
    if (!collector.isRunning) {
      const uid = uidInput.value.trim();
      if (!/^\d+$/.test(uid)) {
        setStatus('error', 'UID 无效：请输入纯数字');
        return;
      }
      start(uid);
    } else if (!collector.isPaused) {
      collector.pause();
      toggleBtn.textContent = '▶ 继续';
      setStatus('paused', '已暂停（点击「继续」恢复采集）');
    } else {
      collector.resume();
      toggleBtn.textContent = '⏸ 暂停';
      setStatus('running', '继续运行...');
    }
  });

  uidInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !collector.isRunning) toggleBtn.click();
  });

  filterInput.addEventListener('input', renderList);

  const flash = (button: HTMLButtonElement, label: string, restore: string) => {
    button.textContent = label;
    setTimeout(() => (button.textContent = restore), 1500);
  };

  copyBtn.addEventListener('click', () => {
    const videos = collector.list();
    if (videos.length === 0) {
      flash(copyBtn, '暂无结果', '复制 BV');
      return;
    }
    const text = videos.map((video) => video.bv).join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => flash(copyBtn, `已复制 ${videos.length} 个`, '复制 BV'))
      .catch(() => flash(copyBtn, '复制失败', '复制 BV'));
  });

  exportBtn.addEventListener('click', () => {
    const uid = uidInput.value.trim() || 'unknown';
    const json = JSON.stringify(collector.list(), null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = `dynvideo-${uid}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  renderList();

  return {
    mount: () => {
      document.body.appendChild(panel);
      document.body.appendChild(fab);
    }
  };
}
