export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Node observability: pino + health
    const { logger } = await import("./src/lib/logger");
    logger.info("Kinara instrumentation registered - sovereign core online");
  }
}
