import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import analyzer from 'rollup-plugin-analyzer';

const isAnalyze = process.env.ANALYZE === 'true';

export default [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: false,
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'types',
        outDir: 'dist',
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug'],
        },
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
        output: {
          comments: false,
        },
      }),
      isAnalyze && analyzer({ summaryOnly: true }),
    ].filter(Boolean),
  },
  // UMD build for direct script inclusion
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'AIAnalytics',
      sourcemap: false,
    },
    plugins: [
      nodeResolve({
        browser: true,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationDir: undefined,
        outDir: 'dist',
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug'],
        },
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
        output: {
          comments: false,
        },
      }),
    ],
  },
];