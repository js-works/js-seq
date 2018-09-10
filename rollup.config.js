//import { tslint } from 'rollup-plugin-tslint'
import typescript from 'rollup-plugin-typescript2'
import { uglify as uglifyJS } from 'rollup-plugin-uglify'
import uglifyES from 'rollup-plugin-uglify-es'
import gzip from 'rollup-plugin-gzip'

const configs = []

for (const format of ['umd', 'cjs', 'amd', 'esm']) {
  for (const productive of [false, true]) {
    configs.push(createRollupConfig(format, productive))
  }
}

export default configs

// --- locals -------------------------------------------------------

function createRollupConfig(moduleFormat, productive, copyAssets) {
  return {
    input: 'src/main/js-seq.ts',

    output: {
      file: productive
        ? `dist/js-seq.${moduleFormat}.production.js`
        : `dist/js-seq.${moduleFormat}.development.js`,

      format: moduleFormat,
      name: 'jsSeq', 
      sourcemap: productive ? false : 'inline'
    },

    external: [],

    plugins: [
      // tslint({
      //}),
      typescript({
        exclude: 'node_modules/**',
      }),
      productive && (moduleFormat === 'esm' ? uglifyES() : uglifyJS()),
      productive && gzip(),
    ],
  }
}
