import type { Collector, StatusKind } from './collector';
import type { CollectedVideo } from './types';
import { el, videoLink } from './ui/dom';
import { injectGlobalStyles } from './ui/styles';

/** 视频详情页地址前缀（BV 号即完整 id） */
const VIDEO_URL_PREFIX = 'https://www.bilibili.com/video/';

/** 状态圆点配色：与按钮主题色保持同一视觉语言 */
const STATUS_COLORS: Record<StatusKind, string> = {
  running: '#fb7299',
  paused: '#f0a020',
  done: '#22c55e',
  error: '#ef4444'
};

export interface PanelOptions {
  /** 从 URL 解析出的初始 UID */
  uid: string;
}

export interface PanelHandle {
  mount: () => void;
}

export function createPanel(collector: Collector, opts: PanelOptions): PanelHandle {
  injectGlobalStyles();

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

  // 初始收起：脚本加载后只显示图标按钮，点击才展开面板
  setCollapsed(true);

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
