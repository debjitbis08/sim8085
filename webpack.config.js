var path                 = require( 'path' );
var webpack              = require( 'webpack' );
var { merge }            = require( 'webpack-merge' );
var HtmlWebpackPlugin    = require( 'html-webpack-plugin' );
var autoprefixer         = require( 'autoprefixer' );
var MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
var CopyWebpackPlugin    = require( 'copy-webpack-plugin' ); 
const CopyPlugin = require('copy-webpack-plugin');

console.log( 'WEBPACK GO!');

// detemine build env
var TARGET_ENV = process.env.npm_lifecycle_event === 'build' ? 'production' : 'development';

// common webpack config
var commonConfig = {

    output: {
        path:       path.resolve( __dirname, 'dist/' ),
        filename: '[contenthash].js',
    },

    resolve: {
        modules: ['node_modules'],
        extensions: ['.js', '.elm']
    },

    module: {
        noParse: /\.elm$/,
        rules: [
            {
                test: /\.(eot|ttf|woff|woff2|svg)$/,
                use: 'file-loader?publicPath=../../&name=static/css/[hash].[ext]'
            }
        ]
    },

    plugins: [
        new CopyPlugin([
            { from: "src/core/8085.wasm" },
            path.resolve(__dirname, "static")
        ]),

        new WasmPackPlugin({
            crateDirectory: __dirname,
        }),

        new webpack.LoaderOptionsPlugin({
            options: {
                postcss: [autoprefixer()]
            }
        }),
        new HtmlWebpackPlugin({
            template: 'src/static/index.html',
            inject:   'body',
            filename: 'index.html'
        })
    ],
    
    externals: {
        'fs': true,
        'path': true,
    }
};

// additional webpack settings for local env (when invoked by 'npm start')
if ( TARGET_ENV === 'development' ) {
    console.log( 'Serving locally...');

    module.exports = merge( commonConfig, {

        entry: [
            'webpack-dev-server/client?http://localhost:8080',
            path.join( __dirname, 'src/static/index.js' )
        ],

        devServer: {
            inline:   true,
            progress: true,
            contentBase: "dist"
        },

        module: {
            rules: [
                {
                    test:    /\.elm$/,
                    exclude: [/elm-stuff/, /node_modules/],
                    use: [
                        {
                            loader: "elm-hot-webpack-loader"
                        },
                        {
                            loader:
                                "elm-webpack-loader"
                        }
                    ]
                },
                {
                    test: /\.sc?ss$/,
                    use: [
                        { loader: 'style-loader' }, 
                        { loader: 'css-loader' },
                        { loader: 'postcss-loader' },
                        { loader: 'sass-loader' }
                    ]
                }
            ]
        }

    });
}

// additional webpack settings for prod env (when invoked via 'npm run build')
if ( TARGET_ENV === 'production' ) {
    console.log( 'Building for prod...');

    module.exports = merge( commonConfig, {

        entry: path.join( __dirname, 'src/static/index.js' ),

        module: {
            loaders: [
                {
                    test:    /\.elm$/,
                    exclude: [/elm-stuff/, /node_modules/],
                    loader:  'elm-webpack-loader'
                },
                {
                    test: /\.sc?ss$/,
                    use: ExtractTextPlugin.extract({
                        fallback: 'style-loader',
                        use: ['css-loader', 'postcss-loader', 'sass-loader']
                    })
                }
            ]
        },

        plugins: [
            new MiniCssExtractPlugin({
                filename: 'static/css/[name]-[hash].css',
                allChunks: true,
            }),
            new CopyWebpackPlugin([{
                from: 'src/static/img/',
                to: 'static/img/'
            }, {
                from: 'src/favicon.ico'
            }]),

            // extract CSS into a separate file
            // minify & mangle JS/CSS
            new webpack.optimize.UglifyJsPlugin({
                minimize: true,
                compressor: {
                    warnings: false
                },
                mangle:  true
            })
        ]

    });
}
