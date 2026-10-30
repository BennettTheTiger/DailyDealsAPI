import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { Db, MongoClient } from "mongodb";
import { Deal } from "../types/index.js";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/database-tests";
const { DealDatabase } = await import("./deal-database.js");

const olderDeal: Deal = {
  id: "guitar",
  retailer: "Guitar Center",
  title: "Guitar",
  scrapedAt: "2026-10-29T00:00:00.000Z",
};
const newerDeal: Deal = {
  id: "amp",
  retailer: "Musician's Friend",
  title: "Amp",
  scrapedAt: "2026-10-30T00:00:00.000Z",
};

test("getDeals returns the latest deal per retailer using only read operations", async (t) => {
  t.mock.method(MongoClient.prototype, "connect", async function (this: MongoClient) {
    return this;
  });
  const queriedNames: string[] = [];
  let musiciansFriendEmpty = false;
  t.mock.method(Db.prototype, "collection", (name: string) => {
    queriedNames.push(name);
    // Deliberately expose only read operations: any index setup would fail.
    return {
      find(filter: object, options: object) {
        assert.deepEqual(filter, {});
        assert.deepEqual(options, { projection: { _id: 0, dealId: 0 } });
        return {
          sort(order: object) {
            assert.deepEqual(order, { scrapedAt: -1 });
            return {
              limit(count: number) {
                assert.equal(count, 1);
                return {
                  async toArray() {
                    if (name === "musicians_friend" && musiciansFriendEmpty) {
                      return [];
                    }
                    return [name === "guitar_center" ? olderDeal : newerDeal];
                  },
                };
              },
            };
          },
        };
      },
    };
  });
  const database = new DealDatabase();

  assert.deepEqual(await database.getDeals(), [newerDeal, olderDeal]);
  assert.deepEqual(queriedNames, ["guitar_center", "musicians_friend"]);
  queriedNames.length = 0;
  assert.deepEqual(await database.getDeals("Guitar Center"), [olderDeal]);
  assert.deepEqual(queriedNames, ["guitar_center"]);
  queriedNames.length = 0;
  assert.deepEqual(await database.getDeals("Musician's Friend"), [newerDeal]);
  assert.deepEqual(queriedNames, ["musicians_friend"]);

  const { registerDealsRoutes } = await import("../routes/deals.js");
  const app = Fastify();
  t.after(() => app.close());
  await registerDealsRoutes(app);

  const response = await app.inject({ method: "GET", url: "/api/deals" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.source, "mongo");
  assert.equal(body.dealCount, 2);
  assert.equal(body.lastUpdated, newerDeal.scrapedAt);
  assert.deepEqual(body.deals, [newerDeal, olderDeal]);

  const retailerResponse = await app.inject({
    method: "GET",
    url: `/api/deals/${encodeURIComponent("musician's friend")}`,
  });
  assert.equal(retailerResponse.statusCode, 200);
  assert.equal(retailerResponse.json().dealCount, 1);
  assert.deepEqual(retailerResponse.json().deals, [newerDeal]);

  musiciansFriendEmpty = true;
  assert.deepEqual(await database.getDeals(), [olderDeal]);
});

test("recordScrape persists deals without index management", async (t) => {
  t.mock.method(MongoClient.prototype, "connect", async function (this: MongoClient) {
    return this;
  });
  const writes: object[] = [];
  t.mock.method(Db.prototype, "collection", (name: string) => {
    assert.equal(name, "guitar_center");
    return {
      find: () => ({ toArray: async () => [] }),
      async bulkWrite(operations: object[], options: object) {
        writes.push(...operations);
        assert.deepEqual(options, { ordered: false });
      },
    };
  });

  assert.deepEqual(await new DealDatabase().recordScrape([olderDeal]), [olderDeal]);
  assert.deepEqual(writes, [{
    updateOne: {
      filter: { dealId: olderDeal.id },
      update: { $set: { dealId: olderDeal.id, ...olderDeal } },
      upsert: true,
    },
  }]);
});

test("setupIndexes creates both indexes for each retailer and can be rerun", async (t) => {
  t.mock.method(MongoClient.prototype, "connect", async function (this: MongoClient) {
    return this;
  });
  let exists = false;
  t.mock.method(Db.prototype, "listCollections", () => ({
    hasNext: async () => exists,
  }));
  const created: object[] = [];
  t.mock.method(Db.prototype, "collection", (name: string) => ({
    listIndexes: () => ({
      toArray: async () => [{ key: { dealId: 1 }, name: "dealId_unique", unique: true }],
    }),
    async createIndex(key: object, options: object) {
      created.push({ name, key, options });
    },
  }));
  const database = new DealDatabase();
  await database.setupIndexes();
  exists = true;
  await database.setupIndexes();

  const expected = ["guitar_center", "musicians_friend"].flatMap((name) => [
    { name, key: { dealId: 1 }, options: { name: "dealId_unique", unique: true } },
    { name, key: { scrapedAt: -1 }, options: { name: "scrapedAt_latest" } },
  ]);
  assert.deepEqual(created, [...expected, ...expected]);
});

test("setupIndexes retains legacy duplicate cleanup before creating unique indexes", async (t) => {
  t.mock.method(MongoClient.prototype, "connect", async function (this: MongoClient) {
    return this;
  });
  t.mock.method(Db.prototype, "listCollections", () => ({
    hasNext: async () => true,
  }));
  const actions: string[] = [];
  t.mock.method(Db.prototype, "collection", () => ({
    listIndexes: () => ({
      toArray: async () => [{ key: { dealId: 1 }, name: "legacy_dealId", unique: false }],
    }),
    aggregate: () => ({ toArray: async () => [{ deleteIds: ["older-duplicate"] }] }),
    async deleteMany(filter: object) {
      assert.deepEqual(filter, { _id: { $in: ["older-duplicate"] } });
      actions.push("delete");
    },
    async dropIndex(name: string) {
      assert.equal(name, "legacy_dealId");
      actions.push("drop");
    },
    async createIndex(_key: object, options: { name: string }) {
      actions.push(options.name);
    },
  }));

  await new DealDatabase().setupIndexes();
  assert.deepEqual(actions, [
    "delete", "drop", "dealId_unique", "scrapedAt_latest",
    "delete", "drop", "dealId_unique", "scrapedAt_latest",
  ]);
});

test("setupIndexes surfaces permission errors", async (t) => {
  t.mock.method(MongoClient.prototype, "connect", async function (this: MongoClient) {
    return this;
  });
  t.mock.method(Db.prototype, "listCollections", () => ({
    hasNext: async () => false,
  }));
  const error = new Error("not allowed to do action [createIndex]");
  t.mock.method(Db.prototype, "collection", () => ({
    async createIndex() {
      throw error;
    },
  }));

  await assert.rejects(new DealDatabase().setupIndexes(), error);
});
