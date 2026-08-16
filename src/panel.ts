import type { Collector, StatusKind } from './collector';

const PANEL_STYLE =
  'position: fixed; bottom: 20px; right: 20px; width: 400px; max-height: 520px; ' +
  'background: #fff; border: 1px solid #ddd; border-radius: 8px; ' +
  'box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; z-index: 99999; ' +
  "font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 14px; " +
  'display: flex; flex-direction: column; gap: 8px; box-sizing: border-box;';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
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
  const panel = el('div', PANEL_STYLE);

  // 标题行（含收起/展开按钮）
  const titleRow = el('div', 'display: flex; align-items: center; justify-content: space-between; gap: 8px;');
  titleRow.appendChild(el('div', 'font-weight: bold; font-size: 16px;', '📡 动态视频BV号提取器'));
  const collapseBtn = el('button', 'padding: 2px 10px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 12px;', '⤡ 收起');
  titleRow.appendChild(collapseBtn);
  panel.appendChild(titleRow);

  // 可收起的内容区
  const body = el('div', 'display: flex; flex-direction: column; gap: 8px;');

  // UID 输入行
  const uidInput = el('input', 'flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;') as HTMLInputElement;
  uidInput.placeholder = 'UP 主 UID（纯数字）';
  uidInput.value = opts.uid;
  const uidRow = el('div', 'display: flex; align-items: center; gap: 6px;');
  uidRow.appendChild(el('span', 'white-space: nowrap; color: #555;', 'UID'));
  uidRow.appendChild(uidInput);
  body.appendChild(uidRow);

  // 状态行
  const statusDiv = el('div', 'color: #555;', '状态：未启动');
  body.appendChild(statusDiv);

  // 输出区
  const output = el('textarea', 'width: 100%; height: 180px; resize: vertical; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-family: Consolas, monospace; box-sizing: border-box;') as HTMLTextAreaElement;
  output.placeholder = '提取结果将显示在这里（JSON 数组）...';
  output.readOnly = true;
  body.appendChild(output);

  // 按钮行
  const btnRow = el('div', 'display: flex; gap: 8px;');
  const toggleBtn = el('button', 'flex: 1; padding: 8px 12px; background: #00a1d6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;', '▶ 启动');
  const copyBtn = el('button', 'flex: 1; padding: 8px 12px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 14px;', '复制 JSON');
  const exportBtn = el('button', 'flex: 1; padding: 8px 12px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 14px;', '导出文件');
  btnRow.append(toggleBtn, copyBtn, exportBtn);
  body.appendChild(btnRow);
  panel.appendChild(body);

  // ---------- 收起 / 展开 ----------

  let collapsed = false;
  const setCollapsed = (value: boolean) => {
    collapsed = value;
    body.style.display = value ? 'none' : 'flex';
    collapseBtn.textContent = value ? '⤢ 展开' : '⤡ 收起';
    // 收起时面板缩略为仅标题栏的窄条
    panel.style.width = value ? 'auto' : '400px';
  };

  collapseBtn.addEventListener('click', () => setCollapsed(!collapsed));

  // ---------- 渲染 ----------

  const renderOutput = () => {
    output.value = JSON.stringify(collector.list(), null, 2);
  };

  const setStatus = (kind: StatusKind, message: string) => {
    statusDiv.textContent = `状态：${message}`;
    statusDiv.style.color = kind === 'error' ? '#d33' : kind === 'done' ? '#090' : '#555';
  };

  // ---------- 事件 ----------

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
    mount: () => document.body.appendChild(panel)
  };
}
