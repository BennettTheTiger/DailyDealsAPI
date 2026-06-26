import { Deal } from "../types/index.js";

/**
 * Abstract base class for retail scrapers
 */
export abstract class BaseScraper {
  abstract retailer: string;
  protected userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  abstract scrape(): Promise<Deal[]>;

  protected generateId(title: string, retailer: string): string {
    return `${retailer}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected calculateDiscount(
    original: string,
    current: string
  ): { percent: number; amount: string } | null {
    try {
      const origNum = parseFloat(original.replace(/[^\d.]/g, ""));
      const currNum = parseFloat(current.replace(/[^\d.]/g, ""));

      if (isNaN(origNum) || isNaN(currNum) || origNum === 0) return null;

      const percent = Math.round(((origNum - currNum) / origNum) * 100);
      const amount = (origNum - currNum).toFixed(2);

      return { percent, amount: `$${amount}` };
    } catch {
      return null;
    }
  }
}
