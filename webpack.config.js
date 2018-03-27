const path = require('path')

process.env.BABEL_ENV = 'browser'

module.exports = {
  externals: {
    'mz/fs': 'Object'
  },
  entry: [
    'babel-polyfill', // To support IE 11
    path.join(__dirname, 'src', 'index.js')
  ],
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
        resource: {
          and: [
            { test: /\.js$/ },
            {
              include: [
                // indent-string and figures use the arrow syntax which isn't supported in IE 11
                path.join(__dirname, 'node_modules', 'indent-string'),
                path.join(__dirname, 'node_modules', 'figures'),

                path.join(__dirname, 'src'),
              ],
            },
          ],
        },
      },
    ],
  },
  node: {
    child_process: 'empty',
    fs: 'empty',
    readline: 'empty',
  },
}
