import { Collection, MongoClient } from "mongodb";
import { Deal } from "../types/index.js";

export interface MongoDealStoreConfig {
  uri?: string;
  databaseName?: string;
  collectionName?: string;
}

type DealDocument = Deal & { _id: string };

export class MongoDealStore {
  private client: MongoClient | null = null;
  private collection: Collection<DealDocument> | null = null;

  async connect(config: MongoDealStoreConfig = {}): Promise<void> {
    const uri = config.uri ?? process.env.MONGODB_URI;
    const databaseName = config.databaseName ?? process.env.MONGODB_DB_NAME ?? "daily_deals";
    const collectionName = config.collectionName ?? process.env.MONGODB_COLLECTION ?? "deals";

    if (!uri) {
      throw new Error("MONGODB_URI is required to persist deals.");
    }

    this.client = new MongoClient(uri);
    await this.client.connect();

    const db = this.client.db(databaseName);
    this.collection = db.collection<DealDocument>(collectionName);

    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex({ retailer: 1, scrapedAt: -1 });
  }

  async saveDeals(deals: Deal[]): Promise<number> {
    if (!this.collection || deals.length === 0) {
      return 0;
    }

    const operations = deals.map((deal) => ({
      replaceOne: {
        filter: { id: deal.id },
        replacement: { ...deal, _id: deal.id },
        upsert: true,
      },
    }));

    const result = await this.collection.bulkWrite(operations, { ordered: false });
    return (result.upsertedCount ?? 0) + (result.matchedCount ?? 0) + (result.modifiedCount ?? 0);
  }

  async getLatestDeals(limit = 100): Promise<Deal[]> {
    if (!this.collection) {
      return [];
    }

    const docs = await this.collection
      .find<DealDocument>({}, { sort: { scrapedAt: -1 } })
      .limit(limit)
      .toArray();

    return docs.map(({ _id, ...deal }) => deal);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.collection = null;
    }
  }
}
