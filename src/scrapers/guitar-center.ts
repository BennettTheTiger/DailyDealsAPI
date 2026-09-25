import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";

interface EmProduct {
  displayName?: string;
  price?: string;
  regularPrice?: string;
  savings?: string;
  thumb?: string;
  path?: string;
}

interface EmSection {
  cartridge?: string;
  products?: EmProduct[];
}

interface HeadlinerData {
  emPageData?: {
    Section?: EmSection[];
  };
}

export class GuitarCenterScraper extends BaseScraper {
  retailer = "Guitar-Center";
  private url = "https://www.guitarcenter.com/Daily-Pick.gc";
  private headlinerEndpoint =
    "https://rst.guitarcenter.com/rest/model/ngp/rest/actor/SearchActor/emTemplateJSON?includePath=/pages/AppHeadlinerDeals";
  private baseUrl = "https://www.guitarcenter.com";

  async scrape(): Promise<Deal[]> {
    try {
      const response = await fetch(this.headlinerEndpoint, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "application/json",
          "Referer": this.url,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - The site may be blocking requests`);
      }

      const headlinerData = (await response.json()) as HeadlinerData;
      const sections = headlinerData?.emPageData?.Section ?? [];
      // Match the site's own client-side filter by cartridge rather than assuming a fixed index.
      const targetterSection = sections.find((section) => section.cartridge === "MobileTargetter");
      const product = targetterSection?.products?.[0];

      if (!product) {
        throw new Error("No daily pick product found in Guitar Center response.");
      }

      const name = (product.displayName || "").trim();
      const newPrice = (product.price || "").trim();
      const retailPrice = (product.regularPrice || "").trim();
      const savings = (product.savings || "").trim();
      const imgUrl = this.normalizeUrl(product.thumb || "");
      const url = this.normalizeUrl(product.path || "");

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
        image: imgUrl || undefined,
        description: savings || undefined,
        scrapedAt: new Date().toISOString(),
      };

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

  private normalizeUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return this.baseUrl + (url.startsWith("/") ? url : `/${url}`);
  }
}

