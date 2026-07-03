import * as cheerio from "cheerio";
import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";
import { Impit } from 'impit';

const ENHANCED_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-CH-UA": '"Not A(Brand";v="99", "Google Chrome";v="126", "Chromium";v="126"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Referer": "https://www.google.com/",
};

export class GuitarCenterScraper extends BaseScraper {
  retailer = "Guitar-Center";
  private url = "https://www.guitarcenter.com/Daily-Pick.gc";

  // Set up the Impit instance for headless browser scraping with enhanced anti-bot headers
  impit = new Impit({
    browser: "chrome",
    ignoreTlsErrors: true,
    headers: ENHANCED_HEADERS,
  });

  async scrape(): Promise<Deal[]> {
    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await this.impit.fetch(this.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - The site may be blocking requests`);
      }

      const html = await response.text();

      const $ = cheerio.load(html);
      let container = $(".daily-pick-content").first();

      if (!container.length) {
        container = $("body");
      }

      // Extract image URL with fallbacks
      const imgUrl =
        this.firstAttr(container, ".bg-std-white img[src*='guitarcenter.com']", "src") ||
        this.firstAttr(
          container,
          "img[src*='guitarcenter.com']:not([src*='daily-pick']):not([src$='.gif'])",
          "src"
        ) || "";

      // Extract savings information
      const savings = this.firstText(container, [".product-sticker"]) || "";

      // Extract product name with multiple fallbacks
      const name =
        this.firstText(container, ["a h2", "h2"]) ||
        $(".daily-pick-content img[alt]").attr("alt") ||
        $(".daily-pick-content h2").text().trim() ||
        "";

      // Extract product URL
      const relativeHref =
        this.firstAttr(container, "a[href*='.gc']", "href") ||
        $(".daily-pick-content a[href*='.gc']")
          .first()
          .attr("href") || "";

      const url = relativeHref.startsWith("http")
        ? relativeHref
        : `https://www.guitarcenter.com${relativeHref}`;

      // Extract new price
      const newPrice =
        this.firstText(container, ["p.text-std-red-200", ".text-std-red-200"]) ||
        (container.text().match(/\$\d[\d,]*\.\d{2}/g) || [])[0] ||
        "";

      // Extract regular price
      const regularPriceContainer = container
        .find("p")
        .filter((_, el) => $(el).text().includes("Regular Price:"))
        .first();

      const retailPrice =
        regularPriceContainer.find("span").last().text().trim() ||
        (container.text().match(/Regular Price:\s*(\$\d[\d,]*\.\d{2})/) || [])[1] ||
        "";

      if (!name || !newPrice) {
        throw new Error("Failed to extract required deal fields from Guitar Center");
      }

      const deal: Deal = {
        id: this.generateId(name, this.retailer),
        retailer: this.retailer,
        title: name,
        price: newPrice || undefined,
        originalPrice: retailPrice || undefined,
        url: url || this.url,
        image: imgUrl
          ? imgUrl.startsWith("http")
            ? imgUrl
            : `https://www.guitarcenter.com${imgUrl}`
          : undefined,
        description: savings || undefined,
        scrapedAt: new Date().toISOString(),
      };

      // Calculate discount if possible
      if (retailPrice && newPrice) {
        const discount = this.calculateDiscount(retailPrice, newPrice);
        if (discount) {
          deal.discountPercent = discount.percent;
          deal.discount = discount.amount;
        }
      }

      return [deal];
    } catch (error) {
      console.error("Error scraping Guitar Center:", error);
      throw error;
    }
  }

  private firstAttr(
    container: cheerio.Cheerio<any>,
    selector: string,
    attr: string
  ): string {
    const result = container.find(selector).first().attr(attr);
    return result ? result.trim() : "";
  }

  private firstText(container: cheerio.Cheerio<any>, selectors: string[]): string {
    for (const selector of selectors) {
      const text = container.find(selector).first().text().trim();
      if (text) return text;
    }
    return "";
  }
}
