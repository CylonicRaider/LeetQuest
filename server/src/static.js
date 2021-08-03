import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import webpackDevConfig from "../../webpack.dev.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

if (process.env.NODE_ENV === "production") {
    app.use(express.static(join(__dirname, "../../dist/client")));
} else {
    const compiler = webpack(webpackDevConfig);
    app.use(
        webpackDevMiddleware(compiler, {
            publicPath: webpackDevConfig.output.publicPath,
        }),
    );
}

export default app;
