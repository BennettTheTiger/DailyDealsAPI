import { FastifyInstance } from "fastify";
import { runScrapeAndPersist } from "../services/scrape-orchestrator.js";

export async function registerScrapeRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/scrape",
    {
      schema: {
        tags: ["Scrape"],
        description: "Trigger a fresh scrape and optionally persist the results to MongoDB",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              totalRetailers: { type: "number" },
              dealCount: { type: "number" },
              persistedCount: { type: "number" },
              savedToMongo: { type: "boolean" },
              failedRetailers: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const summary = await runScrapeAndPersist();

        return {
          success: true,
          timestamp: new Date().toISOString(),
          totalRetailers: summary.totalRetailers,
          dealCount: summary.dealCount,
          persistedCount: summary.persistedCount ?? 0,
          savedToMongo: summary.savedToMongo,
          failedRetailers: summary.failedRetailers,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to execute scrape",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );
}
