import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGoogleSheetDeal, priorityOrder } from "./deal-source.js";

test("priorityOrder prefers Mongo first, then Google Sheets, then a scrape fallback", () => {
  assert.deepEqual(priorityOrder, ["mongo", "google-sheets", "scrape"]);
});

test("normalizeGoogleSheetDeal converts a sheet row into a Deal shape", () => {
  const deal = normalizeGoogleSheetDeal({
    id: "deal-42",
    retailer: "Guitar Center",
    title: "Test Guitar",
    price: "$299.99",
    originalPrice: "$399.99",
    discount: "$100.00",
    discountPercent: "25",
    url: "https://example.com/guitar",
    image: "https://example.com/guitar.jpg",
    description: "A great deal",
    scrapedAt: "2026-10-29T00:00:00.000Z",
  });

  assert.equal(deal.id, "deal-42");
  assert.equal(deal.retailer, "Guitar Center");
  assert.equal(deal.discountPercent, 25);
  assert.equal(deal.price, "$299.99");
  assert.equal(deal.scrapedAt, "2026-10-29T00:00:00.000Z");
});
