import type { Request } from "express";
import type { IncomingMessage } from "http";
import pinoHttp from "pino-http";
import { logger } from "./logger";

// req.url gets rewritten to be router-relative by Express as a request is
// dispatched through a mounted sub-router (app.use("/api/x", router)) and
// is only restored if the terminal handler calls next() — ours respond
// directly, so req.url would report "/" instead of the real path.
// req.originalUrl is never rewritten. pino-http's callbacks type req as the
// raw Node IncomingMessage, so it doesn't know about the Express property.
const requestLine = (req: IncomingMessage) =>
  `${req.method?.padEnd(6)}${(req as Request).originalUrl}`;

// Lines up "Status"/"Duration" under where the request line's method/url
// starts, and lines up their values under each other. Both depend on
// pino-pretty's default prefix "[HH:MM:SS] LEVEL: " (set by logger.ts's
// translateTime/ignore options) — "[HH:MM:SS] " is a constant 11 chars,
// and the level word is always "info"/"warn" (4 letters) in the success
// path or "error" (5 letters) in the error path, each followed by ": ".
const SUCCESS_INDENT = " ".repeat(11 + "info".length + 2); // matches "info"/"warn"
const ERROR_INDENT = " ".repeat(11 + "error".length + 2);
const LABEL_WIDTH = "Duration:".length + 1; // pads "Status:" to align under "Duration:"

const detailLine = (indent: string, label: string, value: string) =>
  `${indent}${label.padEnd(LABEL_WIDTH)}${value}`;

// One multiline entry per request. Method, path, status, and duration are
// written into the message exactly once — nothing else is attached, so
// there's no separate req/res object repeating the same values (and no
// risk of headers, cookies, or auth tokens ending up in the logs, since
// req/res are never serialized at all here).
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, responseTime) =>
    [
      requestLine(req),
      detailLine(SUCCESS_INDENT, "Status:", String(res.statusCode)),
      detailLine(SUCCESS_INDENT, "Duration:", `${responseTime}ms`),
    ].join("\n"),
  // pino-http's bundled types for this option omit the responseTime arg
  // even though it passes one at runtime (see node_modules/pino-http/logger.js,
  // `errorMessage(req, res, error, responseTime)`) — cast to pick it up.
  customErrorMessage: ((req: IncomingMessage, res: { statusCode: number }, err: Error, responseTime: number) =>
    [
      requestLine(req),
      detailLine(ERROR_INDENT, "Status:", String(res.statusCode)),
      detailLine(ERROR_INDENT, "Duration:", `${responseTime}ms`),
      detailLine(ERROR_INDENT, "Error:", err.message),
    ].join("\n")) as (
    req: IncomingMessage,
    res: { statusCode: number },
    error: Error
  ) => string,
  // Everything useful is already in the message above. `undefined` drops
  // the key entirely rather than logging an empty object.
  serializers: {
    req: () => undefined,
    res: () => undefined,
    responseTime: () => undefined,
  },
});
