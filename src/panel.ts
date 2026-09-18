import type { Collector, StatusKind } from './collector';
import type { CollectedVideo } from './types';
import { logWarn } from './shared/logger';
import { fetchUpFace } from './api';
import { el, videoLink } from './ui/dom';
import { injectGlobalStyles } from './ui/styles';
import { isValidUid } from './utils/uid';

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

  // 选择工具行：全选 + 已选计数（有结果时才展示）
  const selectAllCheck = document.createElement('input');
  selectAllCheck.type = 'checkbox';
  selectAllCheck.className = 'dvs-check';
  selectAllCheck.id = 'dvs-select-all';
  const selectAllLabel = el('label', 'dvs-select-label', '全选');
  selectAllLabel.htmlFor = 'dvs-select-all';
  const selectedCount = el('span', 'dvs-selected-count', '已选 0/0');
  selectedCount.title = '复制 / 导出仅处理勾选项，未勾选时处理全部';
  const selectRow = el('div', 'dvs-select-row');
  selectRow.append(selectAllCheck, selectAllLabel, selectedCount);
  selectRow.style.display = 'none';
  body.appendChild(selectRow);

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

  // ================= 缩略态：UP 主头像圆钮（加载失败回退 📡 图标） =================

  const fab = el('button', 'dvs-fab');
  fab.title = '展开采集面板';
  const fabAvatar = document.createElement('img');
  fabAvatar.className = 'dvs-fab-avatar';
  fabAvatar.alt = 'UP 主头像';
  const fabIcon = el('span', 'dvs-fab-icon', '📡');
  fab.append(fabAvatar, fabIcon);

  /**
   * 切换浮窗收起态：面板与圆钮互斥显示。
   * 初始即为收起（脚本加载后只留右下角图标），避免遮挡 B 站页面。
   */
  const setCollapsed = (value: boolean) => {
    panel.style.display = value ? 'none' : 'flex';
    fab.style.display = value ? 'flex' : 'none';
  };

  collapseBtn.addEventListener('click', () => setCollapsed(true));
  fab.addEventListener('click', () => setCollapsed(false));

  /** 当前头像对应的 UID：避免重复请求，并丢弃切换目标后返回的过期结果 */
  let faceUid = '';

  /** 缩略态圆钮回退为 📡 图标（头像尚未获取或加载失败时） */
  const showFabIcon = () => {
    fabAvatar.style.display = 'none';
    fabIcon.style.display = '';
  };

  fabAvatar.addEventListener('error', showFabIcon);

  /**
   * 拉取并展示 UP 主头像，失败时回退图标不阻塞面板。
   *
   * 仅在 UID 变化时请求；同一 UID 的失败不再重试，
   * 避免反复收起 / 展开或重启采集时重复打接口。
   */
  const refreshFace = (uid: string) => {
    if (!isValidUid(uid) || uid === faceUid) return;
    faceUid = uid;
    showFabIcon();
    fetchUpFace(uid)
      .then((face) => {
        if (faceUid !== uid) return;
        fabAvatar.src = face;
        fabAvatar.style.display = '';
        fabIcon.style.display = 'none';
      })
      .catch((err: unknown) => {
        // 失败路径留痕：头像属装饰性展示，回退图标后仅告警
        logWarn('获取 UP 主头像失败，缩略态回退默认图标', err);
      });
  };

  // 初始收起：脚本加载后只显示头像圆钮，点击才展开面板
  setCollapsed(true);
  refreshFace(opts.uid);

  // ================= 渲染 =================

  /** 勾选集（按 BV 号）：列表重绘与筛选过程中保持勾选状态，重启采集时清空 */
  const checked = new Set<string>();

  /** 当前筛选视图下的条目（无筛选词时即全部） */
  const shownVideos = () => {
    const videos = collector.list();
    const keyword = filterInput.value.trim().toLowerCase();
    if (!keyword) return videos;
    return videos.filter(
      (video) =>
        video.bv.toLowerCase().includes(keyword) || video.title.toLowerCase().includes(keyword)
    );
  };

  /** 同步选择工具行：已选计数与全选框状态（全选 / 半选 / 未选） */
  const updateSelectRow = () => {
    const videos = collector.list();
    const shown = shownVideos();
    const checkedShown = shown.filter((video) => checked.has(video.bv)).length;
    selectedCount.textContent = `已选 ${checked.size}/${videos.length}`;
    selectAllCheck.checked = shown.length > 0 && checkedShown === shown.length;
    selectAllCheck.indeterminate = checkedShown > 0 && checkedShown < shown.length;
  };

  /** 渲染单个结果行：勾选框 + 序号 + [标题] 超链接（B 站视频链接样式，悬停显示 BV 号） */
  const renderItem = (video: CollectedVideo, index: number): HTMLElement => {
    const url = VIDEO_URL_PREFIX + video.bv;
    const row = el('div', 'dvs-item');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'dvs-check';
    check.checked = checked.has(video.bv);
    check.title = '勾选后可仅复制 / 导出选中项';

    const main = el('div', 'dvs-item-main');
    const titleLink = videoLink('dvs-item-title', `[${video.title}]`, url);
    titleLink.title = video.bv;
    main.appendChild(titleLink);

    /** 勾选状态落库并同步工具行（复选框 change 与整行点击共用） */
    const toggle = (value: boolean) => {
      check.checked = value;
      if (value) checked.add(video.bv);
      else checked.delete(video.bv);
      updateSelectRow();
    };

    check.addEventListener('change', () => toggle(check.checked));
    // 点击行内空白处切换勾选（点链接跳转、点复选框本身不受影响）
    row.addEventListener('click', (event) => {
      const target = event.target;
      if (target === check || target instanceof HTMLAnchorElement) return;
      toggle(!check.checked);
    });

    row.append(check, el('span', 'dvs-item-idx', String(index)), main);
    return row;
  };

  /**
   * 按当前筛选词全量重绘结果列表。
   *
   * 重绘前保存 scrollTop、重绘后恢复，避免采集过程中列表频繁刷新导致滚动位置跳动；
   * 勾选状态不随重绘丢失（由 checked 集合恢复到各行的复选框）。
   */
  const renderList = () => {
    const videos = collector.list();
    const shown = shownVideos();
    const keyword = filterInput.value.trim().toLowerCase();

    countBadge.textContent = String(videos.length);
    filterInput.style.display = videos.length > 0 ? '' : 'none';
    selectRow.style.display = videos.length > 0 ? '' : 'none';

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
    updateSelectRow();
  };

  /** 更新状态行：文案 + 状态圆点颜色（kind 与 STATUS_COLORS 对应） */
  const setStatus = (kind: StatusKind, message: string) => {
    statusText.textContent = message;
    statusDot.style.background = STATUS_COLORS[kind];
  };

  // ================= 事件 =================

  /**
   * 启动新一轮采集：清空旧结果并重置筛选，然后交给 collector 分页拉取。
   *
   * 状态文案由 hooks 回调驱动；完成或失败后按钮文案复位为「▶ 启动」，
   * 失败的具体原因经 setStatus('error') 展示在状态行。
   */
  const start = (uid: string) => {
    collector.reset();
    checked.clear();
    filterInput.value = '';
    renderList();
    toggleBtn.textContent = '⏸ 暂停';
    refreshFace(uid);
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
      if (!isValidUid(uid)) {
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

  /**
   * 全选 / 取消全选：作用于当前筛选视图下的条目（所见即所选）。
   * 半选状态下点击复选框会置为全选，符合浏览器原生交互。
   */
  selectAllCheck.addEventListener('change', () => {
    const target = selectAllCheck.checked;
    for (const video of shownVideos()) {
      if (target) checked.add(video.bv);
      else checked.delete(video.bv);
    }
    renderList();
  });

  /**
   * 按钮文案闪现反馈：短暂显示结果文案后恢复原标签。
   *
   * 用于复制 / 无结果这类瞬时操作的轻提示，不侵入状态行。
   * 注意未清除前一次的定时器——1.5 秒内快速连点会以后一次的恢复时间为准，可接受。
   */
  const flash = (button: HTMLButtonElement, label: string, restore: string) => {
    button.textContent = label;
    setTimeout(() => (button.textContent = restore), 1500);
  };

  /** 复制 / 导出的目标集：有勾选时仅取勾选项，否则回退全部 */
  const targetVideos = (): CollectedVideo[] => {
    const videos = collector.list();
    if (checked.size === 0) return videos;
    return videos.filter((video) => checked.has(video.bv));
  };

  copyBtn.addEventListener('click', () => {
    const videos = targetVideos();
    if (videos.length === 0) {
      flash(copyBtn, '暂无结果', '复制 BV');
      return;
    }
    const text = videos.map((video) => video.bv).join('\n');
    const scope = checked.size > 0 ? '（勾选）' : '';
    navigator.clipboard
      .writeText(text)
      .then(() => flash(copyBtn, `已复制 ${videos.length} 个${scope}`, '复制 BV'))
      .catch((err: unknown) => {
        // 失败路径必须留痕：按钮闪现之外，控制台至少告警一次
        logWarn('复制 BV 号失败', err);
        flash(copyBtn, '复制失败', '复制 BV');
      });
  });

  exportBtn.addEventListener('click', () => {
    const uid = uidInput.value.trim() || 'unknown';
    const json = JSON.stringify(targetVideos(), null, 2);
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
