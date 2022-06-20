// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { visualizer } from 'rollup-plugin-visualizer';
import multi from '@rollup/plugin-multi-entry';
import sourcemaps from 'rollup-plugin-sourcemaps';

const devMode = (process.env.NODE_ENV === 'development');
console.log(`${ devMode ? 'development' : 'production' } mode bundle`);

export default [
  {
    input: 'iothub.js',
    watch: {
      include: './dist/**',
      clearScreen: false
    },
    plugins: [
      nodeResolve(),
      nodePolyfills(),
      // commonjs(),
      // json(),
      sourcemaps(),
      // // visualizer should be last plugin in the list
      // visualizer()
    ],

    output: {
      sourcemap: true,
      dir: 'build/browser/src',
      name: 'iothub.js',
    }
  }
  // {
  //   input: "test/**/*.js",
  //   output: {
  //     file: 'build/browser/test/test.js',
  //     format: 'iife'
  //   },
  //   plugins: [
  //     multi(),
  //     commonjs()
  //   ],
  // }
];