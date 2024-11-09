// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  build: {
    lib: {
      entry: 'src/main.js', // Adjust to your main file path
      name: 'Vue Todo Mvc', // A global name for the web component
      fileName: (format) => `vue-todo-app.${format}.js`,
      formats: ['es', 'umd'], // Including both ES module and UMD for compatibility
    },
    rollupOptions: {
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});