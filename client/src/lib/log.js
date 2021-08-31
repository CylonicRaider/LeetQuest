import pino from "pino";

const level = process.env.NODE_ENV == "production" ? "info" : "debug";

export default pino({ level: level, browser: { asObject: false } });
