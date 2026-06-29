import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

export const swaggerOptions = {
  swagger: {
    info: {
      title: "Daily Deals API",
      description: "Multi-retailer daily deals scraper with caching",
      version: "2.0.0",
      contact: {
        name: "Support",
      },
    },
    host: "localhost:3000",
    schemes: ["http", "https"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
      {
        name: "Info",
        description: "Server information and health checks",
      },
      {
        name: "Deals",
        description: "Daily deals endpoints",
      },
      {
        name: "Cache",
        description: "Cache management endpoints",
      },
    ],
  },
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "list" as const,
    deepLinking: false,
  },
};
