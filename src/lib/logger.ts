import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
} as any);

// Fallback if pino-pretty not installed
export function logInfo(msg: string, data?: any) {
  try {
    logger.info(data, msg);
  } catch {
    console.log(msg, data);
  }
}
export function logError(msg: string, err?: any) {
  try {
    logger.error(err, msg);
  } catch {
    console.error(msg, err);
  }
}
