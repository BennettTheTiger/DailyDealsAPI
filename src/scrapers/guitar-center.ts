import * as cheerio from "cheerio";
import { Deal } from "../types/index.js";
import { BaseScraper } from "./base.js";

export class GuitarCenterScraper extends BaseScraper {
  retailer = "Guitar Center";
  private url = "https://www.guitarcenter.com/Daily-Deals.gc";

  async scrape(): Promise<Deal[]> {
    try {
      const response = await fetch(this.url, {
        headers: { "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const deals: Deal[] = [];

      $("[data-test-id='dailyDealCard'], .deal-card, .product-item").each(
        (index, element) => {
          try {
            const $element = $(element);

            const title =
              $element
                .find("h2, h3, .product-name, [data-test-id='title']")
                .text()
                .trim() ||
              $element.find("a").first().text().trim() ||
              "";

            const priceText = $element
              .find(".price, [data-test-id='price'], .sale-price")
              .first()
              .text()
              .trim() || "";

            const originalPriceText = $element
              .find(".original-price, .regular-price, [data-test-id='original-price']")
              .text()
              .trim() || "";

            const url =
              $element.find("a").first().attr("href") ||
              $element.data("url") ||
              "";

            const imageUrl =
              $element.find("img").first().attr("src") ||
              $element.find("[data-test-id='image']").attr("src") ||
              "";

            const description = $element
              .find(".description, .product-description, p")
              .first()
              .text()
              .trim() || "";

            if (title) {
              const deal: Deal = {
                id: this.generateId(title, this.retailer),
                retailer: this.retailer,
                title,
                price: priceText || undefined,
                originalPrice: originalPriceText || undefined,
                url: url
                  ? url.startsWith("http")
                    ? url
                    : `https://www.guitarcenter.com${url}`
                  : undefined,
                image: imageUrl
                  ? imageUrl.startsWith("http")
                    ? imageUrl
                    : `https://www.guitarcenter.com${imageUrl}`
                  : undefined,
                description: description || undefined,
                scrapedAt: new Date().toISOString(),
              };

              // Calculate discount if possible
              if (originalPriceText && priceText) {
                const discount = this.calculateDiscount(
                  originalPriceText,
                  priceText
                );
                if (discount) {
                  deal.discountPercent = discount.percent;
                  deal.discount = discount.amount;
                }
              }

              deals.push(deal);
            }
          } catch (error) {
            console.error("Error parsing Guitar Center deal element:", error);
          }
        }
      );

      return deals;
    } catch (error) {
      console.error("Error scraping Guitar Center:", error);
      throw error;
    }
  }
}
