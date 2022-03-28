const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const autoprefixer = require("autoprefixer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

console.log("WEBPACK GO!");

// detemine build env
var TARGET_ENV =
    process.env.npm_lifecycle_event === "build" ? "production" : "development";

// common webpack config
var commonConfig = {
    experiments: {
        asyncWebAssembly: true,
    },

    output: {
        path: path.resolve(__dirname, "dist/"),
        filename: "[contenthash].js",
    },

    resolve: {
        modules: ["node_modules"],
        extensions: [".js", ".ts", ".tsx"],
        alias: {
            "core": path.resolve(__dirname, 'src/core/'),
            "components": path.resolve(__dirname, 'src/components/'),
            "common": path.resolve(__dirname, 'src/modules/common/'),
        },
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
            {
                test: /\.(eot|ttf|woff|woff2|svg)$/,
                use: "file-loader?publicPath=../../&name=static/css/[hash].[ext]",
            },
            {
                test: /\.png/,
                type: "asset/resource",
            },
            {
                test: /\.peggy/,
                loader: "@rocket.chat/peggy-loader"
            }
        ],
    },

    plugins: [
        new CopyPlugin([
            { from: "src/core/8085.wasm" },
            path.resolve(__dirname, "static"),
        ]),

        new WasmPackPlugin({
            crateDirectory: __dirname,
        }),

        new webpack.LoaderOptionsPlugin({
            options: {
                postcss: [autoprefixer()],
            },
        }),
        new HtmlWebpackPlugin({
            template: "public/index.html",
            inject: "body",
            filename: "index.html",
        }),
    ],

    externals: {
        fs: true,
        path: true,
    },
};

// additional webpack settings for local env (when invoked by 'npm start')
if (TARGET_ENV === "development") {
    console.log("Serving locally...");

    module.exports = merge(commonConfig, {
        mode: TARGET_ENV,

        entry: [
            "webpack-dev-server/client?http://localhost:8080",
            path.join(__dirname, "src/index.tsx"),
        ],

        devServer: {
            inline: true,
            progress: true,
            contentBase: "dist",
        },

        module: {
            rules: [
                {
                    test: /\.s?css$/,
                    use: [
                        { loader: "style-loader" },
                        { loader: "css-loader" },
                        { loader: "postcss-loader" },
                        { loader: "sass-loader" },
                    ],
                },
            ],
        },
    });
}

// additional webpack settings for prod env (when invoked via 'npm run build')
if (TARGET_ENV === "production") {
    console.log("Building for prod...");

    module.exports = merge(commonConfig, {
        entry: path.join(__dirname, "src/index.tsx"),

        module: {
            loaders: [
                {
                    test: /\.s?css$/,
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: ["css-loader", "postcss-loader", "sass-loader"],
                    }),
                },
            ],
        },

        plugins: [
            new MiniCssExtractPlugin({
                filename: "static/css/[name]-[hash].css",
                allChunks: true,
            }),
            new CopyWebpackPlugin([
                {
                    from: "public/img/",
                    to: "static/img/",
                },
                {
                    from: "public/favicon.ico",
                },
            ]),

            // extract CSS into a separate file
            // minify & mangle JS/CSS
            new webpack.optimize.UglifyJsPlugin({
                minimize: true,
                compressor: {
                    warnings: false,
                },
                mangle: true,
            }),
        ],
    });
}
