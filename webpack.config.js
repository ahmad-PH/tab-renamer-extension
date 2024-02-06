const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => {
    const isProduction = argv.mode === 'production';
    const outputPath = isProduction ? 'dist/prod' : 'dist/dev';
    
    return {
        entry: {
            contentScript: './src/contentScript/contentScript.js',
            initializationContentScript: './src/contentScript/initializationContentScript.js',
            background: './src/background/background.js',
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
                    test: /^(?!.*\.module\.css$).*\.css$/, // All regular .css files (not matching .module.css files)
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.module\.css$/,
                    use: ['style-loader', {
                        loader: 'css-loader',
                        options: {modules: { localIdentName:
                            isProduction ? '[hash:base64]' : '[name]--[local]--[hash:base64:5]' // For easier debugging
                        }},
                    },],
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