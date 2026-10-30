import { FastifyInstance } from "fastify";
import { getDealSourceStatus } from "../services/deal-source.js";

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

  const statusHandler = async () => {
    const status = getDealSourceStatus();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...status,
    };
  };

  fastify.get(
    "/health/status",
    {
      schema: {
        tags: ["Info"],
        description: "View the latest data source and last scrape status",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              source: { type: "string" },
              lastUpdated: { type: "string", format: "date-time" },
              lastScrapeAttemptAt: { type: "string", format: "date-time" },
              lastScrapeCompletedAt: { type: "string", format: "date-time" },
              lastScrapeSucceeded: { type: "boolean" },
              lastScrapeError: { type: "string" },
            },
          },
        },
      },
    },
    statusHandler,
  );

  fastify.get(
    "/api/status",
    {
      schema: {
        tags: ["Info"],
        description: "Get the active data source and last scrape status",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              source: { type: "string" },
              lastUpdated: { type: "string", format: "date-time" },
              lastScrapeAttemptAt: { type: "string", format: "date-time" },
              lastScrapeCompletedAt: { type: "string", format: "date-time" },
              lastScrapeSucceeded: { type: "boolean" },
              lastScrapeError: { type: "string" },
            },
          },
        },
      },
    },
    statusHandler,
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
                  healthStatus: { type: "string" },
                  apiStatus: { type: "string" },
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
          healthStatus: "/health/status",
          apiStatus: "/api/status",
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
