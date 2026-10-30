import "dotenv/config";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { Deal } from "../types/index.js";
import { dealDatabase } from "./deal-database.js";
import { runScrapeAndPersist } from "./scrape-orchestrator.js";

export const priorityOrder = ["mongo", "google-sheets", "scrape"] as const;
export type DealSource = (typeof priorityOrder)[number];

export type DealSourceStatus = {
  source: DealSource | "unknown";
  lastUpdated?: string;
  lastScrapeAttemptAt?: string;
  lastScrapeCompletedAt?: string;
  lastScrapeSucceeded: boolean;
  lastScrapeError?: string;
};

export const dealSourceStatus: DealSourceStatus = {
  source: "unknown",
  lastScrapeSucceeded: false,
};

type GoogleSheetRow = Record<string, string | number | undefined>;

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = Number.parseFloat(String(value).replace(/[%,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeGoogleSheetDeal(row: GoogleSheetRow): Deal {
  const scrapedAt = asString(row.scrapedAt) ?? new Date().toISOString();

  return {
    id: asString(row.id) ?? "",
    retailer: asString(row.retailer) ?? "Unknown",
    title: asString(row.title) ?? "",
    price: asString(row.price),
    originalPrice: asString(row.originalPrice),
    discount: asString(row.discount),
    discountPercent: asNumber(row.discountPercent),
    url: asString(row.url),
    image: asString(row.image),
    description: asString(row.description),
    scrapedAt,
  };
}

async function getGoogleSheetDeals(): Promise<Deal[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
    return [];
  }

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();

  const deals: Deal[] = [];
  for (const sheet of Object.values(doc.sheetsByTitle)) {
    if (sheet.title.endsWith(" History")) {
      continue;
    }

    const rows = await sheet.getRows();
    for (const row of rows) {
      const cleanRow = Object.fromEntries(
        Object.entries(row).filter(([key]) => !key.startsWith("_")),
      ) as GoogleSheetRow;

      const deal = normalizeGoogleSheetDeal(cleanRow);
      if (deal.id || deal.title || deal.url) {
        deals.push(deal);
      }
    }
  }

  return deals.sort(
    (first, second) => new Date(second.scrapedAt).getTime() - new Date(first.scrapedAt).getTime(),
  );
}

export function getDealSourceStatus(): DealSourceStatus {
  return { ...dealSourceStatus };
}

export async function getDealsWithFallback(retailer?: string): Promise<{
  deals: Deal[];
  source: DealSource;
  lastUpdated?: string;
}> {
  const sources: DealSource[] = [...priorityOrder];

  for (const source of sources) {
    try {
      if (source === "mongo") {
        const deals = retailer ? await dealDatabase.getDeals(retailer) : await dealDatabase.getDeals();
        if (deals.length > 0) {
          dealSourceStatus.source = source;
          dealSourceStatus.lastUpdated = deals[0]?.scrapedAt;
          return {
            deals,
            source,
            lastUpdated: deals[0]?.scrapedAt,
          };
        }
      }

      if (source === "google-sheets") {
        let deals = await getGoogleSheetDeals();
        if (retailer) {
          deals = deals.filter((deal) => deal.retailer.toLowerCase() === retailer.toLowerCase());
        }
        if (deals.length > 0) {
          dealSourceStatus.source = source;
          dealSourceStatus.lastUpdated = deals[0]?.scrapedAt;
          return {
            deals,
            source,
            lastUpdated: deals[0]?.scrapedAt,
          };
        }
      }

      if (source === "scrape") {
        dealSourceStatus.lastScrapeAttemptAt = new Date().toISOString();
        const summary = await runScrapeAndPersist();
        let deals = summary.deals;
        if (retailer) {
          deals = deals.filter((deal) => deal.retailer.toLowerCase() === retailer.toLowerCase());
        }
        if (deals.length > 0) {
          dealSourceStatus.source = source;
          dealSourceStatus.lastUpdated = summary.scrapedAt;
          dealSourceStatus.lastScrapeCompletedAt = new Date().toISOString();
          dealSourceStatus.lastScrapeSucceeded = true;
          dealSourceStatus.lastScrapeError = undefined;
          return {
            deals,
            source,
            lastUpdated: summary.scrapedAt,
          };
        }

        dealSourceStatus.lastScrapeCompletedAt = new Date().toISOString();
        dealSourceStatus.lastScrapeSucceeded = false;
        dealSourceStatus.lastScrapeError = "Scrape succeeded but returned no deals.";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (source === "scrape") {
        dealSourceStatus.lastScrapeAttemptAt = new Date().toISOString();
        dealSourceStatus.lastScrapeCompletedAt = new Date().toISOString();
        dealSourceStatus.lastScrapeSucceeded = false;
        dealSourceStatus.lastScrapeError = message;
      }
      console.warn(`Deals fallback source ${source} failed:`, message);
    }
  }

  return {
    deals: [],
    source: "scrape",
  };
}
