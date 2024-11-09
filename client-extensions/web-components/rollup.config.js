import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import copy from "rollup-plugin-copy"; // New plugin for copying files

export default {
    input: "src/components/todo-app/todo-app.component.js",
    output: {
        file: "dist/todo-app.bundle.js",
        format: "esm",
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs(),
        postcss({
            extract: "styles/todo-app.css", // Output CSS to dist/styles/
            minimize: true,
        }),
        terser(),
        copy({
            targets: [
                { src: "src/styles/*.css", dest: "dist/styles" }, // Copies CSS files
                { src: "../../todo-app-styles.css", dest: "dist/styles" },
                { src: "../../todo-common-base.css", dest: "dist/styles" },
            ],
        }),
    ],
};