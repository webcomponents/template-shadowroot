import {terser} from 'rollup-plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';

export default {
  input: 'template-shadowroot.js',
  plugins: [
    terser({
      module: true,
      warnings: true,
      // Prevent Terser from removing the generated `var TemplateShadowRoot =
      // ...;` (where `TemplateShadowRoot` is intended for users and never used
      // in the bundle itself).
      compress: {
        top_retain: ['TemplateShadowRoot'],
      },
      mangle: {
        reserved: ['TemplateShadowRoot'],
      },
    }),
    sourcemaps(),
  ],
  output: {
    file: 'template-shadowroot.min.js',
    format: 'iife',
    name: 'TemplateShadowRoot',
    sourcemap: true,
  },
};
