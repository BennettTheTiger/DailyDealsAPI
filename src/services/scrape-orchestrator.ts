import { scraperManager } from "../cache/scraper-manager.js";
import { Deal, ScraperResult } from "../types/index.js";

export interface ScrapeSummary {
  totalRetailers: number;
  successCount: number;
  failedRetailers: string[];
  dealCount: number;
  deals: Deal[];
  results: ScraperResult[];
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
    scrapedAt: new Date().toISOString(),
  };
}

export async function runScrapeAndPersist(): Promise<ScrapeSummary> {
  const results = await scraperManager.scrapeAll();
  return summarizeScrapeResults(results);
}
