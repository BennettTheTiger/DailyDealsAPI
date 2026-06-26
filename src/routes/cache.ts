import { FastifyInstance } from "fastify";
import { scraperManager } from "../cache/scraper-manager.js";

export async function registerCacheRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/cache
   * Get cache statistics
   */
  fastify.get(
    "/api/cache",
    {
      schema: {
        tags: ["Cache"],
        description: "Get cache statistics",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              stats: {
                type: "object",
                properties: {
                  keys: { type: "number" },
                  ksize: { type: "number" },
                  vsize: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const stats = scraperManager.getCacheStats();
      return {
        success: true,
        timestamp: new Date().toISOString(),
        stats,
      };
    }
  );

  /**
   * POST /api/cache/clear
   * Clear all cache
   */
  fastify.post(
    "/api/cache/clear",
    {
      schema: {
        tags: ["Cache"],
        description: "Clear all cached deals",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
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
        scraperManager.clearAllCache();
        return {
          success: true,
          message: "All cache cleared",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to clear cache",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  /**
   * POST /api/cache/clear/:retailer
   * Clear cache for a specific retailer
   */
  fastify.post<{ Params: { retailer: string } }>(
    "/api/cache/clear/:retailer",
    {
      schema: {
        tags: ["Cache"],
        description: "Clear cache for a specific retailer",
        params: {
          type: "object",
          properties: {
            retailer: {
              type: "string",
              description: "Name of the retailer",
            },
          },
          required: ["retailer"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
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
        const { retailer } = request.params;
        scraperManager.clearRetailerCache(retailer);
        return {
          success: true,
          message: `Cache cleared for ${retailer}`,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to clear cache",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );
}
