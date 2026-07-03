import * as cheerio from "cheerio";
import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";
import { Impit } from 'impit';

interface HeadlinerData {
  emPageData?: {
    Section?: Array<{ products?: Array<any> }>;
  };
}

interface PDPDetailData {
  data?: {
    PDPDetail?: {
      skuUrl?: string;
    };
  };
}

export class MusiciansFreeScraper extends BaseScraper {
  retailer = "Musician's Friend";
  private url = "https://www.musiciansfriend.com/stupid";
  private baseUrl = "https://www.musiciansfriend.com";
  private headlinerEndpoint =
    "https://rst.musiciansfriend.com/rest/model/ngp/rest/actor/SearchActor/emTemplateJSON?includePath=/pages/AppHeadlinerDeals";
  private pdpDetailsEndpoint =
    "https://www.musiciansfriend.com/rest/model/ngp/rest/actor/PDPDetailActor/getPDPDetailsCache?skuId=";

  // Set up the Impit instance for headless browser scraping with anti-bot headers
  impit = new Impit({
    browser: "chrome",
    ignoreTlsErrors: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    },
  });

  async scrape(): Promise<Deal[]> {
    try {
      const response = await this.impit.fetch(this.url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - The site may be blocking requests`);
      }

      const html = await response.text();

      if (/access denied|403|forbidden/i.test(html)) {
        throw new Error(
          "Musicians Friend returned Access Denied for this request fingerprint. The site may have anti-bot protection."
        );
      }

      const $ = cheerio.load(html);
      const hasHeadlinerConfig =
        html.includes("AppHeadlinerDeals") &&
        html.includes("getPDPDetailsCache?skuId=");

      if (!hasHeadlinerConfig) {
        throw new Error(
          "Musicians Friend page did not contain the expected deal data endpoints."
        );
      }

      // Fetch headliner data from API endpoint
      const headlinerResponse = await fetch(this.headlinerEndpoint, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "application/json",
          "Referer": this.url,
        },
      });

      if (!headlinerResponse.ok) {
        throw new Error(
          `Failed to fetch headliner data: ${headlinerResponse.status} - ${headlinerResponse.statusText}`
        );
      }

      const headlinerData = (await headlinerResponse.json()) as HeadlinerData;
      const product = headlinerData?.emPageData?.Section?.[1]?.products?.[0];

      if (!product) {
        throw new Error("No headliner product found in Musicians Friend response.");
      }

      // Fetch detailed product information
      const detailsResponse = await fetch(
        `${this.pdpDetailsEndpoint}${encodeURIComponent(product.skuId)}`,
        {
          headers: {
            "User-Agent": this.userAgent,
            "Accept": "application/json",
            "Referer": this.url,
          },
        }
      );

      if (!detailsResponse.ok) {
        throw new Error(
          `Failed to fetch product details: ${detailsResponse.status} - ${detailsResponse.statusText}`
        );
      }

      const detailsData = (await detailsResponse.json()) as PDPDetailData;
      const details = detailsData?.data?.PDPDetail;

      const name = this.normalizeWhitespace(product.displayName || "");
      const newPrice = this.normalizeWhitespace(product.price || "");
      const retailPrice = this.normalizeWhitespace(product.regularPrice || "");
      const savings = this.normalizeWhitespace(product.savings || "");

      const imgUrl = this.normalizeUrl(
        product.thumb || this.firstAttr($, "body", "img[src*='media.musiciansfriend.com']", "src"),
        this.baseUrl
      );

      const url = this.normalizeUrl(details?.skuUrl || this.url, this.baseUrl);

      if (!name || !newPrice) {
        throw new Error(
          "Failed to extract required deal fields from Musicians Friend"
        );
      }

      const deal: Deal = {
        id: this.generateId(name, this.retailer),
        retailer: this.retailer,
        title: name,
        price: newPrice || undefined,
        originalPrice: retailPrice || undefined,
        url: url || this.url,
        image: imgUrl || undefined,
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
      console.error("Error scraping Musicians Friend:", error);
      throw error;
    }
  }

  private firstAttr(
    $: cheerio.CheerioAPI,
    container: string,
    selector: string,
    attr: string
  ): string {
    const result = $(container).find(selector).first().attr(attr);
    return result ? result.trim() : "";
  }

  private normalizeWhitespace(text: string): string {
    return text.trim().replace(/\s+/g, " ");
  }

  private normalizeUrl(url: string, baseUrl: string): string {
    if (!url) return baseUrl;
    if (url.startsWith("http")) return url;
    return baseUrl + (url.startsWith("/") ? url : "/" + url);
  }
}
