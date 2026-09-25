import "dotenv/config";
import { Db, MongoClient } from "mongodb";
import { Deal } from "../types/index.js";

const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME ?? "daily_deals";
type StoredDeal = Deal & { _id: string; dealId: string };

function collectionName(retailer: string): string {
  const normalizedRetailer = retailer.toLowerCase();

  if (normalizedRetailer.includes("guitar")) {
    return "guitar_center";
  }

  if (normalizedRetailer.includes("musician")) {
    return "musicians_friend";
  }

  return normalizedRetailer.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "deals";
}

class DealDatabase {
  private databasePromise: Promise<Db> | undefined;

  private async getDatabase(): Promise<Db> {
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set.");
    }

    if (!this.databasePromise) {
      // Bound both initial connect and in-flight ops; the driver's socketTimeoutMS
      // otherwise defaults to 0 (no timeout), which can hang indefinitely on a stalled connection.
      const client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
        socketTimeoutMS: 20_000,
      });
      this.databasePromise = client.connect().then(() => client.db(databaseName));
    }

    return this.databasePromise;
  }

  async recordScrape(deals: Deal[]): Promise<Deal[]> {
    if (deals.length === 0) {
      return [];
    }

    if (!mongoUri) {
      console.warn("MONGODB_URI is not set. Skipping database persistence.");
      return [];
    }

    const database = await this.getDatabase();
    const dealsByCollection = new Map<string, Deal[]>();

    for (const deal of deals) {
      const name = collectionName(deal.retailer);
      if (!dealsByCollection.has(name)) {
        dealsByCollection.set(name, []);
      }

      dealsByCollection.get(name)?.push(deal);
    }

    const newDeals: Deal[] = [];

    for (const [name, retailerDeals] of dealsByCollection) {
      const collection = database.collection<StoredDeal>(name);
      const collectionExists = await database.listCollections({ name }, { nameOnly: true }).hasNext();

      if (collectionExists) {
        const indexes = await collection.listIndexes().toArray();
        const existingDealIdIndex = indexes.find(
          (index) => index.key && index.key.dealId === 1 && Object.keys(index.key).length === 1,
        );

        if (existingDealIdIndex && !existingDealIdIndex.unique) {
          const duplicateGroups = await collection.aggregate<{ deleteIds: string[] }>([
            { $sort: { scrapedAt: -1 } },
            { $group: { _id: "$dealId", ids: { $push: "$_id" } } },
            { $project: { deleteIds: { $slice: ["$ids", 1, { $size: "$ids" }] } } },
          ]).toArray();

          const duplicateIds = duplicateGroups.flatMap((group) => group.deleteIds);
          if (duplicateIds.length > 0) {
            await collection.deleteMany({ _id: { $in: duplicateIds } });
          }

          if (existingDealIdIndex.name) {
            await collection.dropIndex(existingDealIdIndex.name);
          }
        }
      }

      await collection.createIndex({ dealId: 1 }, { name: "dealId_unique", unique: true });

      const dealIds = retailerDeals.map((deal) => deal.id);
      const existing = await collection.find(
        { $or: [{ dealId: { $in: dealIds } }, { _id: { $in: dealIds } }] },
        { projection: { _id: 1, dealId: 1 } },
      ).toArray();
      const existingIds = new Set(existing.map((document) => document.dealId ?? document._id));
      newDeals.push(...retailerDeals.filter((deal) => !existingIds.has(deal.id)));

      await collection.bulkWrite(
        retailerDeals.map((deal) => ({
          updateOne: {
            filter: { dealId: deal.id },
            update: {
              $set: {
                dealId: deal.id,
                ...deal,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );

    }

    return newDeals;
  }

  async getDeals(retailer?: string): Promise<Deal[]> {
    if (!mongoUri) {
      return [];
    }

    const database = await this.getDatabase();
    const names = retailer ? [collectionName(retailer)] : ["guitar_center", "musicians_friend"];
    const deals = await Promise.all(names.map(async (name) => {
      const collection = database.collection<StoredDeal>(name);
      await collection.createIndex({ scrapedAt: -1 }, { name: "scrapedAt_latest" });

      return collection
        .find({}, { projection: { _id: 0, dealId: 0 } })
        .sort({ scrapedAt: -1 })
        .limit(1)
        .toArray();
    }));

    return deals.flat().sort(
      (first, second) => new Date(second.scrapedAt).getTime() - new Date(first.scrapedAt).getTime(),
    ).slice(0, 1);
  }
}

export const dealDatabase = new DealDatabase();