import "dotenv/config";
import { runScrapeAndPersist } from "../services/scrape-orchestrator.js";
import { updateGoogleSheet } from "./google-sheet-writer.js";
import { notifyScrapeFailures } from "../notifications/discord.js";

async function main(): Promise<void> {
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

  // Open MongoClient connections keep the event loop alive; exit explicitly for cron.
  process.exit(0);
}

main().catch((error) => {
  console.error("Scrape failed:", error);
  process.exit(1);
});

// Safety net: force-exit if anything hangs past the driver's own timeouts,
// so a stalled hourly cron run can't pile up behind the next one.
setTimeout(() => {
  console.error("Timed out after 60s. Forcing exit.");
  process.exit(1);
}, 60_000).unref();
