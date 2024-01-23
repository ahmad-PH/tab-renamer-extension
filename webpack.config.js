const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';
  const outputPath = isProduction ? 'dist/prod' : 'dist/dev';

  return {
    entry: {
      contentScript: './src/contentScript.js',
      background: './src/background.js',
    },

    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, outputPath)
    },

    devtool: 'source-map',

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
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

    resolve: {
      extensions: ['.js', '.jsx'],
    },

    plugins: [
      new webpack.DefinePlugin({
        'WEBPACK_MODE': JSON.stringify(argv.mode)
      }),
      new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'manifest.json'), to: 'manifest.json' },
          { from: path.resolve(__dirname, 'assets/'), to: 'assets/' },
        ],
      }),
    ],
  };
};