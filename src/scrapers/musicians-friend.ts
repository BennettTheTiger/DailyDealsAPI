// import * as cheerio from "cheerio";
import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";

export class MusiciansFreeScraper extends BaseScraper {
  retailer = "Musician's Friend";
  private url = "https://www.musiciansfriend.com/deals";

  async scrape(): Promise<Deal[]> {
    try {
      const response = await fetch(this.url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    //   const html = await response.text();
    //   const $ = cheerio.load(html);
      const deals: Deal[] = [];

      // Adjust selectors based on Musician's Friend current structure
    //   $(".dealItem, .deal-card, [data-test-id='dealCard']").each(
    //     (index, element) => {
    //       try {
    //         const $element = $(element);

    //         const title = $element
    //           .find(".product-name, h2, h3, .title")
    //           .text()
    //           .trim() || "";

    //         const priceText = $element
    //           .find(".price, .sale-price, [data-test-id='price']")
    //           .first()
    //           .text()
    //           .trim() || "";

    //         const originalPriceText = $element
    //           .find(".original-price, .regular-price")
    //           .text()
    //           .trim() || "";

    //         const url =
    //           $element.find("a").first().attr("href") ||
    //           $element.data("url") ||
    //           "";

    //         const imageUrl =
    //           $element.find("img").first().attr("src") ||
    //           $element.find("[data-test-id='image']").attr("src") ||
    //           "";

    //         const description = $element
    //           .find(".description, .product-description")
    //           .first()
    //           .text()
    //           .trim() || "";

    //         if (title) {
    //           const deal: Deal = {
    //             id: this.generateId(title, this.retailer),
    //             retailer: this.retailer,
    //             title,
    //             price: priceText || undefined,
    //             originalPrice: originalPriceText || undefined,
    //             url: url
    //               ? url.startsWith("http")
    //                 ? url
    //                 : `https://www.musiciansfriend.com${url}`
    //               : undefined,
    //             image: imageUrl
    //               ? imageUrl.startsWith("http")
    //                 ? imageUrl
    //                 : `https://www.musiciansfriend.com${imageUrl}`
    //               : undefined,
    //             description: description || undefined,
    //             scrapedAt: new Date().toISOString(),
    //           };

    //           // Calculate discount if possible
    //           if (originalPriceText && priceText) {
    //             const discount = this.calculateDiscount(
    //               originalPriceText,
    //               priceText
    //             );
    //             if (discount) {
    //               deal.discountPercent = discount.percent;
    //               deal.discount = discount.amount;
    //             }
    //           }

    //           deals.push(deal);
    //         }
    //       } catch (error) {
    //         console.error(
    //           "Error parsing Musician's Friend deal element:",
    //           error
    //         );
    //       }
    //     }
    //   );

      return deals;
    } catch (error) {
      console.error("Error scraping Musician's Friend:", error);
      throw error;
    }
  }
}
