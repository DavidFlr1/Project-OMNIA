import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import type { Bot } from "../bot";
import { createCoreRouter } from "./routes/core";
import { createChatRouter } from "./routes/chat";
import { options as swaggerOptions } from "./openapi";
import { logger } from "../utils";
import { createBotRouter } from "./routes/bot";

export async function startApiServer(bot: Bot, port: number): Promise<void> {
  const app = express();

  app.use(express.json());

  // Generate OpenAPI spec
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve Swagger UI
  app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);

  // Endpoint to get the OpenAPI spec as JSON (for Postman import)
  app.get("/api-spec", (_, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Register routers
  app.use("/", createCoreRouter(bot));
  app.use("/bot", createBotRouter(bot));
  app.use("/chat", createChatRouter(bot));

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  });

  // Start server
  app.listen(port, () => {
    logger.info(`Bot API server started on port ${port}`);
    logger.info(`API documentation available at http://localhost:${port}/api-docs`);
    logger.info(`API spec for Postman available at http://localhost:${port}/api-spec`);
  });
}
