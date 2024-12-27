const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => {
    const isProduction = argv.mode === 'production';
    const outputPath = isProduction ? 'dist/prod' : 'dist/dev';
    const entries =  {
        contentScript: './src/contentScript/contentScript.js',
        initializationContentScript: './src/contentScript/initializationContentScript.js',
        background: './src/background/background.js',
        settings: './src/settings/settings.js',
    };

    // Marking certain entries as special, by marking their "chunk.name", and mapping to the folder
    // they should go to under "src".
    const specialEntryPrefixes = {
        "settings": "settings/",
    }
    
    return {
        entry: entries,
        
        output: {
            filename: (pathData) => {
                const specialPrefixEntry = specialEntryPrefixes[pathData.chunk.name];
                const prefix = specialPrefixEntry ? specialPrefixEntry : '';
                return `${prefix}[name].js`;
            },
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
                // {
                //     test: /^(?!.*\.module\.css$).*\.css$/, // All regular .css files (not matching .module.css files)
                //     use: ['style-loader', 'css-loader'],
                // },
                { // All regular .css files, excluding .module.css files
                    test: /\.css$/,
                    exclude: /\.module\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.module\.css$/,
                    exclude: /contentScript\/.*\.module\.css$/,
                    use: [
                        { loader: 'style-loader' },
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    localIdentName: isProduction ? '[name]--[local]--[hash:base64]' : '[name]--[local]--[hash:base64:5]' // For easier debugging
                                }, 
                            },
                    },],
                },
                {
                    test: /contentScript\/.*\.module\.css$/,
                    use: [
                        {
                            loader: 'style-loader',
                            options: {
                                insert: function(element) {
                                    // eslint-disable-next-line no-undef
                                    document.querySelector("tab-renamer-root").shadowRoot.appendChild(element);
                                }
                            }
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    localIdentName: isProduction ? '[name]--[local]--[hash:base64]' : '[name]--[local]--[hash:base64:5]' // For easier debugging
                                }, 
                            },
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
                    { from: path.resolve(__dirname, 'src/assets/'), to: 'assets/' },
                    {
                        from: path.resolve(__dirname, 'src/settings/'),
                        to: 'settings/',
                        globOptions: {
                            ignore: ['**/settings.js', '**/settings.module.css'],
                        },
                    },
                ],
            }),
        ],
    };
};