import { Collector } from './collector';
import { createPanel } from './panel';
import { getUidFromLocation } from './utils/uid';

function main(): void {
  const collector = new Collector();
  const panel = createPanel(collector, { uid: getUidFromLocation() });
  panel.mount();
  console.log('💡 脚本已就绪：输入 UP 主 UID 后点击「启动」即可通过官方 API 采集');
}

main();
