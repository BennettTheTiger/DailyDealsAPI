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
    const normalizedTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    const seed = `${retailer.toLowerCase()}-${normalizedTitle || "deal"}`;
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    return `${retailer.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.abs(hash).toString(36)}`;
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
