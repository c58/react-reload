import babel from 'rollup-plugin-babel'
import copy from 'rollup-plugin-copy'
import pkg from './package.json'

export default [
  // CommonJS
  {
    input: 'src/index.js',
    output: {
      file: 'lib/react-reload.js',
      format: 'cjs',
      indent: false,
      exports: 'named',
    },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      babel(),
      copy({
        targets: {
          'src/index.js.flow': 'lib/react-reload.js.flow',
        }
      })
    ]
  },

  // ES
  {
    input: 'src/index.js',
    output: {
      file: 'es/react-reload.js',
      format: 'es',
      indent: false
    },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      babel(),
      copy({
        targets: {
          'src/index.js.flow': 'es/react-reload.js.flow',
        }
      })
    ]
  }
]
