import { FastifyInstance } from "fastify";
import { scraperManager } from "../cache/scraper-manager.js";
import { dealDatabase } from "../services/deal-database.js";

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
        description: "Get the newest deal across all retailers from MongoDB",
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
        const deals = await dealDatabase.getDeals();

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
        description: "Get the newest deal from a specific retailer in MongoDB",
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
        const knownRetailer = scraperManager
          .getAvailableScrapers()
          .some((availableRetailer) => availableRetailer.toLowerCase() === retailer.toLowerCase());

        if (!knownRetailer) {
          reply.status(404);
          return {
            success: false,
            error: `Retailer "${retailer}" not found`,
            timestamp: new Date().toISOString(),
          };
        }

        const deals = await dealDatabase.getDeals(retailer);

        return {
          success: true,
          timestamp: new Date().toISOString(),
          retailer,
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
    async () => {
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
