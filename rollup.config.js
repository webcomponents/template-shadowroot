import {terser} from 'rollup-plugin-terser';

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
      }
    }),
  ],
  output: {
    file: 'template-shadowroot.min.js',
    format: 'iife',
    name: 'TemplateShadowRoot',
  },
};
