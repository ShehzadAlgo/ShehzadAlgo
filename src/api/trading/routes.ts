import type { Express } from "express";
import {
  addAccountController,
  deleteAccountController,
  listAccountsController,
  setAccountModeController,
} from "./controller.js";
import { positionsController } from "./summary-controller.js";

export function registerTradingRoutes(app: Express) {
  app.get("/api/trading/accounts", async (_req, res) => {
    try {
      const accounts = await listAccountsController();
      res.json({ ok: true, accounts });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.post("/api/trading/accounts", async (req, res) => {
    try {
      const result = await addAccountController(req.body ?? {});
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.delete("/api/trading/accounts/:name", async (req, res) => {
    try {
      const result = await deleteAccountController(req.params.name ?? "");
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.patch("/api/trading/accounts/:name/mode", async (req, res) => {
    try {
      const result = await setAccountModeController(req.params.name ?? "", req.body?.mode);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/trading/positions", async (_req, res) => {
    try {
      const data = await positionsController();
      res.json({ ok: true, data });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
}
