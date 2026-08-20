import "dotenv/config";
import { runScrapeAndPersist } from "../services/scrape-orchestrator.js";

async function main(): Promise<void> {
  const summary = await runScrapeAndPersist();

  console.log(JSON.stringify(
    {
      success: true,
      scrapedAt: summary.scrapedAt,
      totalRetailers: summary.totalRetailers,
      dealCount: summary.dealCount,
      failedRetailers: summary.failedRetailers,
      persistedCount: summary.persistedCount ?? 0,
      savedToMongo: summary.savedToMongo,
    },
    null,
    2
  ));
}

main().catch((error) => {
  console.error("Scrape failed:", error);
  process.exit(1);
});
