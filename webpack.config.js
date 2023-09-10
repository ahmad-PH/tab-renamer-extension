const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    contentScript: './contentScript.js',
    background: './background.js',
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'manifest.json'), to: 'manifest.json' },
        { from: path.resolve(__dirname, 'assets/'), to: 'assets/' },
      ],
    }),
  ],
};