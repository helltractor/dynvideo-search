import { CONFIG } from './config';
import { Collector } from './collector';
import { createPanel } from './panel';
import { setDebugLogging, logDebug } from './shared/logger';
import { getUidFromLocation } from './utils/uid';

function main(): void {
  setDebugLogging(CONFIG.DEBUG_LOG);
  const collector = new Collector();
  const panel = createPanel(collector, { uid: getUidFromLocation() });
  panel.mount();
  logDebug('脚本已就绪：输入 UP 主 UID 后点击「启动」即可通过官方 API 采集');
}

main();
