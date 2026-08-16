import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'B站动态视频BV号提取器',
        namespace: 'http://tampermonkey.net/',
        version: '0.1.1',
        description:
          '基于官方 API（WBI 签名）自动提取 UP 主动态中的原创「动态视频」BV 号与标题，支持暂停/继续与 JSON 导出',
        author: 'You',
        match: ['https://space.bilibili.com/*/dynamic*', 'https://space.bilibili.com/*'],
        grant: 'none',
        'run-at': 'document-idle',
        license: 'MIT',
        noframes: true
      },
      build: {
        fileName: 'dynvideo-search.user.js'
      }
    })
  ]
});
