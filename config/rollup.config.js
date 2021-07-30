import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import typescript from 'rollup-plugin-typescript2'
import { version } from '../package.json'

const INPUT_FILE = 'src/main/index.ts'

const EXTERNAL_LIBS = [
  'react',
  'react-test-renderer',
]

/**
 * @param {object} config
 * @param {object} config.overrides
 * @param {Array<string>} config.presets
 * @param {'development'|'production'} config.mode
 * @param {'boolean'} config.isRNBuild
 * @returns {Array}
 */
function getPlugins({
  overrides,
  mode,
  presets = [],
} = {}) {

  const basePlugins = {
    typescript: typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: false,
          declarationDir: null,
          outDir: null,
        },
      },
    }),
    babel: babel({
      presets,
      plugins: ['@babel/plugin-proposal-optional-chaining'],
      exclude: '**/node_modules/**',
      babelHelpers: 'bundled',
    }),
    commonjs: commonjs(),
  }

  // Override plugins
  for (const overrideKey in overrides) {
    basePlugins[overrideKey] = overrides[overrideKey]
  }

  // Convert plugins object to array
  const pluginStack = []
  for (const i in basePlugins) {
    // Allows plugins to be excluded by replacing them with falsey values
    if (basePlugins[i]) {
      pluginStack.push(basePlugins[i])
    }
  }

  // Replace values
  const replaceValues = {
    'process.env.DIST_ENV': JSON.stringify(true),
    'process.env.NPM_PACKAGE_VERSION': JSON.stringify(version),
  }
  if (mode) {
    replaceValues['process.env.NODE_ENV'] = JSON.stringify(mode)
  }
  pluginStack.push(replace({
    preventAssignment: true,
    values: replaceValues,
  }))

  // Cleanup
  pluginStack.push(forceCleanup())

  return pluginStack

}

const config = [
  {
    // CommonJS
    input: INPUT_FILE,
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      exports: 'named',
    },
    external: EXTERNAL_LIBS,
    plugins: getPlugins(),
  },
  {
    // EcmaScript
    input: INPUT_FILE,
    output: {
      file: 'dist/es/index.js',
      format: 'es',
      exports: 'named',
    },
    external: EXTERNAL_LIBS,
    plugins: getPlugins(),
  },
]

export default config

function forceCleanup() {
  return {
    name: 'forceCleanup',
    transform: (code, id) => {
      if (id.includes('tslib')) {
        return new Promise((resolve) => {
          const indexOfFirstCommentCloseAsterisk = code.indexOf('*/')
          if (indexOfFirstCommentCloseAsterisk >= 0) {
            // +2 to include the 2 searched characters as well
            code = code.substring(
              indexOfFirstCommentCloseAsterisk + 2,
              code.length
            )
          }
          resolve({ code })
        })
      }
      return null
    },
  }
}
