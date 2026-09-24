import "dotenv/config";

const RUN_SERVER = process.env.RUN_SERVER !== "false"; // default: true
const RUN_SCRAPER = process.env.RUN_SCRAPER === "true"; // default: false

async function main() {
  if (RUN_SCRAPER && !RUN_SERVER) {
    // Scraper-only mode: run once and exit
    console.log("🔄 Running in SCRAPER-ONLY mode (will run once and exit)");
    const { runScrapeAndPersist } = await import("./services/scrape-orchestrator.js");
    const { updateGoogleSheet } = await import("./cli/google-sheet-writer.js");
    const { notifyScrapeFailures } = await import("./notifications/discord.js");

    const summary = await runScrapeAndPersist();

    try {
      await notifyScrapeFailures(summary.results);
    } catch (error) {
      console.warn("Discord scrape alert failed:", error instanceof Error ? error.message : error);
    }

    let sheetUpdate: { spreadsheetId: string; tabName: string; rowCount: number } | undefined;

    if (process.env.GOOGLE_SHEET_ID && summary.newDeals.length > 0) {
      try {
        sheetUpdate = await updateGoogleSheet(summary.newDeals);
      } catch (error) {
        console.warn("Google Sheets update failed:", error instanceof Error ? error.message : error);
      }
    }

    console.log(JSON.stringify(
      {
        success: true,
        scrapedAt: summary.scrapedAt,
        totalRetailers: summary.totalRetailers,
        dealCount: summary.dealCount,
        newDealCount: summary.newDeals.length,
        failedRetailers: summary.failedRetailers,
        sheetUpdate,
      },
      null,
      2
    ));

    process.exit(0);
  }

  if (RUN_SERVER) {
    // Server mode (with optional scraper via cron)
    console.log("🌐 Running in SERVER mode on port", process.env.PORT || 3000);
    if (RUN_SCRAPER) {
      console.log("📋 Scraper will run via cron (not integrated into server)");
    }
    const { default: Fastify } = await import("fastify");
    const fastifySwagger = await import("@fastify/swagger");
    const fastifySwaggerUi = await import("@fastify/swagger-ui");
    const { registerHealthRoutes } = await import("./routes/health.js");
    const { registerDealsRoutes } = await import("./routes/deals.js");
    const { registerCacheRoutes } = await import("./routes/cache.js");
    const { registerScrapeRoutes } = await import("./routes/scrape.js");
    const { swaggerOptions, swaggerUiOptions } = await import("./swagger/swagger-config.js");

    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    const fastify = Fastify({
      logger: true,
    });

    // Register Swagger documentation
    await fastify.register(fastifySwagger.default, swaggerOptions);
    await fastify.register(fastifySwaggerUi.default, swaggerUiOptions);

    // Register all routes
    await registerHealthRoutes(fastify);
    await registerDealsRoutes(fastify);
    await registerCacheRoutes(fastify);
    await registerScrapeRoutes(fastify);

    // Start server
    try {
      await fastify.listen({ port: PORT, host: HOST });
      console.log(`Server running at http://${HOST}:${PORT}`);
      console.log(`API Documentation at http://${HOST}:${PORT}/documentation`);
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  }

  if (!RUN_SERVER && !RUN_SCRAPER) {
    console.error("❌ Error: Either RUN_SERVER or RUN_SCRAPER must be enabled");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
