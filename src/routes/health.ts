import { FastifyInstance } from "fastify";

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
          retailers: "/api/retailers",
          allDeals: "/api/deals",
          retailerDeals: "/api/deals/:retailer",
          cache: "/api/cache",
        },
      };
    }
  );
}
