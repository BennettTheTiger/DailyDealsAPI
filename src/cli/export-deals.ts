import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { scraperManager } from "../cache/scraper-manager.js";
import { Deal } from "../types/index.js";

const EXPORT_DIR = process.env.EXPORT_DIR ?? "exports";

function normalizeRetailerName(retailer: string): string {
  const lower = retailer.toLowerCase();

  if (lower.includes("guitar")) {
    return "Guitar Center";
  }

  if (lower.includes("musician")) {
    return "Musician's Friend";
  }

  return retailer;
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "deal";
}

function csvEscape(value: string | number | boolean | undefined | null): string {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function writeCsv(filePath: string, deals: Deal[]): Promise<void> {
  const headers = [
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

  const rows = deals.map((deal) =>
    headers
      .map((header) => csvEscape(deal[header as keyof Deal] as string | number | boolean | undefined | null))
      .join(",")
  );

  await fs.writeFile(filePath, [headers.join(","), ...rows].join("\n"), "utf8");
}

async function main(): Promise<void> {
  const results = await scraperManager.scrapeAll();
  const deals = results
    .filter((result) => result.success)
    .flatMap((result) => result.deals)
    .sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime());

  const exportDir = path.resolve(process.cwd(), EXPORT_DIR);
  await fs.mkdir(exportDir, { recursive: true });

  const grouped = new Map<string, Deal[]>();

  for (const deal of deals) {
    const retailer = normalizeRetailerName(deal.retailer);
    if (!grouped.has(retailer)) {
      grouped.set(retailer, []);
    }

    grouped.get(retailer)?.push(deal);
  }

  const createdFiles: string[] = [];

  for (const [retailer, retailerDeals] of grouped.entries()) {
    const fileName = `${safeFileName(retailer)}.csv`;
    const filePath = path.join(exportDir, fileName);
    await writeCsv(filePath, retailerDeals);
    createdFiles.push(fileName);
  }

  await writeCsv(path.join(exportDir, "all-deals.csv"), deals);

  console.log(
    JSON.stringify(
      {
        success: true,
        exportDir,
        files: createdFiles,
        totalDeals: deals.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
