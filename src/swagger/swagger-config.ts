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

export const swaggerUiOptions = {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticAssetUrl: (url: string) => url,
  transformSpecification: (spec: Record<string, any>) => spec,
  transformSpecificationClone: true,
};
