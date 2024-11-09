import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                customElement: true
            },
            emitCss: true
        }),
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/todomvc-common/base.js',
                    dest: '.',
                },
            ],
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.js',
            name: 'SvelteTodoMVC',
            formats: ['es', 'umd'],
            fileName: 'svelte-todo-mvc'
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') return 'svelte-todo-mvc.css';
                    return assetInfo.name;
                }
            }
        },
        cssCodeSplit: false
    },
    base: "client-extensions/svelte/dist/"
});