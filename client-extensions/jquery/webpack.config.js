const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './src/app.js',
    output: {
        filename: 'app.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Clears the output directory before building
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'], // Extracts CSS to a file
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
        }),
        new MiniCssExtractPlugin({
            filename: 'app.bundle.css', // Output CSS bundle name
        }),
    ],
};