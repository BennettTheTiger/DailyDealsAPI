import { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";

export async function registerHealthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health
   * Health check endpoint
   */
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Info"],
        description: "Check server health status",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              uptime: { type: "number" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }
  );

  /**
   * GET /health/db
   * MongoDB connectivity check
   */
  fastify.get(
    "/health/db",
    {
      schema: {
        tags: ["Info"],
        description: "Check MongoDB connectivity and readiness",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              database: { type: "string" },
              connected: { type: "boolean" },
            },
          },
          500: {
            type: "object",
            properties: {
              status: { type: "string" },
              error: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const uri = process.env.MONGODB_URI;
      const databaseName = process.env.MONGODB_DB_NAME || "daily_deals";

      if (!uri) {
        reply.status(500);
        return {
          status: "error",
          error: "MONGODB_URI is not configured",
          timestamp: new Date().toISOString(),
        };
      }

      try {
        const client = new MongoClient(uri);
        await client.connect();
        const admin = client.db(databaseName);
        await admin.command({ ping: 1 });
        await client.close();

        return {
          status: "ok",
          timestamp: new Date().toISOString(),
          database: databaseName,
          connected: true,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "MongoDB health check failed",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  /**
   * GET /
   * Root/info endpoint
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Info"],
        description: "Get API information and available endpoints",
        response: {
          200: {
            type: "object",
            properties: {
              name: { type: "string" },
              version: { type: "string" },
              description: { type: "string" },
              endpoints: {
                type: "object",
                properties: {
                  health: { type: "string" },
                  dbHealth: { type: "string" },
                  retailers: { type: "string" },
                  allDeals: { type: "string" },
                  retailerDeals: { type: "string" },
                  cache: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        name: "Daily Deals API",
        version: "2.0.0",
        description: "Multi-retailer daily deals scraper with caching",
        endpoints: {
          health: "/health",
          dbHealth: "/health/db",
          retailers: "/api/retailers",
          allDeals: "/api/deals",
          retailerDeals: "/api/deals/:retailer",
          cache: "/api/cache",
        },
      };
    }
  );
}
