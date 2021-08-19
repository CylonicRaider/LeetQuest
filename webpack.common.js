import CopyPlugin from "copy-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TODO: use html template plugin and then add splitChunks optimization
export default {
    entry: {
        main: "./client/src/index.js",
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: "./client/assets" }],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist/client"),
        clean: true,
    },
    optimization: {
        usedExports: true,
    },
};
