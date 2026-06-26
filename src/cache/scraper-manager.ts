import { BaseScraper } from "../scrapers/base.js";
import { GuitarCenterScraper } from "../scrapers/guitar-center.js";
import { MusiciansFreeScraper } from "../scrapers/musicians-friend.js";
import { Deal, ScraperResult } from "../types/index.js";
import { cacheService } from "./cache.js";

export class ScraperManager {
  private scrapers: Map<string, BaseScraper>;
  private cacheKeyPrefix = "deals:";

  constructor() {
    this.scrapers = new Map();
    this.registerScraper(new GuitarCenterScraper());
    this.registerScraper(new MusiciansFreeScraper());
  }

  /**
   * Register a new scraper
   */
  registerScraper(scraper: BaseScraper): void {
    this.scrapers.set(scraper.retailer.toLowerCase(), scraper);
  }

  /**
   * Get all registered scrapers
   */
  getAvailableScrapers(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Scrape a specific retailer with caching
   */
  async scrapeRetailer(retailer: string): Promise<ScraperResult> {
    const key = this.getCacheKey(retailer);

    // Check cache first
    const cached = cacheService.getDeals(key);
    if (cached) {
      return {
        retailer,
        deals: cached,
        scrapedAt: new Date().toISOString(),
        success: true,
        error: undefined,
      };
    }

    const scraper = this.scrapers.get(retailer.toLowerCase());
    if (!scraper) {
      return {
        retailer,
        deals: [],
        scrapedAt: new Date().toISOString(),
        success: false,
        error: `Scraper for "${retailer}" not found`,
      };
    }

    try {
      const deals = await scraper.scrape();
      cacheService.setDeals(key, deals);

      return {
        retailer,
        deals,
        scrapedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        retailer,
        deals: [],
        scrapedAt: new Date().toISOString(),
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Scrape all registered retailers
   */
  async scrapeAll(): Promise<ScraperResult[]> {
    const results = await Promise.all(
      Array.from(this.scrapers.keys()).map((retailer) =>
        this.scrapeRetailer(retailer)
      )
    );
    return results;
  }

  /**
   * Get all deals from cache or scrape if not cached
   */
  async getAllDeals(): Promise<Deal[]> {
    const results = await this.scrapeAll();
    return results
      .filter((r) => r.success)
      .flatMap((r) => r.deals)
      .sort(
        (a, b) =>
          new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
      );
  }

  /**
   * Get cached deals for a retailer
   */
  getCachedDeals(retailer: string): Deal[] | undefined {
    return cacheService.getDeals(this.getCacheKey(retailer));
  }

  /**
   * Clear cache for a retailer
   */
  clearRetailerCache(retailer: string): void {
    cacheService.clearDeals(this.getCacheKey(retailer));
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    cacheService.clearAll();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  private getCacheKey(retailer: string): string {
    return `${this.cacheKeyPrefix}${retailer.toLowerCase()}`;
  }
}

// Singleton instance
export const scraperManager = new ScraperManager();
