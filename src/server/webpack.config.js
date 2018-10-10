const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/server.js',
  target: 'node',
  mode: 'production',
  output: {
    filename: 'server.js',
    path: path.resolve(__dirname, '../../dist/ghmattibanking'),
  },
  optimization: {
    minimize: false,
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'src/static' },
    ]),
  ],
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              // ['minify-mangle-names', { topLevel: true }], 'transform-merge-sibling-variables',
              // 'transform-minify-booleans', 'minify-simplify',
            ],
            presets: [[
              '@babel/preset-env',
              {
                targets: {
                  node: true,
                },
              },
            ]],
            comments: false,
            compact: true,
          },
        },
      },
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              'minify-mangle-names', 'transform-merge-sibling-variables',
              'transform-minify-booleans',
            ],
            presets: [[
              '@babel/preset-env',
              {
                targets: {
                  node: true,
                },
              },
            ]],
            comments: false,
            compact: true,
          },
        },
      },
    ],
  },
};
