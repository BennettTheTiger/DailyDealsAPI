import { FastifyInstance } from "fastify";
import { scraperManager } from "../cache/scraper-manager.js";

const dealSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    retailer: { type: "string" },
    title: { type: "string" },
    price: { type: "string" },
    originalPrice: { type: "string" },
    discount: { type: "string" },
    discountPercent: { type: "number" },
    url: { type: "string" },
    image: { type: "string" },
    description: { type: "string" },
    scrapedAt: { type: "string", format: "date-time" },
  },
};

export async function registerDealsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/deals
   * Get all deals from all retailers
   */
  fastify.get(
    "/api/deals",
    {
      schema: {
        tags: ["Deals"],
        description: "Get all deals from all retailers (with caching)",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              dealCount: { type: "number" },
              deals: {
                type: "array",
                items: dealSchema,
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
        const deals = await scraperManager.getAllDeals();

        return {
          success: true,
          timestamp: new Date().toISOString(),
          dealCount: deals.length,
          deals,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to fetch deals",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  /**
   * GET /api/deals/:retailer
   * Get deals from a specific retailer
   */
  fastify.get<{ Params: { retailer: string } }>(
    "/api/deals/:retailer",
    {
      schema: {
        tags: ["Deals"],
        description: "Get deals from a specific retailer",
        params: {
          type: "object",
          properties: {
            retailer: {
              type: "string",
              description:
                "Name of the retailer (e.g., 'guitar center', 'musician\\'s friend')",
            },
          },
          required: ["retailer"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              retailer: { type: "string" },
              dealCount: { type: "number" },
              deals: {
                type: "array",
                items: dealSchema,
              },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
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
        const result = await scraperManager.scrapeRetailer(retailer);

        if (!result.success) {
          reply.status(404);
          return {
            success: false,
            error: result.error,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          timestamp: new Date().toISOString(),
          retailer: result.retailer,
          dealCount: result.deals.length,
          deals: result.deals,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to fetch deals",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  /**
   * GET /api/retailers
   * Get list of available retailers
   */
  fastify.get(
    "/api/retailers",
    {
      schema: {
        tags: ["Deals"],
        description: "Get list of available retailers",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              count: { type: "number" },
              retailers: {
                type: "array",
                items: { type: "string" },
              },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const retailers = scraperManager.getAvailableScrapers();
      return {
        success: true,
        count: retailers.length,
        retailers,
        timestamp: new Date().toISOString(),
      };
    }
  );
}
