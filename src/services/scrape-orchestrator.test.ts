import test from "node:test";
import assert from "node:assert/strict";
import { summarizeScrapeResults } from "./scrape-orchestrator";

test("summarizeScrapeResults keeps successful deals sorted newest first", () => {
  const results = [
    {
      retailer: "guitar center",
      deals: [
        {
          id: "a",
          retailer: "Guitar Center",
          title: "Older deal",
          scrapedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      scrapedAt: "2024-01-01T00:00:00.000Z",
      success: true,
    },
    {
      retailer: "musician's friend",
      deals: [
        {
          id: "b",
          retailer: "Musician's Friend",
          title: "Newest deal",
          scrapedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      scrapedAt: "2024-01-02T00:00:00.000Z",
      success: true,
    },
    {
      retailer: "missing retailer",
      deals: [],
      scrapedAt: "2024-01-03T00:00:00.000Z",
      success: false,
      error: "Nope",
    },
  ];

  const summary = summarizeScrapeResults(results as any);

  assert.equal(summary.totalRetailers, 2);
  assert.equal(summary.dealCount, 2);
  assert.equal(summary.deals[0].id, "b");
  assert.equal(summary.deals[1].id, "a");
});
