import { resolve as _resolve, join, dirname } from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function (par1, par2) {
  return {
    cache: false,
    plugins: [new HtmlWebpackPlugin({ template: './public/index.html' }), new ForkTsCheckerWebpackPlugin()],
    mode: par2.mode ?? 'developemnt',
    // devtool: 'eval-source-map',
    devtool: 'source-map',
    entry: './src/index.tsx',
    output: {
      path: _resolve(__dirname, 'dist'),
      filename: 'build.js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
            },
            // 'ts-loader',
          ],
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      modules: ['node_modules'],

      extensions: ['.tsx', '.ts', '.js'],
    },
    devServer: {
      open: true,
      static: {
        directory: join(__dirname, 'public'),
      },
      compress: true,
      port: 8086,
    },
  }
}
