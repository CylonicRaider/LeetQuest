import pino from "pino";

// TODO: perhaps adjust logging level based on NODE_ENV

export default pino({ level: "info", browser: { asObject: false } });
