import type { Collector, StatusKind } from './collector';

/**
 * 全局样式（注入 <style>，类名前缀 dvs- 避免与页面冲突）。
 * 主题：Bilibili 粉（#fb7299）渐变 + 圆角卡片 + 轻量动效。
 */
const GLOBAL_CSS = `
.dvs-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  background: #fff;
  border: 1px solid rgba(251, 114, 153, 0.18);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 99999;
  font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
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
  padding: 11px 14px;
  color: #fff;
  background: linear-gradient(135deg, #fb7299 0%, #ff9db0 100%);
}
.dvs-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.3px;
}
.dvs-collapse {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
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
  padding: 12px 14px 14px;
}
.dvs-uid-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dvs-uid-label {
  white-space: nowrap;
  color: #666;
  font-size: 13px;
  font-weight: 600;
}
.dvs-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
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
  color: #666;
  font-size: 13px;
}
.dvs-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  flex: none;
  transition: background 0.25s;
}
.dvs-textarea {
  width: 100%;
  height: 180px;
  resize: vertical;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  font-family: Consolas, monospace;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dvs-textarea:focus {
  border-color: #fb7299;
  box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.12);
}
.dvs-btn-row {
  display: flex;
  gap: 8px;
}
.dvs-btn {
  flex: 1;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: box-shadow 0.2s, background 0.2s, color 0.2s, border-color 0.2s, transform 0.12s;
}
.dvs-btn:active { transform: scale(0.97); }
.dvs-btn-primary {
  background: linear-gradient(135deg, #fb7299, #ff8fab);
  color: #fff;
  box-shadow: 0 4px 12px rgba(251, 114, 153, 0.35);
}
.dvs-btn-primary:hover { box-shadow: 0 6px 16px rgba(251, 114, 153, 0.5); }
.dvs-btn-secondary {
  background: #fff;
  color: #444;
  border: 1px solid #e5e7eb;
}
.dvs-btn-secondary:hover { border-color: #fb7299; color: #fb7299; }
/* 缩略态：纯图标圆形按钮（不展示文字） */
.dvs-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #fb7299, #ff8fab);
  color: #fff;
  font-size: 24px;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(251, 114, 153, 0.45);
  z-index: 99999;
  transition: transform 0.2s, box-shadow 0.2s;
}
.dvs-fab:hover { transform: scale(1.1); box-shadow: 0 10px 24px rgba(251, 114, 153, 0.55); }
.dvs-fab:active { transform: scale(0.94); }
`;

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

  // 头部：渐变标题栏 + 图标收起按钮
  const header = el('div', 'dvs-header');
  header.appendChild(el('div', 'dvs-title', '📡 动态视频BV号提取器'));
  const collapseBtn = el('button', 'dvs-collapse', '—');
  collapseBtn.title = '收起为图标按钮';
  header.appendChild(collapseBtn);
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

  // 状态行（带状态圆点）
  const statusDot = el('span', 'dvs-dot');
  const statusDiv = el('div', 'dvs-status');
  statusDiv.append(statusDot, document.createTextNode('状态：未启动'));
  body.appendChild(statusDiv);

  // 输出区
  const output = el('textarea', 'dvs-textarea') as HTMLTextAreaElement;
  output.placeholder = '提取结果将显示在这里（JSON 数组）...';
  output.readOnly = true;
  body.appendChild(output);

  // 按钮行
  const btnRow = el('div', 'dvs-btn-row');
  const toggleBtn = el('button', 'dvs-btn dvs-btn-primary', '▶ 启动');
  const copyBtn = el('button', 'dvs-btn dvs-btn-secondary', '复制 JSON');
  const exportBtn = el('button', 'dvs-btn dvs-btn-secondary', '导出文件');
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

  const STATUS_COLORS: Record<StatusKind, string> = {
    running: '#fb7299',
    paused: '#f0a020',
    done: '#22c55e',
    error: '#ef4444'
  };

  const renderOutput = () => {
    output.value = JSON.stringify(collector.list(), null, 2);
  };

  const setStatus = (kind: StatusKind, message: string) => {
    statusDiv.textContent = `状态：${message}`;
    statusDot.style.background = STATUS_COLORS[kind];
  };

  // ================= 事件 =================

  const start = (uid: string) => {
    toggleBtn.textContent = '⏸ 暂停';
    collector
      .start(uid, {
        onStatus: setStatus,
        onProgress: (p) => {
          setStatus('running', `运行中：第 ${p.page} 页，新增 ${p.added} 个，已发现 ${p.total} 个`);
          renderOutput();
        }
      })
      .then(() => {
        renderOutput();
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

  copyBtn.addEventListener('click', () => {
    navigator.clipboard
      .writeText(output.value || '[]')
      .then(() => {
        copyBtn.textContent = '已复制 ✅';
        setTimeout(() => (copyBtn.textContent = '复制 JSON'), 1500);
      })
      .catch(() => {
        copyBtn.textContent = '复制失败';
        setTimeout(() => (copyBtn.textContent = '复制 JSON'), 1500);
      });
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

  return {
    mount: () => {
      document.body.appendChild(panel);
      document.body.appendChild(fab);
    }
  };
}
