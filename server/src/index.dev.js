// WARNING: This file is not covered by automated formatting because of the
//          special import order.
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

import webpackDevConfig from "../../webpack.dev.js";

import { middleware } from "./static.js";

const compiler = webpack(webpackDevConfig);
middleware.static = webpackDevMiddleware(compiler, {
    publicPath: webpackDevConfig.output.publicPath,
});

import "./index.js";
