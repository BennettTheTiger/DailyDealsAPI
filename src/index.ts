import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { registerHealthRoutes } from "./routes/health.js";
import { registerDealsRoutes } from "./routes/deals.js";
import { registerCacheRoutes } from "./routes/cache.js";
import { swaggerOptions, swaggerUiOptions } from "./swagger/swagger-config.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: true,
});

// Register Swagger documentation
await fastify.register(fastifySwagger, swaggerOptions);
await fastify.register(fastifySwaggerUi, swaggerUiOptions);

// Register all routes
await registerHealthRoutes(fastify);
await registerDealsRoutes(fastify);
await registerCacheRoutes(fastify);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`API Documentation at http://${HOST}:${PORT}/documentation`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
