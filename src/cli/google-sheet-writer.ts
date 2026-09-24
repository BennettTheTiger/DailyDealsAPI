import "dotenv/config";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { Deal } from "../types/index.js";

const SHEET_HEADERS = [
  "id",
  "retailer",
  "title",
  "price",
  "originalPrice",
  "discount",
  "discountPercent",
  "url",
  "image",
  "description",
  "scrapedAt",
];

const HISTORY_HEADERS = [
  "scrapedAt",
  "id",
  "retailer",
  "title",
  "price",
  "originalPrice",
  "discount",
  "discountPercent",
  "url",
  "image",
  "description",
];

export function normalizeRetailerName(retailer: string): string {
  const lower = retailer.toLowerCase();

  if (lower.includes("guitar")) {
    return "Guitar Center";
  }

  if (lower.includes("musician")) {
    return "Musician's Friend";
  }

  return retailer;
}

export function buildSheetRows(deals: Deal[]): (string | number | undefined)[][] {
  const rows: (string | number | undefined)[][] = [SHEET_HEADERS];

  for (const deal of deals) {
    rows.push([
      deal.id,
      normalizeRetailerName(deal.retailer),
      deal.title,
      deal.price,
      deal.originalPrice,
      deal.discount,
      deal.discountPercent,
      deal.url,
      deal.image,
      deal.description,
      deal.scrapedAt,
    ]);
  }

  return rows;
}

export function buildHistoryRows(deals: Deal[]): (string | number | undefined)[][] {
  const rows: (string | number | undefined)[][] = [HISTORY_HEADERS];

  for (const deal of deals) {
    rows.push([
      deal.scrapedAt,
      deal.id,
      normalizeRetailerName(deal.retailer),
      deal.title,
      deal.price,
      deal.originalPrice,
      deal.discount,
      deal.discountPercent,
      deal.url,
      deal.image,
      deal.description,
    ]);
  }

  return rows;
}

export async function updateGoogleSheet(deals: Deal[]): Promise<{ spreadsheetId: string; tabName: string; rowCount: number }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
    throw new Error("GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY must all be set.");
  }

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();

  const grouped = new Map<string, Deal[]>();

  // Each retailer gets its own current tab and matching daily tab.
  for (const deal of deals) {
    const tabName = normalizeRetailerName(deal.retailer);
    if (!grouped.has(tabName)) {
      grouped.set(tabName, []);
    }

    grouped.get(tabName)?.push(deal);
  }

  let totalRows = 0;

  for (const [tabName, retailerDeals] of grouped.entries()) {
    const currentTabName = tabName;

    let currentSheet = doc.sheetsByTitle[currentTabName];
    if (!currentSheet) {
      currentSheet = await doc.addSheet({ title: currentTabName, headerValues: SHEET_HEADERS });
    }

    const currentRows = buildSheetRows(retailerDeals);
    if (currentRows.length > 1) {
      const normalizedCurrentRows = currentRows.slice(1).map((row) => row.map((cell) => (cell ?? "")));

      await currentSheet.setHeaderRow(SHEET_HEADERS);
      await currentSheet.addRows(normalizedCurrentRows);
      totalRows += normalizedCurrentRows.length;
    }

  }

  return {
    spreadsheetId,
    tabName: grouped.size > 0 ? Array.from(grouped.keys())[0] : "",
    rowCount: totalRows,
  };
}
