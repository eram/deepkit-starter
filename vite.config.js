import { defineConfig } from 'vite';
import { deepkitType } from '@deepkit/vite';

export default defineConfig({
  plugins: [
    deepkitType({
      compilerOptions: {
        // Use your preferred TypeScript options here
        sourceMap: true,
        inlineSources: true,
        inlineSourceMap: false,
      }
    })
  ]
});
