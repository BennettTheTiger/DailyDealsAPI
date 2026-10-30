import { dealDatabase } from "../services/deal-database.js";

dealDatabase.setupIndexes().then(() => {
  console.log("Database indexes are ready.");
  // Open MongoClient connections keep the event loop alive.
  process.exit(0);
}).catch((error) => {
  console.error("Database setup failed:", error);
  process.exit(1);
});
