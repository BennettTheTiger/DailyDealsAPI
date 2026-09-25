import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";

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

  async scrape(): Promise<Deal[]> {
    try {
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

      const imgUrl = this.normalizeUrl(product.thumb || "", this.baseUrl);

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

  private normalizeWhitespace(text: string): string {
    return text.trim().replace(/\s+/g, " ");
  }

  private normalizeUrl(url: string, baseUrl: string): string {
    if (!url) return baseUrl;
    if (url.startsWith("http")) return url;
    return baseUrl + (url.startsWith("/") ? url : "/" + url);
  }
}
