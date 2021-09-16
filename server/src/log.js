import pino from "pino";
import pinoHttp from "pino-http";

import processHttpLog from "./httplog.js";

const HTTP_LOG_TOKEN = Symbol("HTTP_LOG_TOKEN");

const LOGGER = pino({
    level: process.env.LOG_LEVEL || "info",
    hooks: {
        logMethod(args, wrapped, _level) {
            if (args.length === 2 && args[1] === HTTP_LOG_TOKEN) {
                return wrapped.apply(this, processHttpLog(args[0]));
            }
            return wrapped.apply(this, args);
        },
    },
});

export default LOGGER;

export const http = pinoHttp({
    logger: LOGGER,
    customSuccessMessage: (_resp) => HTTP_LOG_TOKEN,
});
