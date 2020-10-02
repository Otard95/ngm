const path = require('path')

module.exports = {
  entry: './.cache/index.js',
  output: {
    path: path.resolve(__dirname, 'build/prod'),
    filename: 'ngm.js'
  },
  mode: 'production',
  target: 'node'
}