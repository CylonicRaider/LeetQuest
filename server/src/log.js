import pino from "pino";
import pinoHttp from "pino-http";

// TODO: consider writing errors and warnings to a file for production

const LOGGER = pino({ level: process.env.LOG_LEVEL || "info" });

export default LOGGER;

export const http = pinoHttp({ logger: LOGGER });
