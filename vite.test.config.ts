import { defineConfig } from 'vite';

/**
 * 功能测试打包配置：src 面向浏览器 bundler（裸说明符 + 无扩展名导入），
 * 无法被 node 直接加载，因此将 test/functional.test.ts 连同 src/
 * 打为单文件 ESM 输出到 dist-test/，再由 node 直接运行。
 */
export default defineConfig({
  build: {
    outDir: 'dist-test',
    emptyOutDir: true,
    ssr: true,
    rollupOptions: {
      input: 'test/functional.test.ts',
      output: { entryFileNames: 'functional.test.mjs' }
    }
  }
});
