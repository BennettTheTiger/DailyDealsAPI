import "dotenv/config";
import { runScrapeAndPersist } from "../services/scrape-orchestrator.js";
import { updateGoogleSheet } from "./google-sheet-writer.js";

async function main(): Promise<void> {
  const summary = await runScrapeAndPersist();

  let sheetUpdate: { spreadsheetId: string; tabName: string; rowCount: number } | undefined;

  if (process.env.GOOGLE_SHEET_ID) {
    try {
      sheetUpdate = await updateGoogleSheet(summary.deals);
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
      failedRetailers: summary.failedRetailers,
      sheetUpdate,
    },
    null,
    2
  ));
}

main().catch((error) => {
  console.error("Scrape failed:", error);
  process.exit(1);
});
