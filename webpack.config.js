const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const dotenv = require('dotenv');
dotenv.config();

module.exports = (_env, argv) => {
    const isProduction = argv.mode === 'production';
    const outputPath = isProduction ? 'dist/prod' : 'dist/dev';
    const entries =  {
        contentScript: './src/contentScript/contentScript.tsx',
        initializationContentScript: './src/contentScript/initializationContentScript.ts',
        background: './src/background/background.ts',
        settings: './src/settings/settings.tsx',
    };

    // Marking certain entries as special, by marking their "chunk.name", and mapping to the folder
    // they should go to under "src".
    const specialEntryPrefixes = {
        "settings": "settings/",
    }
    
    const shadowRootStyleLoader = {
        loader: 'style-loader',
        options: {
            insert: function(element) {
                // eslint-disable-next-line no-undef
                document.querySelector("tab-renamer-root").shadowRoot.appendChild(element);
            }
        }
    };

    const moduleCssLoader = {
        loader: 'css-loader',
        options: {
            modules: {
                localIdentName: isProduction ? '[name]--[local]--[hash:base64]' : '[name]--[local]--[hash:base64:5]' // For easier debugging
            },
        },
    };

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
                    test: /\.(js|jsx|ts|tsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                    },
                },
                {
                    test: /\.svg$/,
                    type: 'asset',
                },


                // ================= CSS (and Module CSS) files: =================

                { // .css files inside contentScript
                    test: /contentScript\/.*\.css$/,
                    exclude: /contentScript\/.*\.module\.css$/,
                    use: [shadowRootStyleLoader, 'css-loader'],
                },
                { // module.css files inside contentScript
                    test: /contentScript\/.*\.module\.css$/,
                    use: [shadowRootStyleLoader, moduleCssLoader],
                },
                { // .css files, outside contentScript
                    test: /\.css$/,
                    exclude: [/\.module\.css$/, /contentScript\/.*\.css$/],
                    use: ['style-loader', 'css-loader'],
                },
                { // module.css files outside contentScript
                    test: /\.module\.css$/,
                    exclude: /contentScript\/.*\.module\.css$/,
                    use: ['style-loader', moduleCssLoader],
                },
            ],
        },
        
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        
        plugins: [
            new webpack.DefinePlugin({
                'WEBPACK_MODE': JSON.stringify(argv.mode),
                'process.env.LOG_TO_DD': JSON.stringify(process.env.LOG_TO_DD),
                // Conditionally add env variables only for development
                ...(isProduction ? {} : {
                    'process.env.DD_API_KEY': JSON.stringify(process.env.DD_API_KEY),
                    'process.env.DD_APP_KEY': JSON.stringify(process.env.DD_APP_KEY),
                    'process.env.DD_SITE': JSON.stringify(process.env.DD_SITE),
                    'process.env.DD_CLIENT_TOKEN': JSON.stringify(process.env.DD_CLIENT_TOKEN),
                })
            }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'manifest.json'), to: 'manifest.json' },
                { 
                    from: path.resolve(__dirname, 'src/assets/'),
                    to: 'assets/',
                    transform: {
                        transformer(content, absoluteFrom) {
                            if (absoluteFrom.endsWith('.json') && isProduction) {
                                return JSON.stringify(JSON.parse(content.toString())); // minify
                            }
                            return content;
                        },
                    },
                },
                { from: path.resolve(__dirname, 'src/settings/settings.html'), to: 'settings/settings.html' },
                { from: path.resolve(__dirname, 'src/popup/popup.html'), to: 'popup/popup.html' },
            ],
        }),
        ],
    };
};