import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// JSON logs in production (parseable by Render's log viewer / any log
// aggregator); colorized, human-readable logs in local dev.
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
});
