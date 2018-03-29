const path = require('path')
const BabelEnginePlugin = require('babel-engine-plugin')

process.env.BABEL_ENV = 'browser'

module.exports = {
  externals: {
    'mz/fs': 'Object',
  },
  entry: path.join(__dirname, 'src', 'index.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'cucumber.js',
    library: 'Cucumber',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        loader: 'babel-loader',
        test: /\.js$/,
        exclude: /\/node_modules\//,
      },
    ],
  },
  plugins: [new BabelEnginePlugin()],
  node: {
    child_process: 'empty',
    fs: 'empty',
    readline: 'empty',
  },
}
