import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

/**
 * 构建配置。
 * version / author / license 以及产物文件名均由 package.json 自动推导
 * （vite-plugin-monkey 读取 cwd 下的 package.json：version → @version、
 * license → @license、name → <name>.user.js），此处不再重复声明。
 */
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '动态视频BV号提取器',
        namespace: 'http://tampermonkey.net/',
        description:
          '基于官方 API（WBI 签名）自动提取 UP 主动态中的原创「动态视频」BV 号与标题，浮窗列表可直接跳转视频页并支持筛选 / 复制 / JSON 导出',
        match: ['https://space.bilibili.com/*/dynamic*', 'https://space.bilibili.com/*'],
        grant: 'none',
        'run-at': 'document-idle',
        noframes: true
      }
    })
  ]
});
