import assert from "node:assert/strict";
import test from "node:test";

import { buildHistoryRows, buildSheetRows, normalizeRetailerName, selectLatestDeals } from "./google-sheet-writer.js";

const makeDeal = (id: string, retailer: string, scrapedAt: string) => ({
  id,
  retailer,
  title: id,
  price: "$299.99",
  originalPrice: "$399.99",
  discount: "$100.00",
  discountPercent: 25,
  url: "https://example.com",
  image: "https://example.com/image.jpg",
  description: "A great deal",
  scrapedAt,
});

test("normalizeRetailerName maps the retailer names to the sheet tab names", () => {
  assert.equal(normalizeRetailerName("Guitar-Center"), "Guitar Center");
  assert.equal(normalizeRetailerName("Musician's Friend"), "Musician's Friend");
  assert.equal(normalizeRetailerName("Some Other Shop"), "Some Other Shop");
});

test("buildSheetRows includes the expected headers and values", () => {
  const rows = buildSheetRows([
    {
      id: "abc123",
      retailer: "Guitar Center",
      title: "Test guitar",
      price: "$299.99",
      originalPrice: "$399.99",
      discount: "$100.00",
      discountPercent: 25,
      url: "https://example.com",
      image: "https://example.com/image.jpg",
      description: "A great deal",
      scrapedAt: "2026-08-23T01:00:00.000Z",
    },
  ]);

  assert.deepEqual(rows[0], [
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
  ]);

  assert.equal(rows[1][0], "abc123");
  assert.equal(rows[1][1], "Guitar Center");
  assert.equal(rows[1][2], "Test guitar");
  assert.equal(rows[1][10], "2026-08-23T01:00:00.000Z");
});

test("buildHistoryRows puts scrapedAt first so the tab is queryable by date", () => {
  const rows = buildHistoryRows([
    {
      id: "abc123",
      retailer: "Guitar Center",
      title: "Test guitar",
      price: "$299.99",
      originalPrice: "$399.99",
      discount: "$100.00",
      discountPercent: 25,
      url: "https://example.com",
      image: "https://example.com/image.jpg",
      description: "A great deal",
      scrapedAt: "2026-08-23T01:00:00.000Z",
    },
  ]);

  assert.deepEqual(rows[0], [
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
  ]);

  assert.equal(rows[1][0], "2026-08-23T01:00:00.000Z");
  assert.equal(rows[1][1], "abc123");
});

test("selectLatestDeals returns one newest deal per retailer", () => {
  const latest = selectLatestDeals([
    makeDeal("older-guitar", "Guitar Center", "2026-08-23T01:00:00.000Z"),
    makeDeal("latest-musician", "Musician's Friend", "2026-08-23T03:00:00.000Z"),
    makeDeal("latest-guitar", "Guitar Center", "2026-08-23T02:00:00.000Z"),
  ]);

  assert.equal(latest.size, 2);
  assert.equal(latest.get("Guitar Center")?.id, "latest-guitar");
  assert.equal(latest.get("Musician's Friend")?.id, "latest-musician");
});
