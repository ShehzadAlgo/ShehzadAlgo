import type { Express } from "express";
import { registerTradingRoutes } from "./trading/routes.js";

export function registerApiRoutes(app: Express) {
  registerTradingRoutes(app);
}
