import pino from "pino";
import pinoHttp from "pino-http";

const LOGGER = pino({ level: process.env.LOG_LEVEL || "info" });

export default LOGGER;

export const http = pinoHttp({ logger: LOGGER });
