import { FastifyInstance } from "fastify";
import { scraperManager } from "../cache/scraper-manager.js";
import { getDealsWithFallback } from "../services/deal-source.js";

function normalizeRetailerKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isKnownRetailer(retailer: string): boolean {
  return scraperManager
    .getAvailableScrapers()
    .some((availableRetailer) => normalizeRetailerKey(availableRetailer) === normalizeRetailerKey(retailer));
}

function getLatestDeal<T extends { scrapedAt?: string }>(deals: T[]): T | undefined {
  return deals.reduce<T | undefined>((latest, deal) => {
    if (!latest) return deal;
    return new Date(deal.scrapedAt ?? 0).getTime() > new Date(latest.scrapedAt ?? 0).getTime() ? deal : latest;
  }, undefined);
}

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
   * GET /api/v1/deals
   * Get all deals from all retailers
   */
  fastify.get(
    "/api/v1/deals",
    {
      schema: {
        tags: ["Deals"],
        description: "Get the newest deal from each retailer from MongoDB, with Google Sheets and scrape fallbacks",
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              timestamp: { type: "string", format: "date-time" },
              source: { type: "string" },
              lastUpdated: { type: "string", format: "date-time" },
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
        const result = await getDealsWithFallback();

        return {
          success: true,
          timestamp: new Date().toISOString(),
          source: result.source,
          lastUpdated: result.lastUpdated ?? new Date().toISOString(),
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
   * GET /api/v1/deals/:retailer/latest
   * Get the newest deal from a specific retailer
   */
  fastify.get<{ Params: { retailer: string } }>(
    "/api/v1/deals/:retailer/latest",
    {
      schema: {
        tags: ["Deals"],
        description: "Get the newest deal from a specific retailer",
        params: {
          type: "object",
          properties: {
            retailer: {
              type: "string",
              description:
                "Name of the retailer (e.g., 'guitar-center', 'musicians-friend')",
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
              source: { type: "string" },
              lastUpdated: { type: "string", format: "date-time" },
              dealCount: { type: "number" },
              deal: dealSchema,
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

        if (!isKnownRetailer(retailer)) {
          reply.status(404);
          return {
            success: false,
            error: `Retailer "${retailer}" not found`,
            timestamp: new Date().toISOString(),
          };
        }

        const { deals, source, lastUpdated } = await getDealsWithFallback(retailer);
        const latestDeal = getLatestDeal(deals);

        if (!latestDeal) {
          reply.status(404);
          return {
            success: false,
            error: `No deals found for retailer "${retailer}"`,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          timestamp: new Date().toISOString(),
          retailer,
          source,
          lastUpdated: latestDeal.scrapedAt ?? lastUpdated ?? new Date().toISOString(),
          dealCount: 1,
          deal: latestDeal,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500);
        return {
          success: false,
          error: "Failed to fetch latest deal",
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  /**
   * GET /api/v1/deals/:retailer
   * Get deals from a specific retailer
   */
  fastify.get<{ Params: { retailer: string } }>(
    "/api/v1/deals/:retailer",
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
                "Name of the retailer (e.g., 'guitar-center', 'musicians-friend')",
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
              source: { type: "string" },
              lastUpdated: { type: "string", format: "date-time" },
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

        if (!isKnownRetailer(retailer)) {
          reply.status(404);
          return {
            success: false,
            error: `Retailer "${retailer}" not found`,
            timestamp: new Date().toISOString(),
          };
        }

        const { deals, source, lastUpdated } = await getDealsWithFallback(retailer);

        return {
          success: true,
          timestamp: new Date().toISOString(),
          retailer,
          source,
          lastUpdated: lastUpdated ?? new Date().toISOString(),
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
   * GET /api/v1/retailers
   * Get list of available retailers
   */
  fastify.get(
    "/api/v1/retailers",
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
