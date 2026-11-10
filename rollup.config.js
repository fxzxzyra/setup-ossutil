import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import license from 'rollup-plugin-license';

export default {
  input: 'src/index.ts',
  output: { file: 'dist/index.js', format: 'es' },
  plugins: [
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    license({
      banner: { content: { file: 'LICENSE' } },
      thirdParty: { output: 'dist/licenses.txt' },
    }),
  ],
};
