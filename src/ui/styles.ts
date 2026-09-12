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
  /* 默认收起：只显示右下角图标按钮，由 setCollapsed 切换 */
  display: none;
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
  display: flex;
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

/**
 * 将浮窗全局样式注入文档头部。
 *
 * 必须在面板 DOM 挂载前调用：样式表晚于节点插入时，首帧会以无样式状态闪烁。
 * 重复调用会追加重复的 <style>，因此只在 createPanel 入口调用一次。
 */
export function injectGlobalStyles(): void {
  const style = document.createElement('style');
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}
