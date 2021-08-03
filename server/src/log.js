import pino from "pino";

// TODO: consider writing errors and warnings to a file for production
// TODO: consider using express-pino-logger, pino-http OSLT

export default pino({ level: process.env.LOG_LEVEL || "info" });
