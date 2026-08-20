import { scraperManager } from "../cache/scraper-manager.js";
import { Deal, ScraperResult } from "../types/index.js";
import { MongoDealStore } from "./mongo-deal-store.js";

export interface ScrapeSummary {
  totalRetailers: number;
  successCount: number;
  failedRetailers: string[];
  dealCount: number;
  deals: Deal[];
  results: ScraperResult[];
  persistedCount?: number;
  savedToMongo: boolean;
  scrapedAt: string;
}

export function summarizeScrapeResults(results: ScraperResult[]): ScrapeSummary {
  const successful = results.filter((result) => result.success);
  const failedRetailers = results
    .filter((result) => !result.success)
    .map((result) => result.retailer);

  const deals = successful
    .flatMap((result) => result.deals)
    .sort(
      (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
    );

  return {
    totalRetailers: successful.length,
    successCount: successful.length,
    failedRetailers,
    dealCount: deals.length,
    deals,
    results,
    savedToMongo: false,
    scrapedAt: new Date().toISOString(),
  };
}

export async function runScrapeAndPersist(options: {
  saveToMongo?: boolean;
  mongoStore?: MongoDealStore;
} = {}): Promise<ScrapeSummary> {
  const results = await scraperManager.scrapeAll();
  const summary = summarizeScrapeResults(results);
  const shouldSave =
    options.saveToMongo ?? (process.env.MONGODB_URI !== undefined || process.env.MONGODB_DB_NAME !== undefined);

  if (!shouldSave) {
    return summary;
  }

  const mongoStore = options.mongoStore ?? new MongoDealStore();
  await mongoStore.connect();

  try {
    const persistedCount = await mongoStore.saveDeals(summary.deals);
    summary.persistedCount = persistedCount;
    summary.savedToMongo = true;
    return summary;
  } finally {
    if (!options.mongoStore) {
      await mongoStore.disconnect();
    }
  }
}
