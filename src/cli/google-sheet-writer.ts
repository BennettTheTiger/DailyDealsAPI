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

export function selectLatestDeals(deals: Deal[]): Map<string, Deal> {
  const latestByRetailer = new Map<string, Deal>();

  for (const deal of deals) {
    const retailer = normalizeRetailerName(deal.retailer);
    const currentLatest = latestByRetailer.get(retailer);

    if (!currentLatest || new Date(deal.scrapedAt).getTime() > new Date(currentLatest.scrapedAt).getTime()) {
      latestByRetailer.set(retailer, deal);
    }
  }

  return latestByRetailer;
}

export async function updateGoogleSheet(
  latestDeals: Deal[],
  newDeals: Deal[]
): Promise<{ spreadsheetId: string; tabName: string; rowCount: number }> {
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

  const historyByRetailer = new Map<string, Deal[]>();
  for (const deal of newDeals) {
    const tabName = normalizeRetailerName(deal.retailer);
    if (!historyByRetailer.has(tabName)) {
      historyByRetailer.set(tabName, []);
    }

    historyByRetailer.get(tabName)?.push(deal);
  }

  let totalRows = 0;
  const retailerNames = new Set([
    "Guitar Center",
    "Musician's Friend",
    ...selectLatestDeals(latestDeals).keys(),
    ...historyByRetailer.keys(),
  ]);

  for (const retailer of retailerNames) {
    const latestDeal = selectLatestDeals(latestDeals).get(retailer);
    let currentSheet = doc.sheetsByTitle[retailer];
    if (!currentSheet) {
      currentSheet = await doc.addSheet({ title: retailer, headerValues: SHEET_HEADERS });
    }

    if (latestDeal) {
      await currentSheet.clear();
      await currentSheet.setHeaderRow(SHEET_HEADERS);
      const latestRow = buildSheetRows([latestDeal])[1].map((cell) => cell ?? "");
      await currentSheet.addRow(latestRow);
    }

    const historyTabName = `${retailer} History`;
    let historySheet = doc.sheetsByTitle[historyTabName];
    if (!historySheet) {
      historySheet = await doc.addSheet({ title: historyTabName, headerValues: HISTORY_HEADERS });
    }

    const retailerNewDeals = historyByRetailer.get(retailer) ?? [];
    if (retailerNewDeals.length > 0) {
      const historyRows = buildHistoryRows(retailerNewDeals).slice(1)
        .map((row) => row.map((cell) => cell ?? ""));
      await historySheet.setHeaderRow(HISTORY_HEADERS);
      await historySheet.addRows(historyRows);
      totalRows += historyRows.length;
    }
  }

  return {
    spreadsheetId,
    tabName: retailerNames.values().next().value ?? "",
    rowCount: totalRows,
  };
}
